import { useRef, useState, type RefObject } from 'react'
import { TopInfoIcons } from './TopInfoIcons'
import { SpeedCard } from './SpeedCard'
import { CarCard } from './CarCard'
import { MusicPlayer } from './MusicPlayer'
import { TirePressure } from './TirePressure'
import { NavigateCard } from './NavigateCard'
import type { NavigationAction } from './Navigate'

interface SidebarProps {
  dockMusicHost?: RefObject<HTMLDivElement | null>
  dockMusicOpen?: boolean
  onDockMusicClose?: () => void
  vizWidth: number
  expanded?: boolean
  onNavigation?: (action: NavigationAction) => void
}

const TOP = 60 + 149 + 26 + 630 + 15

export function Sidebar({ vizWidth, expanded = vizWidth >= 1920, onNavigation, dockMusicHost, dockMusicOpen, onDockMusicClose }: SidebarProps) {
  const musicHost = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const moveLeft = vizWidth > 580 ? (vizWidth - 580) / 2 : 0
  const progress = (vizWidth - 580) / (1920 - 580)
  const isExpanded = progress > 0

  // 底部卡片组居中：NowPlaying(580) + 20 + NavigateCard(340) = 940
  const bottomCenter = progress * ((1920 - 940) / 2)

  return (
    <div
      ref={musicHost}
      style={{
        width: vizWidth,
        height: 1080,
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--color-sidebar)',
      }}
    >
      {/* TopInfoIcons 固定不动 */}
      <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}>
        <TopInfoIcons tireWarning={false} />
      </div>

      {/* SpeedCard 贴紧 TopInfoIcons */}
      <div style={{ position: 'absolute', top: 60, left: 0, zIndex: 2, transform: `translateX(${moveLeft}px)` }}>
        <SpeedCard />
      </div>

      {/* CarCard 在 SpeedCard 下方 26px */}
      <div style={{ position: 'absolute', top: 60 + 149 + 26, left: 0, zIndex: 1, transform: `translateX(${moveLeft}px)` }}>
        <CarCard vizWidth={vizWidth} expanded={expanded} />
      </div>

      {/* NowPlaying / TirePressure */}
      <div
        style={{
          position: 'absolute',
          zIndex: 2,
          top: TOP,
          left: 0,
          transform: `translateX(${bottomCenter}px)`,
          width: 580,
          height: 160,
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        <div
          className="transition-transform duration-600 ease-out"
          style={{
            display: 'flex',
            transform: `translateX(${-activeIndex * 580}px)`,
          }}
        >
          <div aria-hidden={activeIndex !== 0} inert={activeIndex !== 0} style={{ minWidth: 580, display: 'flex', justifyContent: 'center' }}>
            <MusicPlayer host={musicHost} left={bottomCenter} dockHost={dockMusicHost} dockOpen={dockMusicOpen} onDockClose={onDockMusicClose} />
          </div>
          <div aria-hidden={activeIndex !== 1} inert={activeIndex !== 1} style={{ minWidth: 580, display: 'flex', justifyContent: 'center' }}>
            <TirePressure />
          </div>
        </div>
      </div>

      {/* NavigateCard - 从右渐现，与NowPlaying同行，间距20px */}
      <div
        aria-hidden={!isExpanded}
        inert={!isExpanded}
        style={{
          position: 'absolute',
          zIndex: 2,
          top: TOP,
          left: 580 + 20,
          transform: `translateX(${bottomCenter}px)`,
          width: 340,
          height: 160,
          display: 'flex',
          alignItems: 'center',
          opacity: progress,
          pointerEvents: isExpanded ? undefined : 'none',
        }}
      >
        <NavigateCard onNavigate={() => onNavigation?.('search')} onHome={() => onNavigation?.('home')} onWork={() => onNavigation?.('work')} />
      </div>

      {/* 两个导航点 - 跟随NowPlaying */}
      <div
        style={{
          position: 'absolute',
          zIndex: 2,
          bottom: 12,
          left: 0,
          transform: `translateX(${bottomCenter}px)`,
          width: 580,
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        {[0, 1].map((index) => (
          <button
            key={index}
            type="button"
            className="card-pagination"
            aria-label={index === 0 ? "Show music card" : "Show tire pressure card"}
            aria-pressed={activeIndex === index}
            onClick={() => setActiveIndex(index)}
          ><span /></button>
        ))}
      </div>
    </div>
  )
}
