import {
  ACESFilmicToneMapping, AlwaysStencilFunc, ReplaceStencilOp, PCFSoftShadowMap, Box3, BufferGeometry,
  Color, DataTexture, DirectionalLight, DoubleSide, Float32BufferAttribute, Group, HemisphereLight, Material, Mesh, MeshBasicMaterial, PlaneGeometry, RectAreaLight, RepeatWrapping, RGBAFormat,
  MeshPhysicalMaterial, MeshStandardMaterial, PerspectiveCamera, Plane, PMREMGenerator, Scene,
  Texture, Vector3, WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { createCabinAirflow } from './createCabinAirflow'
import { createCabinDisplay } from './createCabinDisplay'

export interface CabinView { visible: boolean; powered: boolean; level: number; cooling: boolean; directions: [Vector2Like, Vector2Like] }
export interface Vector2Like { x: number; y: number }
export interface CabinScene { update: (state: CabinView) => void; dispose: () => void }

function release(root: Group | Scene) {
  const geometries = new Set<BufferGeometry>(), materials = new Set<Material>(), textures = new Set<Texture>()
  root.traverse(object => { if (object instanceof Mesh) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material)) } })
  materials.forEach(material => { Object.values(material).forEach(value => { if (value instanceof Texture && !value.isRenderTargetTexture) textures.add(value) }); material.dispose() })
  textures.forEach(texture => { const source: unknown = texture.source.data; if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) source.close(); texture.dispose() })
  geometries.forEach(geometry => geometry.dispose())
}

