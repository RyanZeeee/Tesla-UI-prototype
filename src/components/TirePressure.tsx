import tireCar from '../assets/vehicle/tire-car.svg'

interface TirePressureProps {
  pressures?: { frontLeft: number; frontRight: number; rearLeft: number; rearRight: number }
  recommendedFront?: number
  recommendedRear?: number
  unit?: string
}

const tireLabels = { frontLeft: "Front left tire", frontRight: "Front right tire", rearLeft: "Rear left tire", rearRight: "Rear right tire" }

export function TirePressure({ pressures = { frontLeft: 43, frontRight: 44, rearLeft: 44, rearRight: 44 },
  recommendedFront = 42, recommendedRear = 42, unit = 'psi' }: TirePressureProps) {
  return (
    <section className="tire-pressure dashboard-card dashboard-ui" aria-label="Tire pressure">
      <span className="tire-title">Tire pressure</span>
      <div className="tire-recommended">Recommended<br />Front : {recommendedFront} {unit}<br />Rear : {recommendedRear} {unit}</div>
      <img className="tire-car" src={tireCar} alt="Vehicle top view" draggable={false} />
      {Object.entries(pressures).map(([position, pressure]) => (
        <div key={position} className={`tire-reading tire-${position}`} aria-label={`${tireLabels[position as keyof typeof tireLabels]} ${pressure} ${unit}`}>
          {pressure} <span>{unit}</span>
        </div>
      ))}
    </section>
  )
}
