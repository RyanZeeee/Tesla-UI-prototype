interface SpeedCardProps {
  gear?: 'P' | 'R' | 'N' | 'D'
  speed?: number
  batteryPercent?: number
  power?: number
}

export function SpeedCard({ gear = 'P', speed = 0, batteryPercent = 100, power = 0 }: SpeedCardProps) {
  const battery = Math.max(0, Math.min(100, batteryPercent))
  const powerPosition = Math.max(-1, Math.min(1, power))
  return (
    <section className="speed-card dashboard-ui" aria-label="Vehicle driving status">
      <div className="speed-value" aria-label={gear === 'P' ? "Parked" : `Speed ${speed} km/h`}>{gear === 'P' ? 'P' : speed}</div>
      {gear !== 'P' && <span className="speed-unit">km/h</span>}
      <div className="gear-indicator" aria-label={`Current gear ${gear}`}>
        {(['P', 'R', 'N', 'D'] as const).map(item => <span key={item} className={item === gear ? 'is-active' : ''}>{item}</span>)}
      </div>
      <div className="battery-indicator" aria-label={`Battery ${battery}%`}>
        <span>{battery}%</span>
        <div className="battery-shell"><div className="battery-fill" style={{ width: `${battery}%` }} /></div>
      </div>
      <div className="power-track"><div className="power-marker" style={{ left: `calc(${50 + powerPosition * 46}% - 20.5px)` }} /></div>
    </section>
  )
}
