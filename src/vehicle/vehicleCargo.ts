import { createChargePort } from './createChargePort'
import { Box3, BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, Quaternion, Vector3 } from 'three'

export type CargoKind = 'front' | 'rear' | 'charge'
export type CargoAnchors = Record<CargoKind, HTMLDivElement | null>
const X_AXIS = new Vector3(1, 0, 0)
const MOTION_MS = 1050

function addTrunkInterior(model: Object3D) {
  // A stationary, open-top cargo well attached to the body, never to the lid.
  // The raised front partition, side walls and floor seal the missing interior.
  const rim = [
    [-0.55, 1.04, 1.34], [0.55, 1.04, 1.34],
    [0.66, 0.96, 1.56], [0.66, 0.82, 2.04],
    [0.54, 0.65, 2.20], [-0.54, 0.65, 2.20],
    [-0.66, 0.82, 2.04], [-0.66, 0.96, 1.56],
  ].map(point => new Vector3(...point as [number, number, number]))
  const base = rim.map(point => new Vector3(point.x * 0.94, 0.46, 1.77 + (point.z - 1.77) * 0.94))
  const center = new Vector3(0, 0.46, 1.77)
  const vertices: number[] = []
  function triangle(...points: Vector3[]) {
    points.forEach(point => vertices.push(...model.worldToLocal(point.clone()).toArray()))
  }
  for (let i = 0; i < rim.length; i++) {
    const next = (i + 1) % rim.length
    triangle(base[i], rim[i], rim[next])
    triangle(base[i], rim[next], base[next])
    triangle(center, base[next], base[i])
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.computeVertexNormals()
  const material = new MeshStandardMaterial({
    name: 'Trunk cargo well lining', color: 0x30343a, roughness: 0.96, metalness: 0,
    emissive: 0x14171c, emissiveIntensity: 0.2,
    side: DoubleSide, transparent: false, opacity: 1, depthWrite: true,
  })
  const interior = new Mesh(geometry, material)
  interior.name = 'Stationary trunk interior'
  interior.castShadow = true
  interior.receiveShadow = true
  model.add(interior)
}

/** Animate the GLB's existing hinge nodes, including the original trim and trunk lamps. */
export function createVehicleCargo(model: Object3D, anchors: CargoAnchors, host: HTMLDivElement, requestDraw: () => void) {
  model.updateWorldMatrix(true, true)
  addTrunkInterior(model)
  const parts = (['front', 'rear', 'charge'] as const).map(kind => {
    let node = model.getObjectByName(kind === 'front' ? 'bonnet_dummy_279' : kind === 'rear' ? 'boot_dummy_158' : 'charge_dummy')
    if (!node) throw new Error(`Missing vehicle cargo hinge: ${kind}`)
    const charge = kind === 'charge' ? createChargePort(model) : null
    if (charge) node = charge.hinge
    // The supplied hood is a single-sided shell. Keep its geometry, with a darker
    // inner face so the raised lid remains visible from the driving-side view.
    const linings = new Map<MeshStandardMaterial, MeshStandardMaterial>()
    node.traverse(object => {
      if (!(object instanceof Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      const next = materials.map(material => {
        if (!(material instanceof MeshStandardMaterial) || material.name !== 'Pearl white clearcoat') return material
        let lining = linings.get(material)
        if (!lining) {
          lining = material.clone()
          lining.side = DoubleSide
          lining.onBeforeCompile = shader => {
            shader.fragmentShader = shader.fragmentShader
              .replace('#include <color_fragment>', '#include <color_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb *= 0.28;')
              .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nif (!gl_FrontFacing) roughnessFactor = max(roughnessFactor, 0.78);')
          }
          lining.customProgramCacheKey = () => 'cargo-inner-face-v1'
          linings.set(material, lining)
        }
        return lining
      })
      object.material = Array.isArray(object.material) ? next : next[0]
    })
    const bounds = new Box3().setFromObject(node)
    const point = bounds.getCenter(new Vector3())
    point.y = bounds.max.y - (kind === 'front' ? 0.1 : 0.2)
    point.z = kind === 'front' ? bounds.min.z + (bounds.max.z - bounds.min.z) * 0.35 : bounds.max.z - 0.16
    const localAnchor = node.worldToLocal(point.clone())
    const sideAnchors = [0.22, 0.78].map(fraction => node.worldToLocal(point.clone().setX(bounds.min.x + (bounds.max.x - bounds.min.x) * fraction)))
    const axis = charge?.axis ?? X_AXIS
    const closed = node.quaternion.clone()
    const fixedAnchor = kind === 'charge' ? node.getWorldPosition(new Vector3()) : null
    return { kind, node, axis, fixedAnchor, localAnchor, sideAnchors, closed, angle: (kind === 'front' ? 62 : kind === 'rear' ? -72 : 105) * Math.PI / 180,
      opened: false, value: 0, motion: null as { from: number; to: number; at: number; duration: number } | null }
  })
  const rotation = new Quaternion()
  const projected = new Vector3()

  return {
    toggle(kind: CargoKind) {
      const part = parts.find(part => part.kind === kind)!
      part.opened = !part.opened
      const to = Number(part.opened)
      part.motion = { from: part.value, to, at: performance.now(), duration: Math.max(220, Math.abs(to - part.value) * MOTION_MS) }
      requestDraw()
      return part.opened
    },
    update(now: number, camera: PerspectiveCamera, progress: number) {
      let moving = false
      camera.updateMatrixWorld()
      const positions = parts.map(part => {
        if (part.motion) {
          const time = Math.min(1, (now - part.motion.at) / part.motion.duration)
          const ease = time * time * (3 - 2 * time)
          part.value = part.motion.from + (part.motion.to - part.motion.from) * ease
          if (time === 1) part.motion = null
          else moving = true
        }
        part.node.quaternion.copy(part.closed).multiply(rotation.setFromAxisAngle(part.axis, part.angle * part.value))
        part.node.updateWorldMatrix(true, true)
        const position = (anchor: Vector3) => {
          if (part.fixedAnchor) projected.copy(part.fixedAnchor)
          else projected.copy(anchor).applyMatrix4(part.node.matrixWorld)
          projected.project(camera)
          const x = (projected.x + 1) * host.clientWidth / 2
          const y = (1 - projected.y) * host.clientHeight / 2
          return { x, y, line: Math.max(16, Math.min(62 + progress * 58, y - 292)) }
        }
        return { part, ...position(part.localAnchor), alternatives: part.sideAnchors.map(position) }
      })
      // Straight-on views can align both lids. Use opposite points on the original
      // lid surfaces so both labels stay readable and the lines remain vertical.
      const [front, rear] = positions
      if (Math.abs(front.x - rear.x) < 160 && Math.abs((front.y - front.line) - (rear.y - rear.line)) < 74) {
        const choices = front.alternatives.flatMap(a => rear.alternatives.map(b => ({ a, b, gap: Math.abs(a.x - b.x) })))
        const best = choices.reduce((best, choice) => choice.gap > best.gap ? choice : best)
        Object.assign(front, best.a)
        Object.assign(rear, best.b)
      }
      positions.forEach(({ part, x, y, line }) => {
        const element = anchors[part.kind]
        if (!element) return
        // Compact labels sit beside the car; opening blends them back onto
        // their projected lid anchors and reveals the vertical leader lines.
        const compactX = part.kind === 'charge' ? 110 : 470
        element.style.left = `${compactX * (1 - progress) + x * progress}px`
        element.style.top = `${y + 31 * (1 - progress)}px`
        element.style.setProperty('--leader-height', `${line * progress}px`)
        element.style.setProperty('--leader-opacity', `${progress}`)
        element.style.setProperty('--side-leader-width', `${Math.max(0, Math.abs(compactX - x) * (1 - progress) - 66)}px`)
        element.style.setProperty('--side-leader-opacity', `${1 - progress}`)
        element.dataset.openness = part.value.toFixed(3)
        element.dataset.state = part.motion ? (part.opened ? 'opening' : 'closing') : (part.opened ? 'open' : 'closed')
      })
      return moving
    },
  }
}
