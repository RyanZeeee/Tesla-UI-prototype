import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { CabinModel } from './CabinModel'
import './climate.css'

interface Props {
  visible: boolean; driver: number; passenger: number; level: number; powered: boolean
  onDriver: (value: number) => void; onPassenger: (value: number) => void
  onLevel: (value: number) => void; onPower: () => void; onClose: () => void
}
export function ClimatePanel({ visible, driver, passenger, level, powered, onDriver, onPassenger, onLevel, onPower, onClose }: Props) {
  const panel = useRef<HTMLElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!visible) return
    const previous = document.activeElement as HTMLElement | null
    closeButton.current?.focus({ preventScroll: true })
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [visible])
  useEffect(() => {
    if (!visible) return
    function dismissOutside(event: MouseEvent) {
      if (!(event.target instanceof Node) || panel.current?.contains(event.target)) return
      // Dock shortcuts switch panels or adjust the currently open climate controls.
      if (event.target instanceof Element && event.target.closest('[data-dock-control="vehicle"], [data-dock-control="driverTemperature"], [data-dock-control="passengerTemperature"], [data-dock-control="driverSeat"], [data-dock-control="passengerSeat"]')) return
      // Dismiss on any outside click, including the bottom bar, without activating what is behind it.
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('click', dismissOutside, true)
    return () => document.removeEventListener('click', dismissOutside, true)
  }, [visible, onClose])
  const [directions, setDirections] = useState<[{ x: number; y: number }, { x: number; y: number }]>([{ x: 0, y: 0 }, { x: 0, y: 0 }])
  const [ac, setAc] = useState(true)
  const [recirculate, setRecirculate] = useState(false)
  const clamp = (value: number) => Math.max(-1, Math.min(1, value))
  function steer(event: PointerEvent<HTMLDivElement>, side: number) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId) || !powered) return
    const rect = event.currentTarget.getBoundingClientRect()
    const direction = { x: clamp((event.clientX - rect.left) / rect.width * 2 - 1), y: clamp(1 - (event.clientY - rect.top) / rect.height * 2) }
    setDirections(current => side === 0 ? [direction, current[1]] : [current[0], direction])
  }
  return <div className="climate-drawer-viewport">
  <section ref={panel} data-open={visible} aria-hidden={!visible} inert={!visible} className="climate-panel dashboard-ui" role="region" aria-label="Climate controls" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } }}>
    <header className="climate-header">
      <div className="climate-heading"><span>Climate</span><span className="climate-front">Front</span></div>
      <div className="climate-header-right"><small>Inside <b>24°</b><i />Outside <b>17°</b></small><button ref={closeButton} onClick={onClose} aria-label="Close climate controls"><svg viewBox="0 0 24 24" width="28" height="28"><path d="m5 8 7 7 7-7" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg></button></div>
    </header>
    <div className="climate-cabin">
      <CabinModel visible={visible} powered={powered} level={level} cooling={ac} directions={directions} />
      {[0, 1].map(side => <div key={side} className={`climate-vent vent-${side}`} role="group" tabIndex={powered ? 0 : -1}
        aria-label={`${side === 0 ? "Driver" : "Passenger"} airflow direction; drag or use arrow keys to adjust`} aria-disabled={!powered}
        data-direction-x={directions[side].x.toFixed(2)} data-direction-y={directions[side].y.toFixed(2)}
        onPointerDown={event => { if (!powered || !event.isPrimary || event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus({ preventScroll: true }); steer(event, side) }}
        onPointerMove={event => steer(event, side)} onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }}
        onKeyDown={event => {
          if (!powered || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return
          event.preventDefault()
          setDirections(current => {
            const direction = event.key === 'Home' ? { x: 0, y: 0 } : {
              x: clamp(current[side].x + (event.key === 'ArrowLeft' ? -.1 : event.key === 'ArrowRight' ? .1 : 0)),
              y: clamp(current[side].y + (event.key === 'ArrowDown' ? -.1 : event.key === 'ArrowUp' ? .1 : 0)),
            }
            return side === 0 ? [direction, current[1]] : [current[0], direction]
          })
        }}><span className="vent-focus" style={{ left: `${50 + directions[side].x * 25}%`, top: `${50 - directions[side].y * 25}%` }} /></div>)}
    </div>
    <div className="climate-control-deck">
    <div className="climate-adjustments">
      {[0, 1].map(side => <div className={`climate-zone zone-${side}`} key={side} role="group" aria-label={side === 0 ? "Driver climate temperature" : "Passenger climate temperature"}>
        <div><button aria-label={`Decrease ${side === 0 ? "Driver" : "Passenger"} temperature`} disabled={(side === 0 ? driver : passenger) <= 15} onClick={() => (side === 0 ? onDriver : onPassenger)(Math.max(15, (side === 0 ? driver : passenger) - .5))}>−</button>
          <output>{side === 0 ? driver : passenger}<sup>°</sup></output>
          <button aria-label={`Increase ${side === 0 ? "Driver" : "Passenger"} temperature`} disabled={(side === 0 ? driver : passenger) >= 28} onClick={() => (side === 0 ? onDriver : onPassenger)(Math.min(28, (side === 0 ? driver : passenger) + .5))}>＋</button>
        </div>
      </div>)}
      <div className="climate-center">
        <div className="climate-levels" role="group" aria-label="Fan speed level">{["LOW", "MED", "HIGH"].map((label, i) => <button key={label} aria-pressed={powered && level === i + 1} onClick={() => onLevel(i + 1)}><span className="climate-level-bars" aria-hidden="true">{[0, 1, 2].map(bar => <i key={bar} className={bar <= i ? 'filled' : ''} />)}</span>{label}</button>)}</div>
      </div>
    </div>
    <div className="climate-options" role="group" aria-label="Climate switches">
      <button aria-label={powered ? "Turn climate off" : "Turn climate on"} aria-pressed={powered} onClick={onPower}>Climate</button>
      <button aria-pressed={ac} onClick={() => setAc(!ac)}>A/C</button>
      <button aria-pressed={recirculate} onClick={() => setRecirculate(!recirculate)}>Recirculate</button>
    </div>
    </div>
  </section>
  </div>
}
