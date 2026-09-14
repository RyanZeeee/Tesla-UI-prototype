import { Box3, Color, Material, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Texture } from 'three'

export function applyVehicleMaterials(root: Object3D, environment: Texture | null) {
  const paint = new MeshPhysicalMaterial({
    name: 'Pearl white clearcoat', color: 0xdfe2df, metalness: 0.08, roughness: 0.25,
    clearcoat: 0.8, clearcoatRoughness: 0.18, ior: 1.5, specularIntensity: 0.65,
  })
  const glass = new MeshPhysicalMaterial({
    name: 'Smoked automotive glass', color: 0x070c13, metalness: 0,
    roughness: 0.14, clearcoat: 0.5, clearcoatRoughness: 0.12, ior: 1.5,
    // Assign explicitly so Scene.environmentIntensity does not override the glass's dimmer reflection.
    specularIntensity: 0.45, envMap: environment, envMapIntensity: 0.18,
  })
  const sourceMaterials = new Set<Material>()
  const retainedMaterials = new Set<Material>()
  const tuned = new Set<Material>()
  const lampMaterials = new Map<string, MeshStandardMaterial>()
  root.updateWorldMatrix(true, true)
  root.traverse(object => {
    if (!(object instanceof Mesh)) return
    object.castShadow = true
    object.receiveShadow = true
    const bounds = new Box3().setFromObject(object)
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    const next = materials.map(material => {
      sourceMaterials.add(material)
      if (material.name === 'Paint') return paint
      if (material.name.startsWith('glass.')) return glass
      // This GLB shares a lamp atlas between front/rear lenses and cabin parts.
      // Classify the normalized mesh location before assigning emission to avoid lighting the interior.
      if (material instanceof MeshStandardMaterial) {
        const lamp = ['breaklight_l', 'right_rear_light', 'pantulans.0'].includes(material.name)
        const front = lamp && bounds.max.z < -1.7 && bounds.min.y > 0.55
        const rear = lamp && bounds.min.z > 1.75 && bounds.min.y > 0.7
        const frontCover = material.name === 'tembus_red.0' && bounds.max.z < -1.7
        const rearCover = material.name === 'tembus_red.0' && bounds.min.z > 1.7
        if (front || rear || frontCover || rearCover) {
          const kind = front ? 'headlight' : rear ? 'tail-light' : frontCover ? 'clear-lens' : 'red-lens'
          const id = `${material.uuid}:${kind}`
          let lens = lampMaterials.get(id)
          if (!lens) {
            lens = material.clone()
            lens.name = kind
            if (frontCover || rearCover) {
              lens.color.set(frontCover ? 0xffffff : 0x5e1214)
              lens.roughness = frontCover ? 0.08 : 0.24
              lens.metalness = 0
              lens.opacity = frontCover ? 0.12 : 0.18
              lens.transparent = true
              lens.depthWrite = false
            } else {
              lens.color.set(front ? 0xdce9ff : 0x999999)
              lens.emissive.set(front ? 0xdceaff : 0xff0000)
              lens.emissiveIntensity = front ? 9 : material.map ? 8 : 0
              lens.emissiveMap = front ? null : material.map
              if (rear && material.map) {
                // Keep the original lamp mesh/UV layout: only its red LED parts emit.
                // Clear reverse-light strips and the dark inner chamber stay unlit.
                lens.onBeforeCompile = shader => {
                  shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
                    #include <emissivemap_fragment>
                    #ifdef USE_EMISSIVEMAP
                      float redLED = smoothstep(0.1, 0.65, emissiveColor.r - max(emissiveColor.g, emissiveColor.b));
                      totalEmissiveRadiance *= redLED;
                    #endif
                  `)
                }
                lens.customProgramCacheKey = () => 'original-tail-led-atlas-v1'
              }
              lens.roughness = 0.16
              lens.metalness = 0.05
            }
            lampMaterials.set(id, lens)
          }
          object.castShadow = false
          return lens
        }
      }
      if (!(material instanceof MeshStandardMaterial) || tuned.has(material)) return material
      tuned.add(material)
      material.emissiveIntensity = 0.12
      if (material.name === 'wheels.6') {
        material.color = new Color(0x414750)
        material.metalness = 0.85
        material.roughness = 0.3
      } else if (['wheels.2', 'wheels.3'].includes(material.name)) {
        material.color = new Color(0x999999)
        material.metalness = 0
        material.roughness = 0.92
        material.bumpMap = material.map
        material.bumpScale = 0.012
      } else if (material.name === 'wheels.4' || material.name.startsWith('hub_')) {
        material.color = new Color(0x858a91)
        material.metalness = 0.65
        material.roughness = 0.4
      } else if (material.name === 'chassis.0') {
        material.color = new Color(0x171a20)
        material.metalness = 0.1
        material.roughness = 0.8
      } else if (material.name === 'aluminium_light.0' || material.name === 'back_chrome_light.0') {
        material.color = new Color(0x818792)
        material.metalness = 0.9
        material.roughness = 0.2
      }
      material.needsUpdate = true
      return material
    })
    next.forEach(material => retainedMaterials.add(material))
    object.material = Array.isArray(object.material) ? next : next[0]
  })
  sourceMaterials.forEach(material => { if (!retainedMaterials.has(material)) material.dispose() })
}
