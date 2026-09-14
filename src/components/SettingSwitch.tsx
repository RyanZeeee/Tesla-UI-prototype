interface SettingSwitchProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

export function SettingSwitch({ label, checked, onChange }: SettingSwitchProps) {
  return (
    <div style={{ width: 724, height: 60, display: 'flex', alignItems: 'center', gap: 24 }}>
      {/* Switch 开关 */}
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 120,
          height: 60,
          borderRadius: 'var(--radius-button)',
          background: checked ? 'var(--color-switch-on)' : 'var(--color-sidebar)',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background var(--duration-fast) var(--easing-default)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--color-text-white)',
            position: 'absolute',
            top: 6,
            left: checked ? 66 : 6,
            transition: 'left var(--duration-fast) var(--easing-default)',
          }}
        />
      </button>

      {/* 文字 */}
      <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-white)', fontFamily: 'var(--font-family-base)' }}>
        {label}
      </span>
    </div>
  )
}
