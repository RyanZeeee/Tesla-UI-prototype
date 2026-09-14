import powerIcon from '../assets/icons/power.svg'

interface ButtonPowerProps {
  onClick?: () => void
}

export function ButtonPower({ onClick }: ButtonPowerProps) {
  return (
    <button
      onClick={onClick}
      className="transition-transform active:scale-80"
      style={{
        width: 150,
        height: 60,
        borderRadius: 'var(--radius-button)',
        background: 'var(--color-button-power)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img src={powerIcon} alt="power" width={48} height={48} />
    </button>
  )
}