/** Original Model 3 interior meshes, isolated from the exterior display. */
export function createCabinScene(host: HTMLDivElement, onStatus: (status: 'ready' | 'error') => void): CabinScene {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, stencil: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setClearColor(0x08090b, 0)
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = .9
  renderer.shadowMap.enabled = true
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.type = PCFSoftShadowMap
  renderer.localClippingEnabled = true
  const canvas = renderer.domElement
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', "Model 3 interior with steering wheel, center display and air vents")
  host.appendChild(canvas)
  const scene = new Scene()
  const camera = new PerspectiveCamera(22, 3, .02, 20)
  camera.position.set(0, .66, .67)
  camera.lookAt(0, .17, -1)
  // Wide studio softboxes give curved leather and brushed trim continuous highlights.
  RectAreaLightUniformsLib.init()
  const environment = new Scene()
  environment.background = new Color(0x090b10)
  function softbox(x: number, y: number, z: number, w: number, h: number, color: number, strength: number) {
    const panel = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(color).multiplyScalar(strength), side: DoubleSide }))
    panel.position.set(x, y, z); panel.lookAt(0, .2, -.8); environment.add(panel)
  }
  softbox(-1.5, 3, 1.5, 5, 2.5, 0xfff4e5, 3)
  softbox(3, 1.4, -.4, 2, 3.5, 0xdbe8ff, 2)
  softbox(-3, .6, -.8, 1, 2, 0xe9f0ff, 1.2)
  softbox(1, 1.2, 3.2, 3, 2, 0xecf0f4, .35)
  const pmrem = new PMREMGenerator(renderer)
  const env = pmrem.fromScene(environment, .12)
  release(environment); pmrem.dispose()
  scene.environment = env.texture
  scene.environmentIntensity = .28
  scene.add(new HemisphereLight(0xd9e1ec, 0x101114, .1))
  const overhead = new RectAreaLight(0xfff4e7, 7, 2.8, 1.15)
  overhead.position.set(-.55, 1.5, .25); overhead.lookAt(0, .12, -.9); scene.add(overhead)
  const edge = new RectAreaLight(0xd9e5f4, 3, .65, 1.5)
  edge.position.set(1.6, .85, -.6); edge.lookAt(0, .1, -.9); scene.add(edge)
  const frontFill = new RectAreaLight(0xe9edf3, .65, 3.5, 2)
  frontFill.position.set(.2, .6, 1.5); frontFill.lookAt(0, .1, -.9); scene.add(frontFill)
  const key = new DirectionalLight(0xf1e9df, 1.15)
  key.position.set(-1.4, 2.7, .7); key.target.position.set(0, .1, -.9)
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048)
  Object.assign(key.shadow.camera, { left: -1.25, right: 1.25, top: 1.1, bottom: -1.1, near: .1, far: 6 })
  key.shadow.bias = -.0001; key.shadow.normalBias = .0015; key.shadow.radius = 4
  scene.add(key, key.target)
  // Fine code-generated surface grain, shared by cabin leather and soft-touch plastics.
  const grainPixels = new Uint8Array(128 * 128 * 4)
  let seed = 713
  for (let i = 0; i < 128 * 128; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const value = 130 + (seed >>> 25)
    grainPixels.set([value, value, value, 255], i * 4)
  }
  const grain = new DataTexture(grainPixels, 128, 128, RGBAFormat)
  grain.wrapS = grain.wrapT = RepeatWrapping; grain.repeat.set(28, 28); grain.needsUpdate = true
  const cabin = new Group(); scene.add(cabin)
  const draco = new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`).setWorkerLimit(1)
  const loader = new GLTFLoader().setDRACOLoader(draco)
  const originalMaterials = new Set<Material>()
  const extraMaterials = new Set<Material>()
  const abort = new AbortController()
  let disposed = false, loaded = false, frame = 0, width = 0, height = 0, contextLost = false
  let state: CabinView = { visible: false, powered: true, level: 2, cooling: true, directions: [{ x: 0, y: 0 }, { x: 0, y: 0 }] }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')

  const airflow = createCabinAirflow(scene)

  function draw(now: number) {
    frame = 0
    if (disposed || contextLost || !state.visible || document.hidden) return
    const bounds = host.getBoundingClientRect()
    const w = Math.max(1, Math.round(bounds.width)), h = Math.max(1, Math.round(bounds.height))
    if (w !== width || h !== height) { width = w; height = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix() }
    airflow.update(state, loaded, motion.matches ? 0 : now * .001 * (.7 + state.level * .22), height * renderer.getPixelRatio())
    renderer.render(scene, camera)
    if (loaded && state.powered && !motion.matches) requestDraw()
  }
  function requestDraw() { if (!disposed && !frame && state.visible && !document.hidden) frame = requestAnimationFrame(draw) }
  const observer = new ResizeObserver(requestDraw); observer.observe(host)
  document.addEventListener('visibilitychange', requestDraw)
  function lost(event: Event) { event.preventDefault(); contextLost = true; onStatus('error') }
  function restored() { contextLost = false; renderer.shadowMap.needsUpdate = true; if (loaded) onStatus('ready'); requestDraw() }
  canvas.addEventListener('webglcontextlost', lost); canvas.addEventListener('webglcontextrestored', restored)

  async function load() {
    const response = await fetch(`${import.meta.env.BASE_URL}models/tesla-model-3.glb`, { signal: abort.signal })
    if (!response.ok) throw new Error(`Cabin model ${response.status}`)
    const buffer = await response.arrayBuffer()
    if (disposed) return
    const gltf = await loader.parseAsync(buffer, `${import.meta.env.BASE_URL}models/`)
    if (disposed) { release(gltf.scene); return }
    gltf.scene.scale.multiplyScalar(.01)
    cabin.add(gltf.scene); gltf.scene.updateWorldMatrix(true, true)
    // These source meshes contain dashboard trim, wheel, screen and cabin plastics.
    const cabinParts = new Set([34, 36, 38, 110, 119, 122, 134, 137, 160, 163, 172, 175, 193, 196, 208, 211, 222, 225])
    const clipping = [new Plane(new Vector3(0, 0, -1), -.48), new Plane(new Vector3(0, -1, 0), .245), new Plane(new Vector3(0, 1, 0), .08)]
    const tuned = new Map<Material, MeshPhysicalMaterial>()
    gltf.scene.traverse(object => {
      if (!(object instanceof Mesh)) return
      ;(Array.isArray(object.material) ? object.material : [object.material]).forEach(material => originalMaterials.add(material))
      const id = Number(object.name.replace('Object_', ''))
      object.visible = cabinParts.has(id)
      if (!object.visible) return
      object.castShadow = true; object.receiveShadow = true
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      const next = materials.map(source => {
        let material = tuned.get(source)
        if (!material) {
          material = new MeshPhysicalMaterial()
          if (source instanceof MeshStandardMaterial) {
            material.color.copy(source.color); material.map = source.map; material.normalMap = source.normalMap
            material.roughnessMap = source.roughnessMap; material.metalnessMap = source.metalnessMap
          }
          material.name = source.name
          material.specularIntensity = .45; material.envMap = env.texture; material.envMapIntensity = .3
          material.clipShadows = true; material.clippingPlanes = clipping; material.side = DoubleSide; material.emissiveIntensity = 0
          material.roughness = .72; material.metalness = 0
          if (source.name === 'dvorright.0') { material.color.set(0x252a30); material.roughness = .56; material.bumpMap = grain; material.bumpScale = .00015; material.clearcoat = .08; material.clearcoatRoughness = .45 }
          if (source.name === 'movsteer_1.0.0') { material.color.set(0x758292); material.roughness = .58; material.bumpMap = grain; material.bumpScale = .00025; material.sheen = .26; material.sheenColor.set(0x455365); material.sheenRoughness = .75; material.clearcoat = .08; material.clearcoatRoughness = .45 }
          if (source.name === 'Putih.0') { material.color.set(0xd0ccc4); material.roughness = .5 }
          if (source.name === 'movsteer_1.0.1' || source.name === 'aluminium_light.0') { material.color.set(0x747b84); material.metalness = .7; material.roughness = .48; material.envMapIntensity = .5; material.anisotropy = .45 }
          if (source.name === 'LCDs.0') { material.map = null; material.emissiveMap = null; material.color.set(0x05080c); material.roughness = .35; material.metalness = 0; material.envMap = env.texture; material.envMapIntensity = .025 }
          tuned.set(source, material); extraMaterials.add(material)
        }
        return material
      })
      if ([134, 163, 225].includes(id)) {
        const screen = new MeshPhysicalMaterial({
          color: id === 225 ? 0x010203 : 0x030507, roughness: id === 225 ? .5 : .6,
          metalness: 0, clearcoat: 0,
          clearcoatRoughness: .5, specularIntensity: .025, envMap: env.texture, envMapIntensity: .015,
          clippingPlanes: [clipping[0], clipping[2]], clipShadows: true, side: DoubleSide,
        })
        if (id === 225) {
          // The source LCD lies in local X/Z; use its face bounds instead of the old texture atlas.
          const geometry = object.geometry
          geometry.computeBoundingBox()
          const bounds = geometry.boundingBox!
          const positions = geometry.getAttribute('position')
          const uv = new Float32Array(positions.count * 2)
          for (let i = 0; i < positions.count; i++) {
            uv[i * 2] = (positions.getX(i) - bounds.min.x) / (bounds.max.x - bounds.min.x)
            uv[i * 2 + 1] = (positions.getZ(i) - bounds.min.z) / (bounds.max.z - bounds.min.z)
          }
          geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
          screen.emissiveMap = createCabinDisplay()
          screen.emissive.set(0xffffff); screen.emissiveIntensity = .6
        }
        object.material = screen
      } else if ([34, 36, 38, 160, 196, 208, 222].includes(id)) {
        const uncut = next.map(material => {
          const copy = material.clone(); copy.clippingPlanes = [clipping[0], clipping[2]]
          // The original wheel emblem is its own mesh; keep other trim unchanged.
          if (id === 34) {
            copy.color.set(0x3d4248); copy.map = null; copy.metalness = .25; copy.roughness = .72
            copy.envMapIntensity = .12; copy.specularIntensity = .2; copy.clearcoat = 0; copy.anisotropy = 0
          }
          return copy
        })
        object.material = Array.isArray(object.material) ? uncut : uncut[0]
      } else object.material = Array.isArray(object.material) ? next : next[0]
      if ([134, 163, 225].includes(id)) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          material.stencilWrite = true; material.stencilRef = 1; material.stencilFunc = AlwaysStencilFunc; material.stencilZPass = ReplaceStencilOp
        }
      }
    })
    // Source materials can share textures with the cloned interior materials.
    tuned.forEach((_value, source) => source.dispose())
    const box = new Box3().setFromObject(cabin)
    host.dataset.modelBounds = box.getSize(new Vector3()).toArray().map(value => value.toFixed(2)).join(',')
    loaded = true; renderer.shadowMap.needsUpdate = true; onStatus('ready'); requestDraw()
  }
  void load().catch(() => { if (!disposed) onStatus('error') })
  return {
    update(next) { state = next; if (!state.visible) { cancelAnimationFrame(frame); frame = 0 } else requestDraw() },
    dispose() { disposed = true; abort.abort(); cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('visibilitychange', requestDraw); canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', restored); draco.dispose();
      const unusedTextures = new Set<Texture>()
      originalMaterials.forEach(material => { Object.values(material).forEach(value => { if (value instanceof Texture && !value.isRenderTargetTexture) unusedTextures.add(value) }); material.dispose() })
      // release handles scene-owned maps; a disposed texture can safely be released again.
      release(scene); extraMaterials.forEach(material => material.dispose()); unusedTextures.forEach(texture => texture.dispose()); grain.dispose(); env.dispose(); key.shadow.map?.dispose(); renderer.dispose(); canvas.remove() },
  }
}
