import { useCallback, useEffect, useRef, useState } from 'react'
import { StatusBar } from './components/StatusBar'
import { Sidebar } from './components/Sidebar'
import { Navigate } from './components/Navigate'
import type { NavigationAction, NavigationHandle } from './components/Navigate'
import { ControlBar } from './components/ControlBar'
import { AppToast } from './components/AppToast'
import { ClimatePanel } from './components/ClimatePanel'
import { SeatPanel } from './components/SeatPanel'
import type { SeatSide } from './seats/seatState'
import { Settings } from './components/Settings'
import githubIcon from './assets/icons/github.svg'

const CANVAS_W = 1920
const CANVAS_H = 1200
/** 外框四周内边距（p-4） */
const FRAME_PADDING = 32
/** 外框外侧上方的页面留白，用于放置 GitHub 仓库入口（随画布一起缩放） */
const FRAME_HEADER_H = 100
const VIZ_NORMAL = 580
const VIZ_FULL = 1920

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function App() {
  const dockMusicHost = useRef<HTMLDivElement>(null)
  const [musicOpen, setMusicOpen] = useState(false)
  const navigationRef = useRef<NavigationHandle>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [expanded, setExpanded] = useState(false)
  const [animWidth, setAnimWidth] = useState(VIZ_NORMAL)
  const [animMapWidth, setAnimMapWidth] = useState(VIZ_NORMAL)
  const [appToastOpen, setAppToastOpen] = useState(false)
  const [climateOpen, setClimateOpen] = useState(false)
  const [driverTemperature, setDriverTemperature] = useState(20)
  const [passengerTemperature, setPassengerTemperature] = useState(20)
  const [fanLevel, setFanLevel] = useState(2)
  const [climatePowered, setClimatePowered] = useState(true)
  const [seatOpen, setSeatOpen] = useState(false)
  const [selectedSeat, setSelectedSeat] = useState<SeatSide>(0)
  const closeSeat = useCallback(() => setSeatOpen(false), [])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const animRef = useRef<number>(VIZ_NORMAL)
  const animMapRef = useRef<number>(VIZ_NORMAL)

  useEffect(() => {
    function updateScale() {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const gap = 40
      const totalW = CANVAS_W + FRAME_PADDING
      const totalH = CANVAS_H + FRAME_PADDING + FRAME_HEADER_H
      const s = Math.min(vw / totalW, (vh - gap * 2) / totalH)
      setScale(s)
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  useEffect(() => {
    const target = expanded ? VIZ_FULL : VIZ_NORMAL
    const start = animRef.current
    const mapStart = animMapRef.current
    const startTime = performance.now()
    const mapDelay = 200
    const duration = 500

    let raf = 0
    function animate(now: number) {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const current = start + (target - start) * easeOutCubic(t)
      animRef.current = current
      setAnimWidth(current)

      // 地图缩放延迟
      const mapElapsed = Math.max(0, elapsed - mapDelay)
      const mapT = Math.min(mapElapsed / duration, 1)
      const mapCurrent = mapStart + (target - mapStart) * easeOutCubic(mapT)
      animMapRef.current = mapCurrent
      setAnimMapWidth(mapCurrent)

      if (t < 1 || mapT < 1) {
        raf = requestAnimationFrame(animate)
      }
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [expanded])

  const toggle = useCallback(() => {
    setMusicOpen(false)
    setExpanded((v) => !v)
    setSettingsOpen(false)
  }, [])
  const toggleAppToast = useCallback(() => { setMusicOpen(false); setAppToastOpen((v) => !v) }, [])
  const toggleSettings = useCallback(() => {
    setMusicOpen(false)
    const next = climateOpen || seatOpen || !settingsOpen
    setSeatOpen(false)
    setClimateOpen(false)
    setSettingsOpen(next)
    // 从sidebar展开状态打开settings时，同步收起sidebar
    if (next && expanded) setExpanded(false)
  }, [climateOpen, seatOpen, settingsOpen, expanded])

  const openSeat = (side: SeatSide) => {
    setMusicOpen(false)
    setSeatOpen(!seatOpen || selectedSeat !== side); setSelectedSeat(side)
    setClimateOpen(false); setSettingsOpen(false); setAppToastOpen(false)
  }

  const openNavigation = (action: NavigationAction) => {
    setMusicOpen(false)
    setExpanded(false)
    setSettingsOpen(false); setClimateOpen(false); setSeatOpen(false); setAppToastOpen(false)
    navigationRef.current?.open(action)
  }

  const navWidth = CANVAS_W - animWidth

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center"
      onDragStart={event => {
        if (event.target instanceof Element && event.target.closest('input, textarea, [contenteditable="true"]')) return
        event.preventDefault()
      }}
      style={{
        width: '100vw',
        height: '100vh',
      }}
    >
      {/* 缩放容器：外框与其外侧上方的 GitHub 入口整体缩放、居中移动 */}
      <div
        className="relative"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          paddingTop: FRAME_HEADER_H,
        }}
      >
        {/* 原型外框外侧、上方：GitHub 仓库入口 */}
        <a
          className="github-link"
          href="https://github.com/RyanZeeee/Tesla-UI-prototype"
          target="_blank"
          rel="noreferrer"
          aria-label="Open the GitHub repository (opens in a new tab)"
          title="GitHub · Tesla-UI-prototype"
        >
          <img src={githubIcon} alt="" aria-hidden="true" draggable={false} />
        </a>

        {/* 原型外框 */}
        <div
          className="p-4"
          style={{
            borderRadius: 'var(--radius-frame)',
            background: 'var(--color-app-bg)',
            boxShadow: '0 0 80px rgba(0,0,0,0.8), inset 0 0 2px rgba(255,255,255,0.05)',
          }}
        >
          <div
            className="relative overflow-hidden"
            data-dashboard-canvas
            style={{ width: CANVAS_W, height: CANVAS_H, borderRadius: 'var(--radius-inner)' }}
          >
            {/* B 区：车辆可视化 */}
            <div
              className="absolute top-0 left-0 overflow-hidden"
              style={{ width: animWidth, height: 1080 }}
            >
              <Sidebar dockMusicHost={dockMusicHost} dockMusicOpen={musicOpen} onDockMusicClose={() => setMusicOpen(false)} vizWidth={animWidth} expanded={expanded} onNavigation={openNavigation} />
            </div>

            {/* C 区：导航地图 */}
            <div
              className="absolute top-0 overflow-hidden"
              style={{
                left: animWidth,
                width: navWidth,
                height: 1080,
              }}
            >
              <Navigate ref={navigationRef} vizWidth={animMapWidth} />
            </div>

            {/* Settings - 位于C区内 */}
            <div
              className="absolute z-10 overflow-hidden"
              style={{
                left: animWidth,
                top: 70,
                width: navWidth,
                height: 1010,
                pointerEvents: settingsOpen ? undefined : 'none',
              }}
            >
              <Settings visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
            </div>

            <div ref={dockMusicHost} className="dock-music-host" style={{ position: 'absolute', left: 580, top: 70, width: 1340, height: 1010, zIndex: 24, overflow: 'hidden', pointerEvents: musicOpen ? 'auto' : 'none' }} />

            {/* A 区：顶部状态栏 */}
            <div
              className="absolute top-0 z-10"
              style={{ left: VIZ_NORMAL }}
            >
              <StatusBar expanded={expanded} />
            </div>

            {/* 手柄 */}
            <div
              className="absolute z-20 flex items-center justify-center cursor-pointer group"
              role="button"
              tabIndex={0}
              aria-label={expanded ? "Collapse vehicle view" : "Expand vehicle view"}
              aria-expanded={expanded}
              style={{
                top: 0,
                left: animWidth - 24,
                width: 24,
                height: 1080,
              }}
              onClick={toggle}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  toggle()
                }
              }}
            >
              <div
                className="w-[8px] h-[120px] rounded-full transition-colors"
                style={{ background: 'var(--color-handle-idle)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-handle-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-handle-idle)')}
              />
            </div>

            <ClimatePanel visible={climateOpen} driver={driverTemperature} passenger={passengerTemperature} level={fanLevel} powered={climatePowered}
              onDriver={setDriverTemperature} onPassenger={setPassengerTemperature}
              onLevel={value => { setFanLevel(value); setClimatePowered(true) }} onPower={() => setClimatePowered(value => !value)}
              onClose={() => setClimateOpen(false)} />

            <SeatPanel visible={seatOpen} selected={selectedSeat} onSelect={setSelectedSeat} onClose={closeSeat} />

            {/* D 区：底部控制栏 */}
            <div
              className="absolute bottom-0 left-0"
              style={{ width: 1920, height: 120, zIndex: 27, transform: 'translateZ(0)' }}
            >
              <ControlBar
                driverTemperature={driverTemperature} passengerTemperature={passengerTemperature}
                onDriverTemperatureChange={setDriverTemperature} onPassengerTemperatureChange={setPassengerTemperature}
                fanLevel={climatePowered ? fanLevel : 0} fanMode={climatePowered ? 'MANUAL' : 'OFF'}
                onFanClick={() => { setMusicOpen(false); setSeatOpen(false); setClimateOpen(value => !value); setAppToastOpen(false); setSettingsOpen(false) }}
                onTemperatureClick={() => { setMusicOpen(false); setSeatOpen(false); setClimateOpen(true); setAppToastOpen(false); setSettingsOpen(false) }}
                settingsOpen={settingsOpen} climateOpen={climateOpen} musicOpen={musicOpen}
                driverSeatOpen={seatOpen && selectedSeat === 0} passengerSeatOpen={seatOpen && selectedSeat === 1}
                onMusicClick={() => { setClimateOpen(false); setSeatOpen(false); setSettingsOpen(false); setAppToastOpen(false); setExpanded(false); setMusicOpen(value => !value) }}
                appToastOpen={appToastOpen}
                onAppClick={toggleAppToast}
                onModel3Click={toggleSettings}
                onDriverSeatClick={() => openSeat(0)} onPassengerSeatClick={() => openSeat(1)}
              />
            </div>

            {/* AppToast 弹窗 */}
            {appToastOpen && (
              <div
                className="absolute z-30"
                style={{ inset: 0 }}
                onClick={toggleAppToast}
              />
            )}
            <div
              className="absolute z-40"
              style={{
                bottom: 140,
                left: (1920 - 1000) / 2,
                pointerEvents: appToastOpen ? undefined : 'none',
              }}
            >
              <AppToast visible={appToastOpen} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
