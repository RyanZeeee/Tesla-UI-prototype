// Demo routes follow the roads in the project's original, locally vectorized map.
// These are illustrative paths, not directions for real driving.
export interface MapPoint { x: number; y: number }
export interface MapNode extends MapPoint { id: string }
export interface MapPlace {
  id: string
  name: string
  category: 'home' | 'work' | 'park' | 'shopping' | 'culture' | 'coffee' | 'charging'
  detail: string
  node: MapNode
}
interface RoadLeg { end: number; street: string; heading: number; exitHeading: number }
export interface MapRoute {
  id: string
  label: string
  nodes: MapNode[]
  path: string
  length: number
  distance: number
  minutes: number
  legs: RoadLeg[]
}
export const MAP_WIDTH = 1340
export const MAP_HEIGHT = 1080
export const MIN_ZOOM = .6
export const MAX_ZOOM = 2.25
const coordinates: Record<string, [number, number]> = {
  origin: [1500, 1500], interchange: [1470, 1410], west: [1260, 1315], northwest: [1110, 1180], park: [1260, 1180],
  northeast: [1640, 1280], upperEast: [1900, 1120], monroe: [1880, 1425], midtown: [1510, 1605],
  west14: [1265, 1610], plaza: [1260, 1530], parkWest: [1700, 1605], spring10: [1510, 1695],
  parkSouth: [1830, 1690], techWest: [1270, 1695], downtown: [1530, 1875], ponce: [1840, 1840],
  campus: [1350, 1830], south: [1550, 2000], east: [2070, 1990],
  seventeenth: [1507, 1540], piedmont10: [1660, 1694],
}
export const mapNodes: MapNode[] = Object.entries(coordinates).map(([id, [x, y]]) => ({ id, x, y }))
const nodeById = new Map(mapNodes.map(node => [node.id, node]))
const node = (id: string) => nodeById.get(id)!
export const ORIGIN = node('origin')
const lengthBetween = (a: MapPoint, b: MapPoint) => Math.hypot(b.x - a.x, b.y - a.y)
const headingBetween = (a: MapPoint, b: MapPoint) => Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI

// Catmull–Rom samples preserve the original road bends and soften junctions.
function curve(anchors: MapPoint[]): MapPoint[] {
  const result: MapPoint[] = []
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[Math.max(0, i - 1)], b = anchors[i], c = anchors[i + 1], d = anchors[Math.min(anchors.length - 1, i + 2)]
    const steps = Math.max(6, Math.ceil(lengthBetween(b, c) / 7))
    for (let j = 0; j < steps; j++) {
      const t = j / steps, t2 = t * t, t3 = t2 * t
      const value = (key: 'x' | 'y') => .5 * (2 * b[key] + (c[key] - a[key]) * t + (2 * a[key] - 5 * b[key] + 4 * c[key] - d[key]) * t2 + (-a[key] + 3 * b[key] - 3 * c[key] + d[key]) * t3)
      result.push({ x: value('x'), y: value('y') })
    }
  }
  result.push(anchors.at(-1)!)
  return result
}
function road(from: string, to: string, street: string, anchors: [number, number][] = []) {
  const points = curve([node(from), ...anchors.map(([x, y]) => ({ x, y })), node(to)])
  return { id: from + '/' + to, from: node(from), to: node(to), street, points,
    length: points.slice(1).reduce((total, point, i) => total + lengthBetween(points[i], point), 0),
  }
}
export const mapRoads = [
  road('origin', 'interchange', 'Brookwood', [[1492, 1460], [1478, 1430]]),
  road('interchange', 'west', 'Northside Drive', [[1427, 1363], [1362, 1343]]),
  road('west', 'northwest', 'Northside Drive', [[1195, 1283], [1145, 1250], [1123, 1213]]),
  road('northwest', 'park', 'Collier Road', [[1145, 1190], [1200, 1190]]),
  road('west', 'park', 'Howell Mill Road', [[1260, 1275], [1260, 1220]]),
  road('interchange', 'northeast', 'Buford Highway', [[1491, 1380], [1540, 1349], [1600, 1317]]),
  road('northeast', 'upperEast', 'Buford Highway', [[1720, 1219], [1798, 1173], [1855, 1150]]),
  road('northeast', 'monroe', 'Monroe Drive', [[1670, 1264], [1740, 1258], [1748, 1300], [1780, 1365], [1820, 1390]]),
  road('origin', 'seventeenth', 'Spring Street'),
  road('seventeenth', 'midtown', 'Spring Street', [[1510, 1570]]),
  road('midtown', 'west14', '14th Street', [[1430, 1610], [1360, 1604]]),
  road('west14', 'plaza', 'State Street', [[1262, 1573]]),
  road('plaza', 'west', 'Howell Mill Road', [[1260, 1440]]),
  road('plaza', 'seventeenth', '17th Street', [[1320, 1535], [1368, 1565], [1408, 1558], [1438, 1543]]),
  road('midtown', 'parkWest', '14th Street', [[1595, 1605], [1650, 1605]]),
  road('parkWest', 'monroe', 'Piedmont Avenue', [[1702, 1586], [1730, 1557], [1780, 1513], [1820, 1470]]),
  road('midtown', 'spring10', 'Spring Street', [[1510, 1650]]),
  road('parkWest', 'piedmont10', 'Piedmont Avenue', [[1688, 1650]]),
  road('spring10', 'piedmont10', '10th Street', [[1600, 1695]]),
  road('piedmont10', 'parkSouth', '10th Street', [[1750, 1690]]),
  road('parkSouth', 'monroe', 'Monroe Drive', [[1845, 1610], [1862, 1520]]),
  road('spring10', 'techWest', '10th Street', [[1380, 1695]]),
  road('west14', 'techWest', 'State Street', [[1268, 1655]]),
  road('spring10', 'downtown', 'Spring Street', [[1510, 1775], [1514, 1820]]),
  road('techWest', 'campus', 'Ferst Drive', [[1300, 1735], [1340, 1750], [1420, 1758], [1440, 1780], [1410, 1810]]),
  road('campus', 'downtown', 'North Avenue', [[1400, 1865], [1460, 1875]]),
  road('downtown', 'ponce', 'Ponce de Leon Avenue', [[1630, 1872], [1740, 1870], [1800, 1840]]),
  road('parkSouth', 'ponce', 'Monroe Drive', [[1810, 1770], [1820, 1810]]),
  road('downtown', 'south', 'Downtown Connector', [[1520, 1912], [1530, 1960]]),
  road('south', 'east', 'Freedom Parkway', [[1630, 2005], [1725, 2070], [1810, 2073], [1900, 2043], [1990, 2010]]),
  road('ponce', 'east', 'Boulevard', [[1840, 1910], [1840, 1995], [1950, 1995]]),
]

