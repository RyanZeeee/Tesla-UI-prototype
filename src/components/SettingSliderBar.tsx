import { useRef, useCallback } from 'react'

interface SettingSliderBarProps {
  icon: string
  rightIcon: string
  label: string
  value: number
  onChange: (v: number) => void
}

export function SettingSliderBar({ icon, rightIcon, label, value, onChange }: SettingSliderBarProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  const updateFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      const pct = Math.max(0, Math.min(100, Math.round((x / rect.width) * 100)))
      onChange(pct)
    },
    [onChange],
  )

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      updateFromEvent(e)
      const onMove = (ev: MouseEvent) => updateFromEvent(ev)
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [updateFromEvent],
  )

  return (
    <div style={{ width: 724, height: 116, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* 顶部：icon 占位 + 文字 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, height: 48 }}>
        <img src={icon} alt={label} width={48} height={48} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-white)', fontFamily: 'var(--font-family-base)' }}>
          {label}
        </span>
      </div>

      {/* 底部：滑块 */}
      <div
        ref={trackRef}
        onMouseDown={onMouseDown}
        style={{
          width: 724,
          height: 60,
          background: 'var(--color-sidebar)',
          borderRadius: 'var(--radius-button)',
          position: 'relative',
          cursor: 'pointer',
          userSelect: 'none',
          overflow: 'hidden',
        }}
      >
        {/* 进度填充 */}
        <div
          style={{
            width: `${value}%`,
            height: '100%',
            background: 'var(--color-nav-item-selected)',
            borderRadius: '30px 0 0 30px',
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
          }}
        />
        {/* 左侧百分比 */}
        <span
          style={{
            position: 'absolute',
            left: 60,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-text-white)',
            fontFamily: 'var(--font-family-base)',
            pointerEvents: 'none',
          }}
        >
          {value}%
        </span>
        {/* 右侧 icon */}
        <img
          src={rightIcon}
          alt=""
          width={48}
          height={48}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  )
}
