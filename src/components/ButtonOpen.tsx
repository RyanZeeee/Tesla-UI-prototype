interface ButtonOpenProps {
  onClick?: () => void
}

export function ButtonOpen({ onClick }: ButtonOpenProps) {
  return (
    <button
      onClick={onClick}
      className="transition-transform active:scale-80"
      style={{
        width: 150,
        height: 60,
        borderRadius: 'var(--radius-button)',
        background: 'var(--color-button-open)',
        color: 'var(--color-text-white)',
        fontSize: 'var(--font-size-base)',
        fontFamily: 'var(--font-family-base)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      Open
    </button>
  )
}
