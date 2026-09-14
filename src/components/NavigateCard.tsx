import { DashboardIcon } from './DashboardIcon'
import { NavigationIcon } from '../navigation/NavigationIcon'

interface NavigateCardProps {
  label?: string
  homeLabel?: string
  workLabel?: string
  onNavigate?: () => void
  onHome?: () => void
  onWork?: () => void
}

export function NavigateCard({ label = 'Navigate', homeLabel = 'Home', workLabel = 'Work', onNavigate, onHome, onWork }: NavigateCardProps) {
  return (
    <section className="navigate-card dashboard-card dashboard-ui" aria-label="Quick navigation">
      <button type="button" className="dashboard-button navigate-card-main" onClick={onNavigate}>
        <span className="navigate-action-content"><NavigationIcon name="search" size={25} /><span className="navigate-action-label">{label}</span><DashboardIcon name="chevronRight" size={18} /></span>
      </button>
      <span className="navigate-card-divider" aria-hidden="true" />
      <div className="saved-destinations">
        <button type="button" className="dashboard-button" onClick={onHome}><span className="navigate-action-content"><NavigationIcon name="home" size={22} /><span>{homeLabel}</span></span></button>
        <span className="saved-destinations-divider" aria-hidden="true" />
        <button type="button" className="dashboard-button" onClick={onWork}><span className="navigate-action-content"><NavigationIcon name="work" size={22} /><span>{workLabel}</span></span></button>
      </div>
    </section>
  )
}
