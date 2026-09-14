import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Matrix4, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three'

type Vertex = { point: Vector3; attributes: Record<string, number[]> }
const SEAM_Y = -2.205
// Coordinates in the original chassis frame, measured from the existing lens edge.
const HINGE = new Vector3(-0.8845, -2.081, 0.3017)
const AXIS = new Vector3(-0.266, 0.964, -0.009).normalize()

function split(vertices: Vertex[], distance: (point: Vector3) => number) {
  const inside: Vertex[] = [], outside: Vertex[] = []
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length]
    const da = distance(a.point), db = distance(b.point)
    ;(da >= 0 ? inside : outside).push(a)
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db)
      const intersection = { point: a.point.clone().lerp(b.point, t), attributes: Object.fromEntries(Object.entries(a.attributes).map(([name, values]) => [name, values.map((value, index) => value + (b.attributes[name][index] - value) * t)])) }
      inside.push(intersection); outside.push(intersection)
    }
  }
  return { inside, outside }
}

/** Detach the original flush lens and trim; the community add-on is misregistered. */
export function createChargePort(model: Object3D) {
  const addon = model.getObjectByName('charge_dummy')
  if (!addon?.parent) throw new Error('Missing charge port chassis')
  addon.visible = false
  const chassis = addon.parent
  chassis.updateWorldMatrix(true, true)
  const hinge = new Group()
  hinge.name = 'Charge port upper hinge'
  hinge.position.copy(HINGE)
  chassis.add(hinge)
  const chassisInverse = new Matrix4().copy(chassis.matrixWorld).invert()
  const apertureMaterial = new MeshStandardMaterial({ color: 0x090c10, roughness: 0.88, side: DoubleSide })
  let outerGeometry: BufferGeometry | undefined
  for (const name of ['Object_441', 'Object_57', 'Object_69']) {
    const mesh = model.getObjectByName(name)
    if (!(mesh instanceof Mesh)) throw new Error(`Missing charge port surface: ${name}`)
    const original: BufferGeometry = mesh.geometry
    const toChassis = new Matrix4().multiplyMatrices(chassisInverse, mesh.matrixWorld)
    const kept: Record<string, number[]> = {}, moved: Record<string, number[]> = {}
    for (const name of Object.keys(original.attributes)) { kept[name] = []; moved[name] = [] }
    function append(polygon: Vertex[], output: Record<string, number[]>) {
      for (let i = 1; i + 1 < polygon.length; i++) for (const vertex of [polygon[0], polygon[i], polygon[i + 1]]) {
        for (const [name, values] of Object.entries(vertex.attributes)) output[name].push(...values)
      }
    }
    const count = original.index?.count ?? original.attributes.position.count
    for (let i = 0; i < count; i += 3) {
      let polygon: Vertex[] = [0, 1, 2].map(offset => {
        const index = original.index ? original.index.getX(i + offset) : i + offset
        const attributes = Object.fromEntries(Object.entries(original.attributes).map(([name, attr]) => [name, Array.from({ length: attr.itemSize }, (_, component) => attr.getComponent(index, component))]))
        return { point: new Vector3().fromArray(attributes.position).applyMatrix4(toChassis), attributes }
      })
      // Restrict the cut to the left outer tail-light extension.
      for (const plane of [(p: Vector3) => -0.55 - p.x, (p: Vector3) => p.y - SEAM_Y, (p: Vector3) => -1.9 - p.y]) {
        if (!polygon.length) break
        const result = split(polygon, plane)
        append(result.outside, kept)
        polygon = result.inside
      }
      append(polygon, moved)
    }
    const geometry = (values: Record<string, number[]>) => {
      const result = new BufferGeometry()
      for (const [name, data] of Object.entries(values)) result.setAttribute(name, new Float32BufferAttribute(data, original.attributes[name].itemSize))
      return result
    }
    mesh.geometry = geometry(kept)
    const flapGeometry = geometry(moved).applyMatrix4(toChassis).translate(-HINGE.x, -HINGE.y, -HINGE.z)
    const sourceMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    const material = sourceMaterial.clone()
    material.side = DoubleSide
    if (material instanceof MeshStandardMaterial) {
      material.emissiveIntensity = 0
      if (name === 'Object_441') {
        material.color.set(0x20252c)
        material.transparent = false; material.opacity = 1; material.depthWrite = true
        material.roughness = 0.28; material.metalness = 0.12
      }
    }
    const flap = new Mesh(flapGeometry, material)
    flap.name = `Charge port original surface ${name}`
    flap.castShadow = true; flap.receiveShadow = true
    hinge.add(flap)
    if (name === 'Object_441') outerGeometry = flapGeometry
    original.dispose()
  }
  if (outerGeometry) {
    const well = new Mesh(outerGeometry.clone(), apertureMaterial)
    well.name = 'Charge port recessed well'
    well.position.copy(HINGE).add(new Vector3(0.013, 0.004, 0))
    chassis.add(well)
  }
  hinge.updateWorldMatrix(true, true)
  return { hinge, axis: AXIS }
}
