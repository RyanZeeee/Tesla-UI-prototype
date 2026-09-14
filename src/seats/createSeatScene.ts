import {
  ACESFilmicToneMapping, BufferGeometry, Color, DataTexture, DirectionalLight, DoubleSide, Float32BufferAttribute, Group,
  HemisphereLight, LinearFilter, LinearMipmapLinearFilter, Material, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, OrthographicCamera,
  PCFShadowMap, PlaneGeometry, PMREMGenerator, RectAreaLight, RepeatWrapping, RGBAFormat,
  Scene, Texture, Vector3, WebGLRenderer, CatmullRomCurve3, TubeGeometry, Raycaster,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { defaultSeats, type SeatPair, type SeatSide } from './seatState'

export interface SeatView { visible: boolean; poses: SeatPair; selected: SeatSide }
export interface SeatScene { update: (view: SeatView) => void; dispose: () => void }
type Rig = { carriage: Group; back: Group; side: SeatSide; sceneIndex: number }
function release(root: Scene | Group) {
  const materials = new Set<Material>(), geometry = new Set<BufferGeometry>()
  root.traverse(object => { if (object instanceof Mesh) { geometry.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m)) } })
  materials.forEach(m => m.dispose()); geometry.forEach(g => g.dispose())
}

// Stitch runs follow the original upholstered surfaces, including their curvature.
function addUpholsterySeams(root: Group) {
  const thread = new MeshPhysicalMaterial({ color: 0x717777, roughness: .94, metalness: 0, specularIntensity: .12 })
  const caster = new Raycaster()
  for (const [meshName, vertical] of [['insert-74-14', true], ['leather-74-2', false]] as const) {
    const surface = root.getObjectByName(meshName) as Mesh | undefined
    if (!surface) continue
    const probe = new Mesh(surface.geometry, surface.material)
    probe.updateMatrixWorld(true)
    for (const side of [-1, 1]) {
      for (const offset of [0, .006]) {
        const points: Vector3[] = []
        for (let i = 0; i <= 50; i++) {
          const t = i / 50
          const x = side * ((vertical ? .16 + .025 * Math.sin(t * Math.PI) : .20) + offset)
          caster.set(vertical ? new Vector3(x, .22 + t * .34, 1) : new Vector3(x, 1, -.035 + t * .37), vertical ? new Vector3(0, 0, -1) : new Vector3(0, -1, 0))
          const hit = caster.intersectObject(probe, false)[0]
          if (hit) points.push(hit.point.addScaledVector(hit.face!.normal, .0015))
        }
        if (points.length > 5) {
          const seam = new Mesh(new TubeGeometry(new CatmullRomCurve3(points), 60, .00085, 4, false), thread)
          seam.name = 'Upholstery stitching'; surface.add(seam)
        }
      }
    }
  }
}

