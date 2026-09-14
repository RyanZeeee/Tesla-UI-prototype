// Offline export: the browser receives only bitmaps, never the large path data.
// Requires the optional sharp package; see docs/development.md.
// Refresh the center with python3 scripts/refine-map-center.py before exporting.
const fs = require('node:fs/promises')
const path = require('node:path')
const sharp = require('sharp')

const root = path.resolve(__dirname, '..')

async function main() {
  const source = await fs.readFile(path.join(root, 'src/navigation/mapGeometry.ts'), 'utf8')
  const geometry = JSON.parse(source.split('export const mapGeometry = ')[1])
  const center = JSON.parse(await fs.readFile(path.join(root, 'src/navigation/mapCenterGeometry.json'), 'utf8'))
  const layers = [
    ['urban', '#1b1e27'], ['parks', '#14272a'], ['water', '#245669'],
    ['local', '#293344'], ['secondary', '#39485f'], ['highways', '#607287'],
  ]
  const destination = path.join(root, 'src/assets/navigation')
  await fs.mkdir(destination, { recursive: true })
  for (const detailed of [true, false]) {
    // Text, POIs, routes and the vehicle are intentionally excluded.
    const shapes = layers.filter(([name]) => detailed || name !== 'urban').map(([name, fill]) =>
      `<path d="${geometry[name]}" fill="${fill}" fill-rule="evenodd"${name === 'local' ? ' opacity=".82"' : ''}/>`).join('')
    const terrain = layers.slice(0, 3).filter(([name]) => detailed || name !== 'urban').map(([name, fill]) =>
      `<path d="${geometry[name]}" fill="${fill}" fill-rule="evenodd"/>`).join('')
    const centerRoads = layers.slice(3).map(([name, fill]) =>
      `<path d="${center[name]}" fill="${fill}" fill-rule="evenodd"${name === 'local' ? ' opacity=".82"' : ''}/>`).join('')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="3000" viewBox="0 0 3000 3000"><defs><filter id="edge" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="12"/></filter><mask id="center" maskUnits="userSpaceOnUse" x="950" y="1000" width="1230" height="1290"><rect x="990" y="1040" width="1140" height="1180" rx="24" fill="white" filter="url(#edge)"/></mask></defs><path d="M0 0H3000V3000H0Z" fill="#11151e"/>${shapes}<g mask="url(#center)"><path d="M0 0H3000V3000H0Z" fill="#11151e"/>${terrain}${centerRoads}</g></svg>`
    const output = path.join(destination, detailed ? 'map-base.webp' : 'map-base-flat.webp')
    await sharp(Buffer.from(svg)).webp({ lossless: true, effort: 6 }).toFile(output)
    console.log(path.relative(root, output), (await fs.stat(output)).size, 'bytes, 3000 × 3000, no labels')
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
