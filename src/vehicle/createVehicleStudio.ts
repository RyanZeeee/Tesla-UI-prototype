import {
  Color, DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial, PlaneGeometry,
  PMREMGenerator, Scene, ShaderMaterial, ShadowMaterial, Vector2, WebGLRenderer,
} from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'

/** A procedural studio: broad softboxes for the paint, plus a live satin-floor reflection. */
export function createVehicleStudio(renderer: WebGLRenderer, scene: Scene) {
  const environment = new Scene()
  environment.background = new Color(0x151a22)
  function softbox(position: [number, number, number], width: number, height: number, color: number, intensity: number) {
    const panel = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({
      color: new Color(color).multiplyScalar(intensity), toneMapped: false,
    }))
    panel.position.set(...position)
    panel.lookAt(0, 0.6, 0)
    environment.add(panel)
  }
  softbox([-3, 6, -1], 8, 4, 0xfff9ef, 4)
  softbox([4, 3.5, 1], 2.2, 7, 0xdce7ff, 2.8)
  softbox([-6, 2.8, -4], 5, 2.5, 0xffffff, 2)
  softbox([1, 4, -5], 7, 0.8, 0xf2f5ff, 3)
  const pmrem = new PMREMGenerator(renderer)
  const environmentMap = pmrem.fromScene(environment, 0.06)
  environment.children.forEach(panel => {
    if (panel instanceof Mesh) { panel.geometry.dispose(); (panel.material as MeshBasicMaterial).dispose() }
  })
  pmrem.dispose()
  scene.environment = environmentMap.texture
  scene.environmentIntensity = 0.85

  const ambient = new HemisphereLight(0xdde4f1, 0x111318, 0.35)
  const key = new DirectionalLight(0xfffaf2, 1.25)
  key.position.set(-3.5, 6, -4)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, far: 20 })
  key.shadow.normalBias = 0.018
  key.shadow.bias = -0.00015
  key.shadow.radius = 4
  const rim = new DirectionalLight(0xdbe5fa, 0.7)
  rim.position.set(3, 3, 4)
  scene.add(ambient, key, rim)

  const backdropMaterial = new ShaderMaterial({
    depthWrite: false, depthTest: false,
    uniforms: { strength: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }
    `,
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      uniform float strength;
      void main() {
        vec2 p = (vUv - vec2(0.53, 0.56)) / vec2(0.7, 0.6);
        float wash = exp(-dot(p, p) * 2.0) * strength;
        gl_FragColor = vec4(vec3(0.0048) + vec3(0.004, 0.006, 0.011) * wash, 1.0);
      }
    `,
  })
  const backdrop = new Mesh(new PlaneGeometry(2, 2), backdropMaterial)
  backdrop.name = 'Studio backdrop'
  backdrop.frustumCulled = false
  backdrop.renderOrder = -100
  scene.add(backdrop)

  const floor = new Reflector(new PlaneGeometry(100, 100), {
    textureWidth: 1024, textureHeight: 512, multisample: 0, clipBias: 0.001,
    shader: {
      name: 'VehicleSatinFloor',
      uniforms: {
        color: { value: new Color(0x11141a) }, tDiffuse: { value: null }, textureMatrix: { value: null },
        texel: { value: new Vector2(1 / 1024, 1 / 512) }, strength: { value: 0 },
      },
      vertexShader: /* glsl */`
        uniform mat4 textureMatrix;
        varying vec4 vReflection;
        varying vec3 vWorld;
        void main() {
          vReflection = textureMatrix * vec4(position, 1.0);
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform vec2 texel;
        uniform float strength;
        varying vec4 vReflection;
        varying vec3 vWorld;
        void main() {
          vec2 uv = vReflection.xy / vReflection.w;
          vec2 blur = texel * 2.5;
          vec3 reflected = texture2D(tDiffuse, uv).rgb * 0.28;
          reflected += texture2D(tDiffuse, uv + vec2(blur.x, 0.0)).rgb * 0.12;
          reflected += texture2D(tDiffuse, uv - vec2(blur.x, 0.0)).rgb * 0.12;
          reflected += texture2D(tDiffuse, uv + vec2(0.0, blur.y)).rgb * 0.12;
          reflected += texture2D(tDiffuse, uv - vec2(0.0, blur.y)).rgb * 0.12;
          reflected += texture2D(tDiffuse, uv + blur).rgb * 0.06;
          reflected += texture2D(tDiffuse, uv - blur).rgb * 0.06;
          reflected += texture2D(tDiffuse, uv + vec2(blur.x, -blur.y)).rgb * 0.06;
          reflected += texture2D(tDiffuse, uv + vec2(-blur.x, blur.y)).rgb * 0.06;

          vec2 p = vWorld.xz;
          float pool = exp(-dot((p - vec2(-2.4, -0.5)) / vec2(8.0, 10.0), (p - vec2(-2.4, -0.5)) / vec2(8.0, 10.0)));
          float contact = exp(-pow(abs(p.x) / 0.9, 4.0) - pow(abs(p.y) / 1.95, 4.0));
          float edge = 1.0 - smoothstep(12.0, 40.0, length(p));
          float reflectedFade = 1.0 - smoothstep(2.5, 7.0, length(p));
          vec3 base = mix(vec3(0.005, 0.006, 0.008), vec3(0.022, 0.026, 0.034), pool);
          base *= 1.0 - contact * 0.92;
          // The two low beams widen and fade across the floor in front of the car (-Z).
          float forward = -p.y - 1.95;
          float beamWidth = 0.18 + max(forward, 0.0) * 0.24;
          vec2 beamOffsets = vec2(p.x - 0.68, p.x + 0.68) / beamWidth;
          float beams = exp(-beamOffsets.x * beamOffsets.x) + exp(-beamOffsets.y * beamOffsets.y);
          beams *= smoothstep(0.0, 0.85, forward) * (1.0 - smoothstep(mix(1.8, 2.5, strength), mix(5.2, 8.0, strength), forward));
          vec3 result = mix(vec3(0.0048), base + reflected * 0.07 * reflectedFade, strength) + vec3(0.028, 0.035, 0.046) * beams;
          gl_FragColor = vec4(result, edge);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    },
  })
  const floorMaterial = floor.material as ShaderMaterial
  floorMaterial.transparent = true
  floorMaterial.depthWrite = false
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.018
  floor.renderOrder = -2
  const shadow = new Mesh(new PlaneGeometry(100, 100), new ShadowMaterial({ opacity: 0.42, depthWrite: false }))
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = -0.01
  shadow.receiveShadow = true
  shadow.renderOrder = -1
  scene.add(floor, shadow)

  return {
    update(progress: number, width: number, height: number) {
      backdropMaterial.uniforms.strength.value = progress
      floor.visible = true
      floorMaterial.uniforms.strength.value = progress
      // A bounded reflection buffer; no additional frames are requested while idle.
      const reflectionWidth = Math.min(1024, Math.max(256, width))
      const reflectionHeight = Math.max(128, Math.round(reflectionWidth * height / width))
      const buffer = floor.getRenderTarget()
      if (buffer.width !== reflectionWidth || buffer.height !== reflectionHeight) {
        buffer.setSize(reflectionWidth, reflectionHeight)
        floorMaterial.uniforms.texel.value.set(1 / reflectionWidth, 1 / reflectionHeight)
      }
    },
    dispose() {
      // Scene traversal owns geometry/material disposal; these resources are held outside it.
      floor.getRenderTarget().dispose()
      environmentMap.dispose()
      key.shadow.dispose()
    },
  }
}
