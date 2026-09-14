import { memo } from 'react'

const districts = [
  [1170, 1080, 'NORTHSIDE PARK'], [1470, 1230, 'BROOKWOOD'], [1890, 1265, 'MAYFAIR'],
  [1200, 1960, 'VINE CITY'], [1730, 2050, 'SWEET AUBURN'], [2250, 2010, 'INMAN PARK'],
  [2030, 1720, 'LINWOOD'], [760, 1820, 'GROVE PARK'], [2300, 1460, 'DRUID HILLS'],
  [960, 1350, 'WOODWARD'], [2470, 1110, 'EMORY ESTATES'], [1110, 2370, 'WEST END'],
] as const
const streets = [
  [1340, 1600, '14th St NW', 0], [1562, 1760, 'Spring St NW', -90], [1835, 1550, 'Monroe Dr NE', -96],
  [1560, 2210, 'Atlanta', 0], [1290, 1514, 'Atlantic Station', 0], [1300, 1810, 'Georgia Tech', 0],
  [1360, 843, 'W Wesley Rd', 0], [1800, 947, 'Piedmont Rd NE', -87], [2300, 763, 'Buford Hwy NE', -39],
] as const

// Only lightweight, independently switchable annotations remain live in SVG.
// The road/terrain geometry is exported offline by scripts/rasterize-map.cjs.
export const CityMap = memo(function CityMap({ labels, traffic }: { labels: boolean; traffic: boolean }) {
  return <g className="city-map-overlay" aria-hidden="true">
    {traffic && <g fill="none" strokeLinecap="round" strokeWidth="3.3" opacity=".8">
      <path d="M1508 1640V1740Q1507 1820 1530 1870" stroke="#ca9363" />
      <path d="M1625 1290Q1700 1220 1770 1191" stroke="#63a191" />
      <path d="M1175 1270Q1260 1325 1340 1340" stroke="#63a191" />
      <path d="M1710 2070Q1800 2080 1880 2055" stroke="#cc8767" />
    </g>}
    {labels && <g className="city-map-labels" textAnchor="middle" dominantBaseline="central">
      {districts.map(([x, y, text]) => <text key={text} x={x} y={y} className="city-district-label">{text}</text>)}
      {streets.map(([x, y, text, angle]) => <text key={text} x={x} y={y} transform={'rotate(' + angle + ' ' + x + ' ' + y + ')'} className={text === 'Atlanta' ? 'city-center-label' : 'city-street-label'}>{text}</text>)}
    </g>}
  </g>
})
