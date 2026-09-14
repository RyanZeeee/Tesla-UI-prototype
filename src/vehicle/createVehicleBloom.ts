import { Color, DoubleSide, Material, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

export function createVehicleBloom(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) {
  const composer = new EffectComposer(renderer)
  composer.renderTarget1.samples = 4
  composer.renderTarget2.samples = 4
  const render = new RenderPass(scene, camera)
  const glowComposer = new EffectComposer(renderer)
  glowComposer.renderToScreen = false
  glowComposer.setPixelRatio(renderer.getPixelRatio())
  const glowRender = new RenderPass(scene, camera)
  const bloom = new UnrealBloomPass(new Vector2(580, 1080), 0.14, 0, 2)
  // Keep glare close to the lamp edge; wide bloom mips would wash out the dark chambers.
  bloom.compositeMaterial.uniforms.bloomFactors.value = [1, 0.06, 0, 0, 0]
  // A red LED has low luminance despite its high radiance. Use the brightest channel
  // so both red tail lamps and white headlights generate glare above the paint's brightness.
  bloom.materialHighPassFilter.fragmentShader = bloom.materialHighPassFilter.fragmentShader.replace(
    'float v = luminance( texel.xyz );', 'float v = max(texel.r, max(texel.g, texel.b));',
  )
  const output = new OutputPass()
  output.material.fragmentShader = output.material.fragmentShader.replace(
    'gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );',
    `vec3 hdr = gl_FragColor.rgb;
    vec3 mapped = ACESFilmicToneMapping(hdr);
    float redLED = smoothstep(0.25, 2.0, hdr.r) * (1.0 - smoothstep(0.08, 0.35, (hdr.g + hdr.b) / max(hdr.r, 0.0001)));
    // Preserve the saturated red light band instead of clipping it to orange under ACES.
    gl_FragColor.rgb = mix(mapped, hdr / (1.0 + max(hdr.r, max(hdr.g, hdr.b))), redLED);`,
  )
  composer.addPass(render)
  const composite = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, glowTexture: { value: null } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform sampler2D glowTexture; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb + texture2D(glowTexture, vUv).rgb, 1.0); }',
  })
  // ShaderPass clones its uniforms; render-target textures must be assigned afterwards.
  composite.uniforms.glowTexture.value = bloom.renderTargetsHorizontal[0].texture
  composer.addPass(composite)
  composer.addPass(output)
  glowComposer.addPass(glowRender)
  glowComposer.addPass(bloom)
  const occluder = new MeshBasicMaterial({ color: 0x000000, side: DoubleSide })
  const isEmitter = (material: Material) => material.name === 'headlight' || material.name === 'tail-light'
  const clearColor = new Color()

  return {
    setSize(width: number, height: number) { composer.setSize(width, height); glowComposer.setSize(width, height) },
    render() {
      const saved: Array<{ mesh: Mesh; material: Material | Material[]; visible: boolean; before: Mesh['onBeforeRender'] }> = []
      scene.traverse(object => {
        if (!(object instanceof Mesh)) return
        saved.push({ mesh: object, material: object.material, visible: object.visible, before: object.onBeforeRender })
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        if (object.name === 'Studio backdrop' || materials.some(material => material.name === 'clear-lens' || material.name === 'red-lens')) {
          object.visible = false
        } else {
          object.material = Array.isArray(object.material) ? materials.map(material => isEmitter(material) ? material : occluder) : isEmitter(materials[0]) ? materials[0] : occluder
          // The regular render retains reflections. The glare mask only needs floor occlusion.
          if ('isReflector' in object) object.onBeforeRender = () => {}
        }
      })
      renderer.getClearColor(clearColor)
      const clearAlpha = renderer.getClearAlpha()
      const shadowAutoUpdate = renderer.shadowMap.autoUpdate
      renderer.setClearColor(0x000000, 1)
      renderer.shadowMap.autoUpdate = false
      try { glowComposer.render() } finally {
        saved.forEach(({ mesh, material, visible, before }) => { mesh.material = material; mesh.visible = visible; mesh.onBeforeRender = before })
        renderer.setClearColor(clearColor, clearAlpha)
        renderer.shadowMap.autoUpdate = shadowAutoUpdate
      }
      composer.render()
    },
    dispose() {
      render.dispose(); glowRender.dispose(); bloom.dispose(); composite.dispose(); output.dispose()
      composer.dispose(); glowComposer.dispose(); occluder.dispose()
    },
  }
}
