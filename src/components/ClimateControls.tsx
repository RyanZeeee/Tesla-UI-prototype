import { useEffect, useRef, useState } from 'react'
import { DashboardIcon, IconButton } from './DashboardIcon'

interface TemperatureControlProps {
  label: string
  value: number
  onChange: (value: number) => void
  onOpen?: () => void
  min?: number
  max?: number
  step?: number
}

export function TemperatureControl({ label, value, onChange, onOpen, min = 15, max = 28, step = 0.5 }: TemperatureControlProps) {
  return (
    <div className="temperature-control dashboard-ui" role="group" aria-label={label}>
      <IconButton label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>
        <DashboardIcon name="chevronRight" size={24} style={{ transform: 'rotate(180deg)' }} />
      </IconButton>
      <IconButton label={`${label}, open climate controls`} className="temperature-value" onClick={onOpen}>
        {Number.isInteger(value) ? value : value.toFixed(1)}<span className="temperature-degree">°</span>
      </IconButton>
      <IconButton label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>
        <DashboardIcon name="chevronRight" size={24} />
      </IconButton>
    </div>
  )
}

interface FanControlProps {
  mode?: string
  level?: number
  onClick?: () => void
}

export function FanControl({ mode = 'MANUAL', level, onClick }: FanControlProps) {
  return (
    <IconButton label={level === undefined ? `Fan speed ${mode}` : `Fan speed ${level} ${mode}`} className="fan-control dashboard-ui" onClick={onClick}>
      <DashboardIcon name="fan" />
      <span>{level === undefined ? mode : `${level} · ${mode}`}</span>
    </IconButton>
  )
}

interface VolumeControlProps {
  value: number
  onChange: (value: number) => void
}

export function VolumeControl({ value, onChange }: VolumeControlProps) {
  const previousVolume = useRef(65)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const slider = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    slider.current?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.querySelector('button')?.focus() }
    }
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('keydown', escape, true)
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape, true) }
  }, [open])
  const toggleMute = () => {
    if (value > 0) { previousVolume.current = value; onChange(0) }
    else onChange(previousVolume.current)
  }
  const icon = value === 0 ? 'speakerMuted' : value <= 33 ? 'speakerLow' : value <= 70 ? 'speakerMedium' : 'speakerHigh'
  return (
    <div ref={root} className="volume-control dashboard-ui" role="group" aria-label="Volume">
      <IconButton label="Increase volume" disabled={value >= 100} onClick={() => onChange(Math.min(100, value + 5))}>
        <DashboardIcon name="chevronUp" size={24} />
      </IconButton>
      <div ref={trigger} className="volume-trigger"><IconButton label="Adjust volume" aria-expanded={open} aria-haspopup="dialog" title={`Volume ${value}%`} className="volume-value" onClick={() => setOpen(current => !current)}>
        <DashboardIcon name={icon} size={48} />
      </IconButton></div>
      {open && <div className="volume-popover" role="dialog" aria-label="Adjust volume">
        <header><span>Volume</span><output aria-live="polite">{value}%</output></header>
        <div className="volume-slider-row"><IconButton label={value === 0 ? 'Unmute' : 'Mute'} aria-pressed={value === 0} onClick={toggleMute}><DashboardIcon name={icon} size={30} /></IconButton>
          <input ref={slider} aria-label="Volume level" type="range" min="0" max="100" step="1" value={value} onChange={event => onChange(Number(event.target.value))} style={{ background: `linear-gradient(to right, #d1d9e4 ${value}%, #464c55 ${value}%)` }} />
        </div>
      </div>}
      <IconButton label="Decrease volume" disabled={value <= 0} onClick={() => onChange(Math.max(0, value - 5))}>
        <DashboardIcon name="chevronDown" size={24} />
      </IconButton>
    </div>
  )
}
