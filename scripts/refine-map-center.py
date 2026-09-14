"""Re-trace the central roads in the original coordinate system.

Only authoring geometry is produced; rasterize-map.cjs keeps it out of the app.
The existing outer geometry remains unchanged.
"""
from pathlib import Path
import json
import cv2
import numpy as np

root = Path(__file__).resolve().parents[1]
source = cv2.imread(str(root / 'src/assets/map.png'))
b, g, r = [c.astype(np.float32) for c in cv2.split(source)]
letters = (r > 64) & (np.abs(r-g) < 7) & (np.abs(b-g) < 9)
marker = (r > 120) & (r > g * 1.6) & (r > b * 1.6)
marker[:1440] = False
marker[1550:] = False
marker[:, :1450] = False
marker[:, 1540:] = False
occlusion = cv2.dilate((letters | marker).astype(np.uint8) * 255, np.ones((3, 3), np.uint8))
marker_hull = np.zeros(marker.shape, dtype=np.uint8)
marker_points = cv2.findNonZero(marker.astype(np.uint8))
cv2.fillConvexPoly(marker_hull, cv2.convexHull(marker_points), 255)
marker_hull = cv2.dilate(marker_hull, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
source = cv2.inpaint(source, occlusion, 5, cv2.INPAINT_TELEA)
source = cv2.bilateralFilter(source, 7, 9, 2)
b, g, r = [c.astype(np.float32) for c in cv2.split(source)]

# Road pixels fall near the antialiasing color ramp from background to road.
# Distance from that ramp rejects the similarly blue building/background texture.
pixels = cv2.cvtColor(source, cv2.COLOR_BGR2RGB).astype(np.float32)
background = np.array([17, 20, 29], dtype=np.float32)
road = np.array([44, 55, 75], dtype=np.float32)
vector = road-background
amount = np.sum((pixels-background)*vector, axis=2)/np.dot(vector, vector)
residual = np.linalg.norm(pixels-background-amount[..., None]*vector, axis=2)
road_ink = (amount > .20) & (amount < 1.12) & (residual < 5) & (g-r > 3) & (b-g > 8)
selections = {
    'local': road_ink,
    'secondary': road_ink & (amount > .65),
    'highways': (r > 63) & (g-r > 8) & (g-r < 25) & (b-g > 10) & (b-g < 27),
}
# Reconstruct only the pixels hidden by the old marker. The two visible
# carriageways remain separate and meet their original edges above and below.
marker_roads = np.zeros(marker.shape, dtype=np.uint8)
for control, width in [([(1480,1478),(1492,1503),(1503,1525),(1504,1550)],18), ([(1508,1468),(1516,1491),(1514,1527),(1512,1560)],7)]:
    t = np.linspace(0, 1, 80)[:,None]
    a,bp,c,d = np.array(control, dtype=float)
    points = ((1-t)**3*a+3*(1-t)**2*t*bp+3*(1-t)*t*t*c+t**3*d).round().astype(np.int32)
    cv2.polylines(marker_roads, [points], False, 255, width)

def closed_curve(points):
    # Round only a short distance around each corner; rounding half an entire
    # block edge would widen intersections and turn city blocks into blobs.
    corners = []
    for i, point in enumerate(points):
        incoming, outgoing = points[i-1]-point, points[(i+1)%len(points)]-point
        before = point+incoming*min(.25, 2/np.linalg.norm(incoming))
        after = point+outgoing*min(.25, 2/np.linalg.norm(outgoing))
        corners.append((point, before, after))
    d = [f'M{corners[-1][2][0]:.2f},{corners[-1][2][1]:.2f}']
    for point, before, after in corners:
        d.append(f'L{before[0]:.2f},{before[1]:.2f}Q{point[0]},{point[1]} {after[0]:.2f},{after[1]:.2f}')
    return ''.join(d)+'Z'

output = {}
for name, selection in selections.items():
    mask = selection.astype(np.uint8) * 255
    mask[marker_hull > 0] = marker_roads[marker_hull > 0] if name == 'highways' else 0
    if name == 'secondary':
        # The reference omits road ink under long labels. Join the original
        # visible ends in place rather than moving nearby streets or junctions.
        for points in [
            [(1535,1650),(1536,1670),(1539,1700),(1541,1725),(1541,1800),(1541,1840)],
            [(1856,1450),(1865,1470),(1870,1500),(1870,1530),(1866,1570),(1860,1600)],
        ]:
            cv2.polylines(mask, [np.array(points, dtype=np.int32)], False, 255, 8)
    if name != 'local':
        mask = (cv2.GaussianBlur(mask.astype(np.float32)/255, (5, 5), .9) > .5).astype(np.uint8)*255
    # Keep islands and their holes together, so small city blocks remain empty.
    contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    paths = []
    if hierarchy is not None:
        for i, contour in enumerate(contours):
            if hierarchy[0][i][3] != -1 or cv2.contourArea(contour) < (2 if name == 'local' else 8):
                continue
            x, y, w, h = cv2.boundingRect(contour)
            if x > 2180 or y > 2290 or x+w < 950 or y+h < 1000:
                continue
            related = [i]
            child = hierarchy[0][i][2]
            while child != -1:
                related.append(child)
                child = hierarchy[0][child][0]
            for index in related:
                points = cv2.approxPolyDP(contours[index], .4 if name == 'local' else 1.25, True).reshape(-1, 2)
                if len(points) >= 3:
                    paths.append(closed_curve(points) if name != 'local' else 'M' + 'L'.join(f'{x},{y}' for x, y in points) + 'Z')
    output[name] = ''.join(paths)
    print(name, len(paths), 'contours')
(root / 'src/navigation/mapCenterGeometry.json').write_text(json.dumps(output, separators=(',', ':')) + '\n')
