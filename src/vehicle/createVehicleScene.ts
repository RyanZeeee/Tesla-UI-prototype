import {
  ACESFilmicToneMapping, Box3, BufferGeometry, Group, Material,
  Mesh, Object3D, PCFShadowMap,
  PerspectiveCamera, Scene, Texture, Vector3,
  WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { createVehicleStudio } from './createVehicleStudio'
import { applyVehicleMaterials } from './vehicleMaterials'
import { createVehicleBloom } from './createVehicleBloom'
import { createVehicleCargo } from './vehicleCargo'
import type { CargoAnchors, CargoKind } from './vehicleCargo'

export interface VehicleScene {
  updateView: (progress: number, expanded: boolean) => void
  toggleCargo: (kind: CargoKind) => boolean | undefined
  dispose: () => void
}

type Status = 'ready' | 'error'
const radians = (degrees: number) => degrees * Math.PI / 180
const lerp = (start: number, end: number, progress: number) => start + (end - start) * progress
const OPEN_YAW = radians(-48)
const OPEN_ELEVATION = radians(3)
const MIN_ELEVATION = radians(2) - OPEN_ELEVATION
const MAX_ELEVATION = radians(65) - OPEN_ELEVATION
const RESET_DELAY_MS = 5000
const RESET_DURATION_MS = 700

function disposeObject(root: Object3D) {
  const materials = new Set<Material>()
  const textures = new Set<Texture>()
  const geometries = new Set<BufferGeometry>()
  root.traverse(object => {
    if (!(object instanceof Mesh)) return
    geometries.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
  })
  materials.forEach(material => {
    Object.values(material).forEach(value => {
      if (value instanceof Texture && !value.isRenderTargetTexture) textures.add(value)
    })
    material.dispose()
  })
  textures.forEach(texture => {
    const image: unknown = texture.source.data
    if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) image.close()
    texture.dispose()
  })
  geometries.forEach(geometry => geometry.dispose())
}