/** Four synchronized views of the original Model 3 front-seat surfaces, one WebGL context. */
export function createSeatScene(host: HTMLDivElement, status: (state: 'ready' | 'error') => void): SeatScene {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.setClearColor(0x08090b, 0)
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = .84
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFShadowMap
  const canvas = renderer.domElement
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', "Front seat 3D models; front views in the center and matching side views on either side")
  host.appendChild(canvas)
  RectAreaLightUniformsLib.init()
  const environment = new Scene(); environment.background = new Color(0x050607)
  for (const [x,y,z,w,h,color,power] of [[-2.5,3.6,1.8,3.8,4.2,0xf5f3ee,2.2],[2.8,1.8,-2,2.4,3.6,0xd3dae1,1.3],[0,1.3,4,3.2,1.8,0xd2dae2,.35]]) {
    const panel = new Mesh(new PlaneGeometry(w,h),new MeshBasicMaterial({color:new Color(color).multiplyScalar(power),side:DoubleSide}))
    panel.position.set(x,y,z); panel.lookAt(0,.45,0); environment.add(panel)
  }
  const pmrem = new PMREMGenerator(renderer), env = pmrem.fromScene(environment,.18)
  release(environment); pmrem.dispose()
  // Filtered micrograin affects only surface relief. A separate, near-white
  // roughness map keeps the leather matte instead of turning its pores glossy.
  const grainSize = 256, grainPixels = new Uint8Array(grainSize * grainSize * 4)
  const roughnessPixels = new Uint8Array(grainPixels.length), noise = new Float32Array(grainSize * grainSize)
  let seed = 84
  for (let i=0;i<noise.length;i++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0
    noise[i]=(seed>>>24)/255
  }
  for (let y=0;y<grainSize;y++)for(let x=0;x<grainSize;x++) {
    const i=y*grainSize+x
    const n=(noise[i]*4+noise[y*grainSize+(x+1)%grainSize]+noise[y*grainSize+(x+grainSize-1)%grainSize]+noise[((y+1)%grainSize)*grainSize+x]+noise[((y+grainSize-1)%grainSize)*grainSize+x])/8
    const relief=Math.round(110+n*36), roughness=Math.round(239+n*16)
    grainPixels.set([relief,relief,relief,255],i*4)
    roughnessPixels.set([roughness,roughness,roughness,255],i*4)
  }
  const grain = new DataTexture(grainPixels,grainSize,grainSize,RGBAFormat)
  const leatherRoughness = new DataTexture(roughnessPixels,grainSize,grainSize,RGBAFormat)
  for(const texture of [grain,leatherRoughness]){
    texture.wrapS=texture.wrapT=RepeatWrapping;texture.repeat.set(8,8)
    texture.magFilter=LinearFilter;texture.minFilter=LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true
  }
  const shadowPixels=new Uint8Array(128*128*4)
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const radius=Math.hypot((x-63.5)/63.5,(y-63.5)/63.5)
    const alpha=Math.pow(Math.max(0,1-radius),2.2)*150
    shadowPixels.set([0,0,0,alpha],(y*128+x)*4)
  }
  const contactShadow=new DataTexture(shadowPixels,128,128,RGBAFormat);contactShadow.needsUpdate=true
  const scenes: Scene[] = [], cameras: OrthographicCamera[] = [], rigs: Rig[] = []
  const poses = defaultSeats()
  let view: SeatView = { visible:false,poses:defaultSeats(),selected:0 }
  let loaded = false, disposed = false, lost = false, frame = 0, width = 0, height = 0, previousTime = 0
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const abort = new AbortController()
  const extras = new Set<Material>()
  for (let i=0;i<3;i++) {
    const scene = new Scene(); scene.environment=env.texture; scene.environmentIntensity=.5
    scene.add(new HemisphereLight(0xd6dade,0x060709,.12))
    // Each side receives the same grazing key; its upholstered face stays readable.
    const facing=i===2?1:-1
    const key = new DirectionalLight(0xf4f2ed,2.25); key.position.set(facing*2.8,4.3,2.1); key.castShadow=true
    key.shadow.mapSize.set(1024,1024); Object.assign(key.shadow.camera,{left:-1.5,right:1.5,top:1.6,bottom:-1.5,near:.1,far:10})
    key.shadow.bias=-.0001; key.shadow.normalBias=.003; key.shadow.radius=4; scene.add(key)
    const rim=new RectAreaLight(0xdbe0e5,1.6,2.2,3.2);rim.position.set(-facing*1.5,1.8,-1.7);rim.lookAt(0,.5,0);scene.add(rim)
    const fill=new RectAreaLight(0xdde0e2,.38,3,2);fill.position.set(0,1,3.2);fill.lookAt(0,.6,0);scene.add(fill)
    const camera=new OrthographicCamera(-1,1,1,-1,.05,15)
    if(i===1)camera.position.set(.22,2.15,3.8);else camera.position.set(i===0?-3.8:3.8,1.58,.78)
    camera.lookAt(0,.48,.03);scenes.push(scene);cameras.push(camera)
  }
  const anchorPoint=new Vector3()
  function writeAnchor(rig: Rig, key: string, local: [number,number,number], group: Group, camera: OrthographicCamera, x: number, viewportW: number) {
    anchorPoint.set(...local);group.localToWorld(anchorPoint);anchorPoint.project(camera)
    const stage=host.parentElement
    stage?.style.setProperty(`--seat-${rig.side}-${key}-x`,`${((x+(anchorPoint.x*.5+.5)*viewportW)/width*100).toFixed(3)}%`)
    stage?.style.setProperty(`--seat-${rig.side}-${key}-y`,`${((.5-anchorPoint.y*.5)*100).toFixed(3)}%`)
    return {x:((x+(anchorPoint.x*.5+.5)*viewportW)/width)*host.offsetWidth,y:(.5-anchorPoint.y*.5)*host.offsetHeight}
  }
  function requestDraw() { if(!disposed&&!lost&&!frame&&view.visible&&!document.hidden) frame=requestAnimationFrame(draw) }
  function draw(now: number) {
    frame=0
    if(disposed||lost||!view.visible||document.hidden)return
    const bounds=host.getBoundingClientRect(), w=Math.max(1,Math.round(bounds.width)),h=Math.max(1,Math.round(bounds.height))
    if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false)}
    const dt=Math.min(.05,(now-previousTime)/1000||.016);previousTime=now
    const blend=reduced.matches?1:1-Math.exp(-dt*13)
    let moving=false
    poses.forEach((pose,side)=>{for(const axis of ['position','recline'] as const){const delta=view.poses[side][axis]-pose[axis];pose[axis]=Math.abs(delta)<.0005?view.poses[side][axis]:pose[axis]+delta*blend;moving ||= Math.abs(delta)>.0005}})
    for(const rig of rigs){const pose=poses[rig.side];rig.carriage.position.z=pose.position*.16;rig.carriage.position.y=0;rig.back.rotation.x=-pose.recline}
    host.dataset.driverRecline=poses[0].recline.toFixed(3);host.dataset.passengerRecline=poses[1].recline.toFixed(3)
    host.dataset.driverPosition=poses[0].position.toFixed(3);host.dataset.passengerPosition=poses[1].position.toFixed(3)
    renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);renderer.clear()
    renderer.setScissorTest(true)
    for(let i=0;i<3;i++){
      const x=i===0?0:i===1?Math.round(width*.25):Math.round(width*.75)
      const right=i===0?Math.round(width*.25):i===1?Math.round(width*.75):width
      const viewportW=right-x,camera=cameras[i]
      const sidePose=poses[i===0?0:1]
      // Fit the full recline travel once; adjusting the backrest must never zoom.
      const halfHeight=i===1?.73:.98
      if(i!==1){const focusZ=sidePose.position*.16-.025-Math.max(0,sidePose.recline)*.23;camera.position.z=.78+focusZ;camera.lookAt(0,.48,focusZ)}
      camera.left=-halfHeight*viewportW/height;camera.right=halfHeight*viewportW/height;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix()
      renderer.setViewport(x,0,viewportW,height);renderer.setScissor(x,0,viewportW,height);renderer.render(scenes[i],camera)
      for(const rig of rigs.filter(item=>item.sceneIndex===i)){
        if(i===1){
          writeAnchor(rig,'front',[0,.23,.23],rig.carriage,camera,x,viewportW)
          writeAnchor(rig,'top',[0,.78,-.23],rig.back,camera,x,viewportW)
        }else{
          const backAnchor=writeAnchor(rig,'back',[0,.66,-.20],rig.back,camera,x,viewportW)
          const hingeAnchor=writeAnchor(rig,'hinge',[0,.19,-.12],rig.carriage,camera,x,viewportW)
          const dx=backAnchor.x-hingeAnchor.x,dy=backAnchor.y-hingeAnchor.y
          host.parentElement?.style.setProperty(`--seat-${rig.side}-back-radius`,`${Math.hypot(dx,dy).toFixed(2)}px`)
          host.parentElement?.style.setProperty(`--seat-${rig.side}-back-angle`,`${(Math.atan2(dy,dx)*180/Math.PI).toFixed(2)}deg`)
        }
      }
    }
    renderer.setScissorTest(false)
    if(moving)requestDraw()
  }
  async function load() {
    const response=await fetch(`${import.meta.env.BASE_URL}models/tesla-front-seat.glb`,{signal:abort.signal});if(!response.ok)throw Error('Seat model unavailable')
    const model=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'')
    if(disposed){release(model.scene);return}
    const tuned = new Map<Material,MeshPhysicalMaterial>(),originals = new Set<Material>(),textures = new Set<Texture>()
    model.scene.traverse(object=>{
      if(!(object instanceof Mesh))return
      object.castShadow=true;object.receiveShadow=true
      const source=object.material as Material; originals.add(source)
      Object.values(source).forEach(value=>{if(value instanceof Texture)textures.add(value)})
      let material=tuned.get(source)
      if(!material){
        const leather=['leather','insert','bolster'].includes(source.name)
        const insert=source.name==='insert', bolster=source.name==='bolster', hinge=source.name==='hinge'
        material=new MeshPhysicalMaterial({
          name:source.name,
          color:leather?(insert?0x747978:bolster?0x505655:0x6c7271):(hinge?0x272c2f:0x111518),
          roughness:leather?(insert?.86:.8):(hinge?.64:.84),
          metalness:hinge?.14:0,envMapIntensity:leather?.36:.4,
          specularIntensity:leather?.26:.32,clearcoat:0,
          sheen:leather?.12:0,sheenColor:new Color(0x838888),sheenRoughness:.92,
          vertexColors:leather,
        })
        if(leather){material.bumpMap=grain;material.bumpScale=.00016;material.roughnessMap=leatherRoughness}
        tuned.set(source,material);extras.add(material)
      }
      if(['leather','insert','bolster'].includes(source.name)){
        const geometry=object.geometry, position=geometry.getAttribute('position')
        geometry.computeBoundingBox()
        const box=geometry.boundingBox!, colors=new Float32Array(position.count*3)
        const spanX=Math.max(.001,box.max.x-box.min.x),spanY=Math.max(.001,box.max.y-box.min.y)
        for(let j=0;j<position.count;j++){
          const across=Math.abs((position.getX(j)-box.min.x)/spanX*2-1)
          const up=(position.getY(j)-box.min.y)/spanY
          const edge=Math.pow(across,6)*.16
          const contact=Math.pow(1-up,5)*.15
          const shade=1-edge-contact
          colors.set([shade,shade,shade],j*3)
        }
        geometry.setAttribute('color',new Float32BufferAttribute(colors,3))
      }
      object.material=material
    })
    originals.forEach(m=>m.dispose());textures.forEach(t=>t.dispose())
    addUpholsterySeams(model.scene)
    for(let i=0;i<4;i++){
      const side:SeatSide=i===0||i===1?0:1, sceneIndex=i===0?0:i===3?2:1
      const seat=model.scene.clone(true);seat.position.x=sceneIndex===1?(side===0?-.47:.47):0
      scenes[sceneIndex].add(seat)
      const shadow=new Mesh(new PlaneGeometry(1.25,1.15),new MeshBasicMaterial({map:contactShadow,transparent:true,depthWrite:false,opacity:.52}))
      shadow.rotation.x=-Math.PI/2;shadow.position.set(seat.position.x,-.075,.02);scenes[sceneIndex].add(shadow)
      rigs.push({carriage:seat.getObjectByName('SeatCarriage') as Group,back:seat.getObjectByName('SeatBackPivot') as Group,side,sceneIndex})
    }
    loaded=true;status('ready');requestDraw()
  }
  load().catch(error=>{if(!disposed&&error.name!=='AbortError')status('error')})
  const observer=new ResizeObserver(requestDraw);observer.observe(host)
  document.addEventListener('visibilitychange',requestDraw)
  function contextLost(event: Event){event.preventDefault();lost=true;status('error')}
  function contextRestored(){lost=false;if(loaded)status('ready');requestDraw()}
  canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored)
  return {
    update(next){const opening=!view.visible&&next.visible;view=next;if(opening){previousTime=0;poses.forEach((pose,i)=>Object.assign(pose,next.poses[i]))}requestDraw()},
    dispose(){disposed=true;abort.abort();cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',requestDraw);canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',contextRestored);scenes.forEach(release);extras.forEach(m=>m.dispose());env.dispose();grain.dispose();leatherRoughness.dispose();contactShadow.dispose();renderer.dispose();canvas.remove()},
  }
}
