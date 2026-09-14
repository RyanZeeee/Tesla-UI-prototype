interface SettingSmallTitleProps {
  icon: string
  label: string
}

export function SettingSmallTitle({ icon, label }: SettingSmallTitleProps) {
  return (
    <div style={{ width: 724, height: 48, display: 'flex', alignItems: 'center', gap: 20 }}>
      <img src={icon} alt={label} width={48} height={48} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-white)', fontFamily: 'var(--font-family-base)' }}>
        {label}
      </span>
    </div>
  )
}
