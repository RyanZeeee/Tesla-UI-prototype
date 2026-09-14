import { useEffect, useRef, useState } from 'react'
import fallbackCar from '../assets/icons/m3.svg'
import type { VehicleScene } from '../vehicle/createVehicleScene'
import type { CargoKind } from '../vehicle/vehicleCargo'

interface VehicleModelProps {
  progress: number
  expanded: boolean
}

export function VehicleModel({ progress, expanded }: VehicleModelProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<VehicleScene | null>(null)
  const viewRef = useRef({ progress, expanded })
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const cargoAnchors = useRef<Record<CargoKind, HTMLDivElement | null>>({ front: null, rear: null, charge: null })
  const [cargoOpen, setCargoOpen] = useState({ front: false, rear: false, charge: false })
  const interactive = expanded && progress >= 0.9999 && status === 'ready'
  const width = 580 + progress * 1340

  useEffect(() => {
    let disposed = false
    let scene: VehicleScene | undefined
    const host = hostRef.current
    if (!host) return

    // Load the renderer separately so the rest of the dashboard can appear first.
    import('../vehicle/createVehicleScene').then(({ createVehicleScene }) => {
      if (disposed) return
      scene = createVehicleScene(host, nextStatus => {
        if (!disposed) setStatus(nextStatus)
      }, cargoAnchors.current)
      sceneRef.current = scene
      scene.updateView(viewRef.current.progress, viewRef.current.expanded)
    }).catch(() => {
      if (!disposed) setStatus('error')
    })

    return () => {
      disposed = true
      sceneRef.current = null
      scene?.dispose()
    }
  }, [attempt])

  useEffect(() => {
    viewRef.current = { progress, expanded }
    sceneRef.current?.updateView(progress, expanded)
  }, [progress, expanded])

  function toggleCargo(kind: CargoKind) {
    const opened = sceneRef.current?.toggleCargo(kind)
    if (opened !== undefined) setCargoOpen(current => ({ ...current, [kind]: opened }))
  }

  return (
    <div className="vehicle-model" data-model-status={status} style={{ width, height: 1080, top: -235, left: (580 - width) / 2 }}>
      {status !== 'ready' && (
        <div className="vehicle-model-placeholder">
          <img src={fallbackCar} alt="" aria-hidden="true" />
          <div role="status" className="vehicle-model-message">
            <span>{status === 'loading' ? "Loading 3D vehicle…" : "3D vehicle unavailable"}</span>
            {status === 'error' && <button type="button" onClick={() => { setStatus('loading'); setCargoOpen({ front: false, rear: false, charge: false }); setAttempt(value => value + 1) }}>Reload</button>}
          </div>
        </div>
      )}
      <div ref={hostRef} className="vehicle-model-canvas" style={{ opacity: status === 'ready' ? 1 : 0, pointerEvents: interactive ? 'auto' : 'none' }} />
      <div className="vehicle-cargo-controls" hidden={status !== 'ready'}>
        {(['front', 'rear', 'charge'] as const).map(kind => {
          const label = kind === 'front' ? " frunk" : kind === 'rear' ? " trunk" : " charge port"
          return (
            <div key={kind} ref={element => { cargoAnchors.current[kind] = element }} className="vehicle-cargo-callout" data-cargo={kind}>
              <button type="button" className="vehicle-cargo-button" aria-label={`${cargoOpen[kind] ? "Close" : "Open"}${label}`} aria-expanded={cargoOpen[kind]}
                disabled={status !== 'ready' || (progress > 0 && progress < 0.9999)} onClick={() => toggleCargo(kind)}>
                <span>{cargoOpen[kind] ? "Close" : "Open"}</span>
              </button>
              <span className="vehicle-cargo-leader" aria-hidden="true" />
              <span className="vehicle-cargo-side-leader" aria-hidden="true" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