export const places: MapPlace[] = [
  { id: 'home', name: "Home", category: 'home', detail: "Northside · Residential area", node: node('northwest') },
  { id: 'work', name: "Work", category: 'work', detail: "Midtown · Technology park", node: node('campus') },
  { id: 'river-park', name: "Riverside Park", category: 'park', detail: "Northside Park · South entrance", node: node('park') },
  { id: 'plaza', name: "City Plaza", category: 'shopping', detail: "Atlantic Station · Parking", node: node('plaza') },
  { id: 'gallery', name: "Arts Center", category: 'culture', detail: "Brookwood · East entrance", node: node('northeast') },
  { id: 'coffee', name: "Lakeside Cafe", category: 'coffee', detail: "Piedmont Park · Lakeside", node: node('parkSouth') },
  { id: 'charge-river', name: "Park Supercharger", category: 'charging', detail: "250 kW · 8 stalls available (demo)", node: node('monroe') },
  { id: 'charge-west', name: "Plaza Supercharger", category: 'charging', detail: "250 kW · 6 stalls available (demo)", node: node('west14') },
  { id: 'charge-east', name: "Central Supercharger", category: 'charging', detail: "250 kW · 12 stalls available (demo)", node: node('south') },
]
const neighbors = new Map<string, { node: MapNode; edge: typeof mapRoads[number]; reverse: boolean }[]>()
for (const edge of mapRoads) for (const [from, to, reverse] of [[edge.from, edge.to, false], [edge.to, edge.from, true]] as const) {
  if (!neighbors.has(from.id)) neighbors.set(from.id, [])
  neighbors.get(from.id)!.push({ node: to, edge, reverse })
}
function shortestPath(destination: MapNode, penalized = new Set<string>()) {
  const distances = new Map<string, number>([[ORIGIN.id, 0]])
  const previous = new Map<string, { from: string; edge: typeof mapRoads[number]; reverse: boolean }>()
  const pending = new Set(mapNodes.map(n => n.id))
  while (pending.size) {
    let current: string | undefined
    let minimum = Infinity
    for (const id of pending) if ((distances.get(id) ?? Infinity) < minimum) { minimum = distances.get(id)!; current = id }
    if (!current || current === destination.id) break
    pending.delete(current)
    for (const neighbor of neighbors.get(current) ?? []) {
      const cost = minimum + neighbor.edge.length * (penalized.has(neighbor.edge.id) ? 2.8 : 1)
      if (pending.has(neighbor.node.id) && cost < (distances.get(neighbor.node.id) ?? Infinity)) {
        distances.set(neighbor.node.id, cost)
        previous.set(neighbor.node.id, { from: current, edge: neighbor.edge, reverse: neighbor.reverse })
      }
    }
  }
  const legs: { edge: typeof mapRoads[number]; reverse: boolean }[] = []
  let cursor = destination.id
  while (cursor !== ORIGIN.id) {
    const parent = previous.get(cursor)
    if (!parent) throw new Error('Disconnected demo destination: ' + destination.id)
    legs.unshift(parent)
    cursor = parent.from
  }
  return legs
}
function roundedPath(points: MapPoint[]) {
  const commands = ['M' + points[0].x.toFixed(1) + ',' + points[0].y.toFixed(1)]
  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1], current = points[i], next = points[i + 1]
    const a = Math.min(8, lengthBetween(previous, current) * .46), b = Math.min(8, lengthBetween(current, next) * .46)
    const first = a / lengthBetween(previous, current), last = b / lengthBetween(current, next)
    commands.push('L' + (current.x + (previous.x - current.x) * first).toFixed(1) + ',' + (current.y + (previous.y - current.y) * first).toFixed(1))
    commands.push('Q' + current.x.toFixed(1) + ',' + current.y.toFixed(1) + ' ' + (current.x + (next.x - current.x) * last).toFixed(1) + ',' + (current.y + (next.y - current.y) * last).toFixed(1))
  }
  const end = points.at(-1)!
  return commands.join(' ') + 'L' + end.x.toFixed(1) + ',' + end.y.toFixed(1)
}
export function routesTo(place: MapPlace): MapRoute[] {
  const primary = shortestPath(place.node)
  const alternative = shortestPath(place.node, new Set(primary.map(leg => leg.edge.id)))
  const choices = [primary]
  if (alternative.map(leg => leg.edge.id).join() !== primary.map(leg => leg.edge.id).join()) choices.push(alternative)
  return choices.map((segments, index) => {
    const points: MapPoint[] = [], legs: RoadLeg[] = []
    let length = 0
    for (const segment of segments) {
      const samples = segment.reverse ? [...segment.edge.points].reverse() : segment.edge.points
      points.push(...(points.length ? samples.slice(1) : samples))
      length += segment.edge.length
      legs.push({ end: length, street: segment.edge.street,
        heading: headingBetween(samples[0], samples[Math.min(5, samples.length - 1)]),
        exitHeading: headingBetween(samples[Math.max(0, samples.length - 6)], samples.at(-1)!),
      })
    }
    return { id: place.id + '-' + index, label: index === 0 ? "Recommended" : "Alternative",
      nodes: points.map((p, i) => ({ ...p, id: String(i) })), path: roundedPath(points), length,
      distance: Math.round(length * .006 * 10) / 10, minutes: Math.max(3, Math.round(length / 80 + 2)), legs,
    }
  })
}
export function sampleRoute(route: MapRoute, progress: number) {
  const traveled = Math.min(1, Math.max(0, progress)) * route.length
  let remaining = traveled
  const legIndex = route.legs.findIndex(leg => leg.end >= traveled)
  const leg = route.legs[Math.max(0, legIndex)] ?? route.legs.at(-1)!
  const next = route.legs[legIndex + 1]
  const turn = next ? ((next.heading - leg.exitHeading + 540) % 360) - 180 : 0
  const guidance = { meters: Math.max(0, Math.round((leg.end - traveled) * 6 / 10) * 10),
    instruction: !next ? "Arriving at destination" : Math.abs(turn) < 35 ? "Continue straight" : turn > 0 ? "Turn right ahead" : "Turn left ahead",
    turn: !next ? 'arrival' : Math.abs(turn) < 35 ? 'straight' : turn > 0 ? 'right' : 'left', street: leg.street,
  }
  for (let i = 0; i < route.nodes.length - 1; i++) {
    const from = route.nodes[i], to = route.nodes[i + 1], length = lengthBetween(from, to)
    if (remaining <= length || i === route.nodes.length - 2) {
      const t = Math.min(1, remaining / length)
      return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, heading: headingBetween(from, to), ...guidance }
    }
    remaining -= length
  }
  return { ...ORIGIN, heading: 0, ...guidance }
}
