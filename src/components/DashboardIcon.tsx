import type { ButtonHTMLAttributes, CSSProperties } from 'react'
import headlights from '../assets/icons/controls/headlights.svg'
import tireWarning from '../assets/icons/controls/tire-warning.svg'
import chevronUp from '../assets/icons/controls/chevron-up.svg'
import chevronDown from '../assets/icons/controls/chevron-down.svg'
import chevronRight from '../assets/icons/controls/chevron-right.svg'
import fan from '../assets/icons/controls/fan.svg'
import speakerMuted from '../assets/icons/controls/speaker-muted.svg'
import speakerLow from '../assets/icons/controls/speaker-low.svg'
import speakerMedium from '../assets/icons/controls/speaker-medium.svg'
import speakerHigh from '../assets/icons/controls/speaker-high.svg'
import navigation from '../assets/icons/controls/navigation.svg'
import previous from '../assets/icons/controls/previous.svg'
import pause from '../assets/icons/controls/pause.svg'
import next from '../assets/icons/controls/next.svg'
import search from '../assets/icons/controls/search.svg'
import collapse from '../assets/icons/controls/collapse.svg'
import charging from '../assets/icons/controls/charging.svg'
import mapSettings from '../assets/icons/controls/map-settings.svg'

const icons = {
  headlights, tireWarning, chevronUp, chevronDown, chevronRight, fan,
  speakerMuted, speakerLow, speakerMedium, speakerHigh, navigation,
  previous, pause, next, search, collapse, charging, mapSettings,
}

interface DashboardIconProps {
  name: keyof typeof icons
  size?: number
  style?: CSSProperties
}

/** Assets contain only icon geometry, never labels or control backgrounds. */
export function DashboardIcon({ name, size = 48, style }: DashboardIconProps) {
  return <img src={icons[name]} alt="" aria-hidden="true" draggable={false} width={size} height={size} style={style} />
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

export function IconButton({ label, className = '', children, ...props }: IconButtonProps) {
  return (
    <button type="button" aria-label={label} title={label} className={`dashboard-button ${className}`} {...props}>
      {children}
    </button>
  )
}
