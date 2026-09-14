import { VehicleModel } from './VehicleModel'
import '../vehicle/vehicle.css'

interface CarCardProps {
  vizWidth: number
  expanded?: boolean
}

export function CarCard({ vizWidth, expanded = vizWidth >= 1920 }: CarCardProps) {
  const progress = Math.max(0, Math.min(1, (vizWidth - 580) / (1920 - 580)))

  return (
    <div
      style={{
        width: 580,
        height: 630,
        position: 'relative',
      }}
    >
      <VehicleModel progress={progress} expanded={expanded} />
    </div>
  )
}
