interface SettingTitleProps {
  title: string
}

export function SettingTitle({ title }: SettingTitleProps) {
  return (
    <div
      style={{
        width: 724,
        height: 50,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <span
        style={{
          fontSize: 'var(--font-size-label)',
          color: 'var(--color-text-white)',
          fontFamily: 'var(--font-family-base)',
          lineHeight: 1,
        }}
      >
        {title}
      </span>
      <div
        style={{
          width: 724,
          height: 1,
          background: 'var(--color-text-white)',
        }}
      />
    </div>
  )
}
