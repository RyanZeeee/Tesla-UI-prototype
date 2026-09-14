"""Recover editable vector layers from the project's existing map reference.

The generated geometry contains no raster pixels, text glyphs or vehicle marker.
This is an offline authoring step; rasterize-map.cjs exports the runtime bitmaps.
"""
from pathlib import Path
import json
import cv2
import numpy as np

root = Path(__file__).resolve().parents[1]
source = cv2.imread(str(root / 'src/assets/map.png'))
blue, green, red = [channel.astype(np.float32) for channel in cv2.split(source)]
# Remove reference labels before tracing, so their antialiased edges do not
# become tiny road islands or gaps under the new, independently drawn labels.
letter_mask = ((red > 64) & (np.abs(red - green) < 7) & (np.abs(blue - green) < 9)).astype(np.uint8) * 255
letter_mask = cv2.dilate(letter_mask, np.ones((3, 3), np.uint8))
source = cv2.inpaint(source, letter_mask, 5, cv2.INPAINT_TELEA)
source = cv2.GaussianBlur(source, (3, 3), .4)
b, g, r = [channel.astype(np.float32) for channel in cv2.split(source)]

masks = {
    'urban': ((r > 25) & (r < 42) & (np.abs(r - g) < 2.6) & (b - r > 5) & (b - r < 12), 160, 1.8),
    'parks': ((r < 38) & (g - r > 7) & (g - r < 22) & (np.abs(b - g) < 6), 45, 1.3),
    'water': ((g > 41) & (g > r * 1.6) & (b - g > 8) & (b - g < 32), 7, .85),
    'local': ((r > 22) & (g - r > 1.5) & (g - r < 18) & (b - g > 5) & (b - g < 26), 9, .75),
    'secondary': ((r > 32) & (g - r > 5) & (g - r < 24) & (b - g > 10) & (b - g < 28), 5, .7),
    'highways': ((r > 60) & (g - r > 5) & (g - r < 27) & (b - g > 7) & (b - g < 29), 5, .65),
}
result = {}
for name, (selection, minimum, tolerance) in masks.items():
    mask = selection.astype(np.uint8) * 255
    if name in ('urban', 'parks'):
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    elif name in ('local', 'secondary', 'highways'):
        # Reconnect one-pixel seams without merging parallel carriageways.
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    paths = []
    for contour in contours:
        if cv2.contourArea(contour) < minimum:
            continue
        points = cv2.approxPolyDP(contour, tolerance, True).reshape(-1, 2)
        if len(points) < 3:
            continue
        paths.append('M' + 'L'.join(f'{x},{y}' for x, y in points) + 'Z')
    result[name] = ''.join(paths)
    print(name, len(paths), 'shapes', len(result[name]), 'characters')

output = root / 'src/navigation/mapGeometry.ts'
output.write_text('// Vector geometry derived from the existing project map reference.\n'
                  '// Regenerate with scripts/vectorize-map.py; no raster is used at runtime.\n'
                  'export const mapGeometry = ' + json.dumps(result, separators=(',', ':')) + '\n')
print('Vector file:', output.stat().st_size, 'bytes')
