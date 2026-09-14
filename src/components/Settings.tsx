import { useState } from 'react'
import quickControlsIcon from '../assets/icons/quick controls.svg'
import lightsIcon from '../assets/icons/lights.svg'
import lockIcon from '../assets/icons/lock.svg'
import displayIcon from '../assets/icons/display.svg'
import model3SmallIcon from '../assets/icons/model3-icon-small.svg'
import steeringWheelIcon from '../assets/icons/steering wheel-small.svg'
import safetyIcon from '../assets/icons/safety and security.svg'
import serviceIcon from '../assets/icons/service.svg'
import { SettingsWorkspace } from '../settings/SettingsWorkspace'
import { pageNames } from '../settings/settingsData'

interface SettingsProps {
  visible: boolean
  onClose: () => void
}

const navItems = [
  { icon: quickControlsIcon, label: "Controls" },
  { icon: steeringWheelIcon, label: "Autopilot" },
  { icon: lightsIcon, label: "Lights" },
  { icon: lockIcon, label: "Locks" },
  { icon: displayIcon, label: "Display" },
  { icon: model3SmallIcon, label: "Dynamics" },
  { icon: safetyIcon, label: "Safety" },
  { icon: serviceIcon, label: "Service" },
]

export function Settings({ visible, onClose }: SettingsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      style={{
        position: 'relative',
        width: 1340,
        height: 1010,
        display: 'flex',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform var(--duration-normal) var(--easing-default)',
        pointerEvents: visible ? undefined : 'none',
      }}
    >
      <button type="button" className="vehicle-settings-close" aria-label="Close vehicle settings" onClick={onClose}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      {/* 左侧 Nav Tree */}
      <div
        role="tablist"
        aria-label="Vehicle settings categories"
        aria-orientation="vertical"
        style={{
          width: 460,
          height: 1010,
          background: 'var(--color-nav-tree)',
          overflowY: 'auto',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 60,
          gap: 20,
        }}
      >
        {navItems.map((item, i) => {
          const selected = i === selectedIndex
          return (
            <button
              key={i}
              role="tab"
              id={`settings-tab-${item.label}`}
              aria-selected={selected}
              aria-controls="vehicle-settings-panel"
              tabIndex={selected ? 0 : -1}
              onKeyDown={event => {
                if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
                event.preventDefault()
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? navItems.length - 1 : (i + (event.key === 'ArrowDown' ? 1 : -1) + navItems.length) % navItems.length
                setSelectedIndex(next)
                document.getElementById(`settings-tab-${navItems[next].label}`)?.focus()
              }}
              onClick={() => setSelectedIndex(i)}
              className="transition-opacity"
              style={{
                width: 360,
                height: 68,
                background: selected ? 'var(--color-nav-item-selected)' : 'transparent',
                opacity: selected ? 1 : 0.4,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 30,
                gap: 20,
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <img src={item.icon} alt="" aria-hidden="true" width={50} height={50} />
              <span style={{ fontSize: 'var(--font-size-nav)', color: 'var(--color-text-white)', fontFamily: 'var(--font-family-base)' }}>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* 右侧 Settings */}
      <div
        style={{
          width: 880,
          height: 1010,
          background: 'var(--color-settings-panel)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <SettingsWorkspace page={pageNames[selectedIndex]} visible={visible} />
      </div>
    </div>
  )
}
