import { BackSide, BoxGeometry, Color, Mesh, NormalBlending, NotEqualStencilFunc, Scene, ShaderMaterial, Vector2, Vector3 } from 'three'
import type { CabinView } from './createCabinScene'

/** Soft, advected volume: a dense outlet opens into a translucent plume. */
export function createCabinAirflow(scene: Scene) {
  const materials: ShaderMaterial[] = []
  for (const origin of [-.48, .49]) {
    const material = new ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, side: BackSide,
      blending: NormalBlending, toneMapped: false,
      // Keep the requested wind overlay in front of the wheel; preserve the black screen.
      stencilWrite: true, stencilWriteMask: 0, stencilRef: 1, stencilFunc: NotEqualStencilFunc,
      uniforms: {
        time: { value: 0 }, strength: { value: 0 }, viewportHeight: { value: 1 },
        direction: { value: new Vector2() }, origin: { value: origin },
        boundsMin: { value: new Vector3(origin - .75, -.195, -.95) },
        boundsMax: { value: new Vector3(origin + .75, .555, .05) },
        tint: { value: new Color(0x5eafce) },
      },
      vertexShader: `
        varying vec3 worldPosition;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.);
          worldPosition = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: `
        varying vec3 worldPosition;
        uniform vec3 boundsMin, boundsMax, tint;
        uniform vec2 direction;
        uniform float origin, time, strength, viewportHeight;

        float hash(vec3 p) {
          p = fract(p * .1031);
          p += dot(p, p.yzx + 33.33);
          return fract((p.x + p.y) * p.z);
        }
        float noise(vec3 p) {
          vec3 i = floor(p), f = fract(p);
          f = f*f*(3.-2.*f);
          return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                         mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                         mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
        }
        float wisps(vec3 p) {
          return .64*noise(p)+.26*noise(p*2.03+7.1)+.1*noise(p*4.01+19.4);
        }
        void main() {
          if (strength < .001) discard;
          vec3 ray = normalize(worldPosition-cameraPosition);
          vec3 inverseRay = sign(ray)/max(abs(ray), vec3(.00001));
          vec3 t0 = (boundsMin-cameraPosition)*inverseRay;
          vec3 t1 = (boundsMax-cameraPosition)*inverseRay;
          vec3 nearSide = min(t0,t1), farSide = max(t0,t1);
          float enter = max(0.,max(nearSide.x,max(nearSide.y,nearSide.z)));
          float leave = min(farSide.x,min(farSide.y,farSide.z));
          if (leave <= enter) discard;
          float stepSize = (leave-enter)/48.;
          vec4 cloud = vec4(0.);
          for (int i=0; i<48; i++) {
            vec3 p = cameraPosition+ray*(enter+(float(i)+.5)*stepSize);
            float t = (p.z+.915)/.78;
            if (t <= 0. || t >= 1.) continue;
            float bend = t*t*(3.-2.*t);
            vec2 center = vec2(origin+direction.x*bend*.36, .215-.115*t+direction.y*bend*.18);
            vec2 radius = vec2(.105+.12*pow(t,.85), .018+.055*t);
            vec2 q = (p.xy-center)/radius;
            float radial = dot(q,q);
            if (radial > 3.5) continue;
            // Texture is carried from outlet to passenger. No periodic stripes or diagonal phase offsets.
            vec3 field = vec3(q.x*2.8, q.y*2.1, t*3.4-time*.72);
            float detail = wisps(field);
            float fine = noise(vec3(q.x*5.,q.y*2.5,t*2.6-time*.36));
            float body = exp(-radial*1.4);
            float turbulence = mix(.18,1.,smoothstep(.24,.78,detail));
            // Concentration falls continuously from the outlet, including as the volume widens.
            float concentration = exp(-t*2.6);
            float tail = 1.-smoothstep(.55,1.,t);
            float density = body*turbulence*(.78+.22*fine)*smoothstep(0.,.025,t)*concentration*tail;
            float opacity = 1.-exp(-density*strength*stepSize*19.);
            vec3 color = mix(tint,vec3(.87,.96,1.),smoothstep(0.,.9,t)*.88);
            cloud.rgb += (1.-cloud.a)*opacity*color;
            cloud.a += (1.-cloud.a)*opacity;
          }
          float border = smoothstep(0.,.16,gl_FragCoord.y/viewportHeight);
          if (cloud.a < .001) discard;
          gl_FragColor = vec4(cloud.rgb/cloud.a,cloud.a*border);
        }`,
    })
    const volume = new Mesh(new BoxGeometry(1.5, .75, 1), material)
    volume.position.set(origin, .18, -.45)
    volume.renderOrder = 10
    volume.frustumCulled = false
    scene.add(volume)
    materials.push(material)
  }
  return {
    update(state: CabinView, ready: boolean, seconds: number, viewportHeight: number) {
      materials.forEach((material, i) => {
        material.uniforms.direction.value.set(state.directions[i].x, state.directions[i].y)
        material.uniforms.time.value = seconds
        material.uniforms.strength.value = ready && state.powered ? [0, .8, 1.15, 1.55][state.level] : 0
        material.uniforms.viewportHeight.value = viewportHeight
        material.uniforms.tint.value.set(state.cooling ? 0x5eafce : 0xb7ab94)
      })
    },
  }
}
