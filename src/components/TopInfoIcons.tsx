import { DashboardIcon } from './DashboardIcon'

interface TopInfoIconsProps {
  tireWarning?: boolean
  headlightsOn?: boolean
}

export function TopInfoIcons({ tireWarning = true, headlightsOn = true }: TopInfoIconsProps) {
  return (
    <div className="top-info dashboard-ui" aria-label="Vehicle alerts">
      {tireWarning && <span className="tire-warning" role="img" aria-label="Tire pressure warning"><DashboardIcon name="tireWarning" /></span>}
      {headlightsOn && <span className="headlights-status" role="img" aria-label="Low beams on"><DashboardIcon name="headlights" /></span>}
    </div>
  )
}
