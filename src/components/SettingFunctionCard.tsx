interface SettingFunctionCardProps {
  icon: string
  label: string
  onClick?: () => void
}

export function SettingFunctionCard({ icon, label, onClick }: SettingFunctionCardProps) {
  return (
    <button
      onClick={onClick}
      className="transition-transform active:scale-90"
      style={{
        width: 350,
        height: 160,
        borderRadius: 'var(--radius-button)',
        background: 'var(--color-sidebar)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <img src={icon} alt={label} height={48} />
      <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-white)', fontFamily: 'var(--font-family-base)' }}>
        {label}
      </span>
    </button>
  )
}
