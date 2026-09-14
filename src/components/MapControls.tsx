import { DashboardIcon, IconButton } from './DashboardIcon'

interface NavigationEntryProps {
  label?: string
  onClick?: () => void
}

export function NavigationEntry({ label = "Navigate", onClick }: NavigationEntryProps) {
  return (
    <button type="button" className="navigation-entry dashboard-button dashboard-ui" onClick={onClick}>
      <DashboardIcon name="navigation" size={24} /><span>{label}</span><DashboardIcon name="chevronRight" size={24} />
    </button>
  )
}

interface MapToolbarProps {
  heading?: string
  zoom: number
  minZoom?: number
  maxZoom?: number
  chargingSelected?: boolean
  settingsSelected?: boolean
  onZoomChange: (zoom: number) => void
  onReset: () => void
  onChargingClick?: () => void
  onSettingsClick?: () => void
}

export function MapToolbar({ heading = 'N', zoom, minZoom = 0.75, maxZoom = 2.5, chargingSelected = false, settingsSelected = false,
  onZoomChange, onReset, onChargingClick, onSettingsClick }: MapToolbarProps) {
  return (
    <div className="map-toolbar dashboard-ui" role="group" aria-label="Map tools">
      <IconButton label="Orient map north" className="map-round map-compass" onClick={onReset}>
        <span className="compass-disc">{heading}</span>
      </IconButton>
      <div className="map-zoom">
        <IconButton label="Zoom in" disabled={zoom >= maxZoom} onClick={() => onZoomChange(Math.min(maxZoom, zoom + 0.25))}>
          <span className="zoom-symbol zoom-plus" />
        </IconButton>
        <IconButton label="Zoom out" disabled={zoom <= minZoom} onClick={() => onZoomChange(Math.max(minZoom, zoom - 0.25))}>
          <span className="zoom-symbol" />
        </IconButton>
      </div>
      <IconButton label="Charging stations" aria-pressed={chargingSelected} className="map-round map-charging" onClick={onChargingClick}>
        <span className="map-charging-disc"><DashboardIcon name="charging" /></span>
      </IconButton>
      <IconButton label="Map settings" aria-expanded={settingsSelected} className="map-round map-settings" onClick={onSettingsClick}><DashboardIcon name="mapSettings" /></IconButton>
    </div>
  )
}