/** One WebGL context; rendering is requested only by loading, resizing or interaction. */
export function createVehicleScene(host: HTMLDivElement, onStatus: (status: Status) => void, cargoAnchors: CargoAnchors): VehicleScene {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.setClearColor(0x0e0e0e, 1)
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  const canvas = renderer.domElement
  canvas.setAttribute('role', 'img')
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.display = 'block'
  host.appendChild(canvas)

  const scene = new Scene()
  const camera = new PerspectiveCamera(35, 580 / 630, 0.1, 100)
  const target = new Vector3(0, 0.65, 0)
  const car = new Group()
  scene.add(car)

  const studio = createVehicleStudio(renderer, scene)
  const bloom = createVehicleBloom(renderer, scene, camera)
  let cargo: ReturnType<typeof createVehicleCargo> | undefined

  const draco = new DRACOLoader()
  draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`)
  draco.setWorkerLimit(2)
  const loader = new GLTFLoader().setDRACOLoader(draco)
  const abortController = new AbortController()
  let disposed = false
  let contextLost = false
  let loaded = false
  let frame = 0
  let lastWidth = 0
  let lastHeight = 0
  let progress = 0
  let expanded = false
  let interactive = false
  let userYaw = 0
  let userElevation = 0
  let drag: { pointerId: number; x: number; y: number; startX: number; startY: number; moved: boolean } | null = null
  let resetTimer: number | undefined
  let resetMotion: { startedAt: number; yaw: number; elevation: number } | null = null

  function draw(now: number) {
    frame = 0
    if (disposed || contextLost) return
    if (resetMotion) {
      const amount = Math.min(1, (now - resetMotion.startedAt) / RESET_DURATION_MS)
      const remaining = (1 - amount) ** 3
      userYaw = resetMotion.yaw * remaining
      userElevation = resetMotion.elevation * remaining
      if (amount === 1) resetMotion = null
    }
    const rect = host.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))
    if (width !== lastWidth || height !== lastHeight) {
      renderer.setSize(width, height, false)
      bloom.setSize(width, height)
      lastWidth = width
      lastHeight = height
    }
    // The stage fills the entire sidebar while the car keeps its previous size and position.
    const displayScale = height / 1080
    const framingWidth = (580 + 820 * progress) * displayScale
    camera.setViewOffset(framingWidth, 630 * displayScale, (framingWidth - width) / 2, -235 * displayScale, width, height)

    // Use the equivalent 312° heading for the shorter transition from the compact view.
    const yaw = lerp(radians(180), OPEN_YAW + Math.PI * 2, progress) + userYaw * progress
    const elevation = lerp(radians(74), OPEN_ELEVATION, progress) + userElevation * progress
    // Pull back only at steep user-selected elevations to keep the whole car in frame.
    const orbitDistance = lerp(4.8, 8.8, Math.max(0, userElevation / MAX_ELEVATION))
    const distance = lerp(12.9, orbitDistance, progress)
    camera.position.set(
      Math.sin(yaw) * Math.cos(elevation) * distance,
      target.y + Math.sin(elevation) * distance,
      -Math.cos(yaw) * Math.cos(elevation) * distance,
    )
    camera.lookAt(target)
    host.dataset.viewAzimuth = (yaw * 180 / Math.PI).toFixed(2)
    host.dataset.viewElevation = (elevation * 180 / Math.PI).toFixed(2)
    const cargoMoving = cargo?.update(now, camera, progress)
    studio.update(progress, width, height)
    bloom.render()
    if (resetMotion || cargoMoving) requestDraw()
  }

  function requestDraw() {
    if (!disposed && !contextLost && !frame) frame = requestAnimationFrame(draw)
  }

  function releaseDrag() {
    const pointerId = drag?.pointerId
    drag = null
    if (pointerId !== undefined && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId)
    canvas.style.cursor = interactive ? 'inherit' : 'default'
  }

  function cancelReset() {
    window.clearTimeout(resetTimer)
    resetTimer = undefined
    resetMotion = null
  }

  function scheduleReset() {
    window.clearTimeout(resetTimer)
    if (!interactive || disposed || drag || (!userYaw && !userElevation)) return
    resetTimer = window.setTimeout(resetView, RESET_DELAY_MS)
  }

  function endDrag() {
    if (!drag) return
    releaseDrag()
    scheduleReset()
  }

  function updateInteraction() {
    interactive = expanded && progress >= 0.9999 && loaded && !contextLost
    host.dataset.interactive = String(interactive)
    canvas.tabIndex = interactive ? 0 : -1
    canvas.style.touchAction = interactive ? 'none' : 'auto'
    canvas.style.cursor = interactive ? 'inherit' : 'default'
    host.style.cursor = interactive ? 'grab' : 'default'
    canvas.setAttribute('aria-label', interactive ? "Model 3 3D vehicle; drag or use arrow keys to rotate; returns to the default view after 5 seconds of inactivity" : "Model 3 3D vehicle; fixed view")
    if (!interactive) { cancelReset(); releaseDrag() }
  }

  function resetView() {
    if (!interactive || disposed || drag) return
    cancelReset()
    // Return along the nearest turn, including after dragging through multiple revolutions.
    userYaw = Math.atan2(Math.sin(userYaw), Math.cos(userYaw))
    resetMotion = { startedAt: performance.now(), yaw: userYaw, elevation: userElevation }
    requestDraw()
  }

  function pointerDown(event: PointerEvent) {
    if (!interactive || !event.isPrimary || event.button !== 0) return
    event.preventDefault()
    cancelReset()
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false }
    canvas.setPointerCapture(event.pointerId)
    canvas.focus({ preventScroll: true })
    canvas.style.cursor = 'grabbing'
  }

  function pointerMove(event: PointerEvent) {
    if (!interactive) return
    if (!drag) return
    if (event.pointerId !== drag.pointerId) return
    drag.moved ||= Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6
    const rect = canvas.getBoundingClientRect()
    if (drag.moved) {
      userYaw -= (event.clientX - drag.x) / rect.width * Math.PI * 2
      userElevation = Math.max(MIN_ELEVATION, Math.min(MAX_ELEVATION, userElevation + (event.clientY - drag.y) / rect.height * Math.PI / 2))
    }
    drag.x = event.clientX
    drag.y = event.clientY
    requestDraw()
  }

  function keyDown(event: KeyboardEvent) {
    if (!interactive) return
    if (event.key === 'Home' || event.key === 'Escape') { event.preventDefault(); resetView(); return }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    cancelReset()
    if (event.key === 'ArrowLeft') userYaw += radians(5)
    if (event.key === 'ArrowRight') userYaw -= radians(5)
    if (event.key === 'ArrowUp') userElevation = Math.min(MAX_ELEVATION, userElevation + radians(5))
    if (event.key === 'ArrowDown') userElevation = Math.max(MIN_ELEVATION, userElevation - radians(5))
    requestDraw()
    scheduleReset()
  }

  function onContextLost(event: Event) {
    event.preventDefault()
    contextLost = true
    cancelAnimationFrame(frame)
    frame = 0
    updateInteraction()
    onStatus('error')
  }

  function onContextRestored() {
    contextLost = false
    updateInteraction()
    requestDraw()
    if (loaded) onStatus('ready')
  }

  canvas.addEventListener('pointerdown', pointerDown)
  canvas.addEventListener('pointermove', pointerMove)
  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', endDrag)
  canvas.addEventListener('lostpointercapture', endDrag)
  canvas.addEventListener('dblclick', resetView)
  canvas.addEventListener('keydown', keyDown)
  canvas.addEventListener('webglcontextlost', onContextLost)
  canvas.addEventListener('webglcontextrestored', onContextRestored)
  window.addEventListener('resize', requestDraw)
  const resizeObserver = new ResizeObserver(requestDraw)
  resizeObserver.observe(host)
  updateInteraction()
  requestDraw()

  async function loadCar() {
    const response = await fetch(`${import.meta.env.BASE_URL}models/tesla-model-3.glb`, { signal: abortController.signal })
    if (!response.ok) throw new Error(`Vehicle model: HTTP ${response.status}`)
    const buffer = await response.arrayBuffer()
    if (disposed) return
    const gltf = await loader.parseAsync(buffer, `${import.meta.env.BASE_URL}models/`)
    if (disposed) { disposeObject(gltf.scene); return }

    const bounds = new Box3().setFromObject(gltf.scene)
    const center = bounds.getCenter(new Vector3())
    const size = bounds.getSize(new Vector3())
    gltf.scene.position.sub(center)
    gltf.scene.position.y += size.y / 2
    const normalization = new Group()
    normalization.scale.setScalar(4.7 / Math.max(size.x, size.z))
    normalization.add(gltf.scene)

    applyVehicleMaterials(gltf.scene, scene.environment)
    car.add(normalization)
    cargo = createVehicleCargo(gltf.scene, cargoAnchors, host, requestDraw)
    loaded = true
    updateInteraction()
    requestDraw()
    if (!contextLost) onStatus('ready')
  }

  void loadCar().catch(() => {
    if (!disposed) onStatus('error')
  })

  return {
    toggleCargo(kind) {
      if (!loaded || disposed || contextLost) return undefined
      return cargo?.toggle(kind)
    },
    updateView(nextProgress, nextExpanded) {
      // Begin every opening at the reference view, including after a previous drag.
      if (nextExpanded && !expanded) { userYaw = 0; userElevation = 0 }
      progress = Math.max(0, Math.min(1, nextProgress))
      expanded = nextExpanded
      if (progress === 0) { userYaw = 0; userElevation = 0 }
      updateInteraction()
      requestDraw()
    },
    dispose() {
      disposed = true
      abortController.abort()
      cancelAnimationFrame(frame)
      cancelReset()
      releaseDrag()
      resizeObserver.disconnect()
      window.removeEventListener('resize', requestDraw)
      canvas.removeEventListener('pointerdown', pointerDown)
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerup', endDrag)
      canvas.removeEventListener('pointercancel', endDrag)
      canvas.removeEventListener('lostpointercapture', endDrag)
      canvas.removeEventListener('dblclick', resetView)
      canvas.removeEventListener('keydown', keyDown)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      draco.dispose()
      disposeObject(scene)
      studio.dispose()
      bloom.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}
