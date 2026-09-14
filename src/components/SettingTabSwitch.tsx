interface SettingTabSwitchProps {
  icon: string
  label: string
  tabs: string[]
  activeIndex: number
  onChange: (index: number) => void
}

export function SettingTabSwitch({ icon, label, tabs, activeIndex, onChange }: SettingTabSwitchProps) {
  const n = tabs.length
  const tabWidth = 724 / n

  return (
    <div style={{ width: 724, height: 116, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* 顶部：icon 占位 + 文字 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, height: 48 }}>
        <img src={icon} alt={label} width={48} height={48} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-white)', fontFamily: 'var(--font-family-base)' }}>
          {label}
        </span>
      </div>

      {/* 底部：tab switch */}
      <div
        style={{
          width: 724,
          height: 60,
          background: 'var(--color-sidebar)',
          borderRadius: 'var(--radius-button)',
          position: 'relative',
          display: 'flex',
        }}
      >
        {/* 活动指示器 */}
        <div
          style={{
            width: tabWidth,
            height: '100%',
            background: 'var(--color-nav-item-selected)',
            borderRadius: 'var(--radius-button)',
            position: 'absolute',
            top: 0,
            left: activeIndex * tabWidth,
            transition: 'left var(--duration-fast) var(--easing-default)',
          }}
        />
        {/* 每个 tab */}
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            style={{
              width: tabWidth,
              height: '100%',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-white)',
              fontFamily: 'var(--font-family-base)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  )
}
