interface SettingActionButtonProps {
  label: string
  active: boolean
  onClick: () => void
}

export function SettingActionButton({ label, active, onClick }: SettingActionButtonProps) {
  return (
    <div style={{ width: 724, height: 60, display: 'flex', alignItems: 'center' }}>
      <button
        onClick={onClick}
        style={{
          width: 230,
          height: 60,
          borderRadius: 'var(--radius-button)',
          border: '1px solid var(--color-text-white)',
          background: active ? 'var(--color-nav-item-selected)' : 'var(--color-sidebar)',
          color: 'var(--color-text-white)',
          fontSize: 'var(--font-size-base)',
          fontFamily: 'var(--font-family-base)',
          cursor: 'pointer',
          transition: 'background var(--duration-fast) var(--easing-default)',
        }}
      >
        {label}
      </button>
    </div>
  )
}
