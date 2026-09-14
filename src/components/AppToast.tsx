import chijiaoIcon from '../assets/icons/chijiao.jpeg'

interface AppToastProps {
  visible: boolean
}

export function AppToast({ visible }: AppToastProps) {
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        width: 1000,
        height: 400,
        background: 'var(--color-toast-bg)',
        borderRadius: 'var(--radius-toast)',
        position: 'relative',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity var(--duration-fast) var(--easing-default), transform var(--duration-fast) var(--easing-default)',
        pointerEvents: visible ? undefined : 'none',
      }}
    >
      {/* Creator profile */}
      <button
        className="transition-transform active:scale-[0.9]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 30,
          left: 30,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          padding: 0,
          lineHeight: 0,
        }}
      >
        <img
          src={chijiaoIcon}
          alt="赤角大王"
          draggable={false}
          style={{ objectFit: 'cover', borderRadius: 16 }}
          width={80}
          height={80}
        />
      </button>
      <div style={{ position: 'absolute', top: 130, left: 30, color: '#fff', fontFamily: 'var(--font-family-base)', lineHeight: 1.5 }}>
        <div style={{ fontSize: 24, fontWeight: 500 }}>赤角大王</div>
        <div style={{ fontSize: 20, marginTop: 6 }}>yanrunze0209@qq.com</div>
      </div>
    </div>
  )
}
