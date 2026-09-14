import { memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, Ref } from 'react'
import { MapToolbar, NavigationEntry } from './MapControls'
import { CityMap } from '../navigation/CityMap'
import { NavigationIcon } from '../navigation/NavigationIcon'
import type { NavigationIconName } from '../navigation/NavigationIcon'
import { MAP_HEIGHT, MAP_WIDTH, MAX_ZOOM, MIN_ZOOM, ORIGIN, places, routesTo, sampleRoute } from '../navigation/mapData'
import type { MapPlace, MapRoute } from '../navigation/mapData'
import mapBase from '../assets/navigation/map-base.webp'
import mapBaseFlat from '../assets/navigation/map-base-flat.webp'
import '../navigation/navigation.css'

export type NavigationAction = 'search' | 'home' | 'work'
export interface NavigationHandle { open: (action: NavigationAction) => void }

interface NavigateProps {
  ref?: Ref<NavigationHandle>
  vizWidth: number
  onNavigate?: () => void
  onChargingClick?: () => void
  onSettingsClick?: () => void
  chargingSelected?: boolean
}

interface Camera { x: number; y: number; zoom: number }
type NavigationMode = 'idle' | 'search' | 'preview' | 'navigating'
const initialCamera: Camera = { x: ORIGIN.x - 50, y: ORIGIN.y - 80, zoom: 1 }
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
function boundedCamera(camera: Camera): Camera {
  const zoom = clamp(camera.zoom, MIN_ZOOM, MAX_ZOOM)
  return { zoom,
    x: clamp(camera.x, MAP_WIDTH / zoom / 2, 3000 - MAP_WIDTH / zoom / 2),
    y: clamp(camera.y, MAP_HEIGHT / zoom / 2, 3000 - MAP_HEIGHT / zoom / 2),
  }
}
function fitRoute(route: MapRoute): Camera {
  const xs = route.nodes.map(n => n.x), ys = route.nodes.map(n => n.y)
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys)
  const zoom = clamp(Math.min(640 / (right - left + 160), 650 / (bottom - top + 160)), MIN_ZOOM, 1.5)
  return boundedCamera({ x: (left + right) / 2 - 185 / zoom, y: (top + bottom) / 2 - 65 / zoom, zoom })
}
function arrivalTime(minutes: number) {
  const time = 22 * 60 + 21 + minutes
  return `${String(Math.floor(time / 60) % 24).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`
}

export const Navigate = memo(function Navigate({ ref, vizWidth, onNavigate, onChargingClick, onSettingsClick, chargingSelected }: NavigateProps) {
  const [camera, setCamera] = useState(initialCamera)
  const [animateCamera, setAnimateCamera] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [offCenter, setOffCenter] = useState(false)
  const [mode, setMode] = useState<NavigationMode>('idle')
  const [query, setQuery] = useState('')
  const [destination, setDestination] = useState<MapPlace | null>(null)
  const [routeIndex, setRouteIndex] = useState(0)
  const [localCharging, setLocalCharging] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [labels, setLabels] = useState(true)
  const [buildings, setBuildings] = useState(true)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchReturnMode = useRef<NavigationMode>('idle')
  const dragRef = useRef<{ id: number; clientX: number; clientY: number; camera: Camera; scale: number; moved: boolean } | null>(null)
  const dragFrameRef = useRef<number | null>(null)
  const pendingCameraRef = useRef<Camera | null>(null)
  const visibleCharging = chargingSelected ?? localCharging
  const routes = useMemo(() => destination ? routesTo(destination) : [], [destination])
  const route = routes[routeIndex] ?? routes[0]
  const routeVisible = !!route && (mode === 'preview' || mode === 'navigating')
  // The prototype remains in P. Navigation presents directions without moving
  // the vehicle, consuming distance, or advancing a simulated trip clock.
  const guidance = useMemo(() => route ? sampleRoute(route, 0) : null, [route])
  const filteredPlaces = places.filter(place => {
    const text = query.trim().toLowerCase()
    return text ? `${place.name} ${place.detail} ${place.category === 'charging' ? "charging supercharger" : ''}`.toLowerCase().includes(text) : !['home', 'work', 'charging'].includes(place.category)
  })

  useEffect(() => {
    if (mode === 'search' && vizWidth <= 580) searchRef.current?.focus({ preventScroll: true })
  }, [mode, vizWidth])
  useEffect(() => () => {
    if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current)
  }, [])
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (settingsOpen) setSettingsOpen(false)
      else if (mode === 'search') setMode(searchReturnMode.current)
      else if (mode === 'preview') { setMode('idle'); setDestination(null); setAnimateCamera(true); setCamera(initialCamera) }
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [destination, mode, settingsOpen])

  function openSearch() {
    searchReturnMode.current = mode
    setMode('search'); setQuery(''); setSettingsOpen(false)
    onNavigate?.()
  }
  function closeSearch() { setMode(searchReturnMode.current) }
  function choosePlace(place: MapPlace) {
    const nextRoutes = routesTo(place)
    setDestination(place); setRouteIndex(0); setMode('preview')
    setSettingsOpen(false); setOffCenter(false); setAnimateCamera(true); setCamera(fitRoute(nextRoutes[0]))
  }
  useImperativeHandle(ref, () => ({
    open(action) {
      if (action === 'search') openSearch()
      else {
        const place = places.find(place => place.id === action)
        if (place) choosePlace(place)
      }
    },
  }))

  function resetNavigation() {
    setDestination(null); setMode('idle'); setOffCenter(false)
    setAnimateCamera(true); setCamera(initialCamera)
  }
  function recenter() {
    setAnimateCamera(true); setOffCenter(false)
    setCamera(routeVisible ? fitRoute(route) : initialCamera)
  }
  function changeZoom(zoom: number) {
    setAnimateCamera(true)
    setCamera(current => boundedCamera({ ...current, zoom }))
  }
  function startDrag(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || dragRef.current || (event.target as Element).closest('[data-map-marker]')) return
    setSettingsOpen(false)
    if (mode === 'search') closeSearch()
    const bounds = event.currentTarget.getBoundingClientRect()
    dragRef.current = { id: event.pointerId, clientX: event.clientX, clientY: event.clientY, camera, scale: bounds.width / MAP_WIDTH, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function moveDrag(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.id) return
    const dx = (event.clientX - drag.clientX) / drag.scale, dy = (event.clientY - drag.clientY) / drag.scale
    if (!drag.moved && Math.hypot(dx, dy) < 7) return
    if (!drag.moved) {
      drag.moved = true
      setDragging(true); setOffCenter(true); setAnimateCamera(false)
    }
    pendingCameraRef.current = boundedCamera({ ...drag.camera, x: drag.camera.x - dx / drag.camera.zoom, y: drag.camera.y - dy / drag.camera.zoom })
    // Pointer events can arrive faster than the screen refreshes. Commit only
    // the most recent position once per frame, keeping raster and overlays in sync.
    if (dragFrameRef.current === null) dragFrameRef.current = requestAnimationFrame(() => {
      dragFrameRef.current = null
      if (pendingCameraRef.current) setCamera(pendingCameraRef.current)
      pendingCameraRef.current = null
    })
  }
  function endDrag(event: ReactPointerEvent<SVGSVGElement>) {
    if (dragRef.current?.id !== event.pointerId) return
    if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current)
    dragFrameRef.current = null
    if (pendingCameraRef.current) setCamera(pendingCameraRef.current)
    pendingCameraRef.current = null
    dragRef.current = null; setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const cameraTransform = `translate(${MAP_WIDTH / 2 - camera.x * camera.zoom}px, ${MAP_HEIGHT / 2 - camera.y * camera.zoom}px) scale(${camera.zoom})`
  return <section className="navigation-scene dashboard-ui" aria-label="Interactive navigation map" inert={vizWidth >= 1919} aria-hidden={vizWidth >= 1919} data-mode={mode} data-vehicle-state="parked" data-map-zoom={camera.zoom.toFixed(2)} data-map-x={camera.x.toFixed(1)} data-map-y={camera.y.toFixed(1)}>
    <img className={`navigation-base-map navigation-camera${animateCamera ? ' is-animated' : ''}`}
      src={buildings ? mapBase : mapBaseFlat} width={3000} height={3000} alt="" aria-hidden="true"
      draggable={false} decoding="async" fetchPriority="high" style={{ transform: cameraTransform }} />
    <svg className={`navigation-map${dragging ? ' is-dragging' : ''}`} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      role="group" aria-label="City demo map; drag to pan and use the controls to zoom" tabIndex={0}
      onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return
        const directions: Record<string, [number, number]> = { ArrowLeft: [-100, 0], ArrowRight: [100, 0], ArrowUp: [0, -100], ArrowDown: [0, 100] }
        if (directions[event.key]) {
          event.preventDefault(); setOffCenter(true); setAnimateCamera(true)
          const [x, y] = directions[event.key]
          setCamera(current => boundedCamera({ ...current, x: current.x + x / current.zoom, y: current.y + y / current.zoom }))
        } else if (event.key === '+' || event.key === '=') { event.preventDefault(); changeZoom(camera.zoom + .25) }
        else if (event.key === '-') { event.preventDefault(); changeZoom(camera.zoom - .25) }
        else if (event.key === 'Home') { event.preventDefault(); recenter() }
      }}>
      <g className={`navigation-camera${animateCamera ? ' is-animated' : ''}`} style={{ transform: cameraTransform }}>
        <CityMap labels={labels} traffic={false} />
        {routeVisible && <g className="map-routes" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {mode === 'preview' && routes.filter(item => item.id !== route.id).map(item => <path key={item.id} d={item.path} stroke="#708499" strokeWidth="7" opacity=".8" />)}
          <path d={route.path} stroke="#13253b" strokeWidth="13" />
          <path key={route.id} className="map-route-line" d={route.path} pathLength="1" />
        </g>}
        {places.filter(place => place.category === 'charging' ? visibleCharging : !['home', 'work'].includes(place.category)).map(place => {
          if (routeVisible && destination?.id === place.id) return null
          return <g key={place.id} className={`map-poi map-poi--${place.category}`} data-map-marker={place.id}
            transform={`translate(${place.node.x} ${place.node.y}) scale(${1 / camera.zoom})`} role="button" tabIndex={0} aria-label={`Navigate to ${place.name}`}
            onClick={() => choosePlace(place)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choosePlace(place) } }}>
            <circle className="map-poi-hit" r="38" /><circle className="map-poi-disc" r="21" />
            <g transform="translate(-12 -12)"><NavigationIcon name={place.category} size={24} /></g>
            {labels && <text x="31" y="7" className="map-poi-label">{place.category === 'charging' ? "Supercharger" : place.name}</text>}
          </g>
        })}
        {routeVisible && destination && <g className="map-destination" transform={`translate(${destination.node.x} ${destination.node.y}) scale(${1 / camera.zoom})`} aria-hidden="true">
          <circle r="27" fill="#69b4ff" opacity=".14" /><circle r="9" fill="#fff" stroke="#448dde" strokeWidth="5" />
          <path d="M0-9V-68" stroke="#d6e8fb" strokeWidth="3" /><rect x="-21" y="-79" width="46" height="40" rx="9" fill="#f1f5f9" />
          <g transform="translate(-11 -72)" color="#24435f"><NavigationIcon name="arrival" size={27} /></g>
        </g>}
        <g className="map-vehicle" transform={`translate(${ORIGIN.x} ${ORIGIN.y})`} aria-hidden="true">
          <g transform={`scale(${1 / camera.zoom})`}>
            <circle className="map-vehicle-aura" r="69" /><circle r="36" fill="#d85251" opacity=".08" />
            <g transform="rotate(-8)">
              <path d="M0-29 21 22 0 13-21 22Z" fill="#000" opacity=".35" transform="translate(0 6)" />
              <path d="M0-30 21 23 0 14-21 23Z" fill="#f16b68" stroke="#ffd5d1" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M0-20 0 9 14 16Z" fill="#b82f3c" opacity=".68" />
            </g>
          </g>
        </g>
      </g>
    </svg>
    <div className="navigation-vignette" aria-hidden="true" />

    {mode === 'idle' && <NavigationEntry onClick={openSearch} />}
    {mode === 'search' && <section className="navigation-panel navigation-search-panel" aria-label="Search destinations">
      <form className="navigation-search-field" onSubmit={event => { event.preventDefault(); if (filteredPlaces[0]) choosePlace(filteredPlaces[0]) }}>
        <NavigationIcon name="search" /><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Where to?" aria-label="Search destinations" autoComplete="off" spellCheck={false} />
        <button type="button" className="navigation-icon-button" aria-label={query ? "Clear search" : "Close destination search"} onClick={() => query ? setQuery('') : closeSearch()}><NavigationIcon name="close" size={25} /></button>
      </form>
      {!query && <div className="navigation-saved-places">
        {places.slice(0, 2).map(place => <button key={place.id} onClick={() => choosePlace(place)}><NavigationIcon name={place.category} /><span>{place.name}</span><small>{routesTo(place)[0].minutes} min</small></button>)}
      </div>}
      <div className="navigation-results-heading"><span>{query ? "Search results" : "Explore nearby"}</span><span>{query ? `${filteredPlaces.length} places` : 'Midtown'}</span></div>
      <div className="navigation-results">
        {filteredPlaces.map(place => <button key={place.id} className="navigation-result" onClick={() => choosePlace(place)}>
          <span className={`navigation-place-icon navigation-place-icon--${place.category}`}><NavigationIcon name={place.category} size={27} /></span>
          <span className="navigation-place-copy"><strong>{place.name}</strong><small>{place.detail}</small></span><span className="navigation-result-distance">{routesTo(place)[0].distance} km</span>
        </button>)}
        {!filteredPlaces.length && <div className="navigation-no-results"><NavigationIcon name="search" size={36} /><strong>No places found</strong><span>Try “park”, “coffee” or “charging”</span></div>}
      </div>
      <div className="navigation-search-footnote"><span className="navigation-location-dot" />Current location · Brookwood</div>
    </section>}

    {mode === 'preview' && destination && route && <section className="navigation-panel navigation-route-panel" aria-label="Choose a route">
      <div className="navigation-panel-topline">
        <button className="navigation-icon-button" aria-label="Back to destination search" onClick={openSearch}><NavigationIcon name="back" /></button><span>Routes</span>
        <button className="navigation-icon-button" aria-label="Close route preview" onClick={resetNavigation}><NavigationIcon name="close" /></button>
      </div>
      <div className="navigation-trip-endpoints"><i /><span>Current location</span><b /><strong>{destination.name}</strong></div>
      <p className="navigation-destination-detail">{destination.detail}</p>
      <div className="navigation-route-options" role="group" aria-label="Available routes">
        {routes.map((item, index) => <button key={item.id} className={`navigation-route-option${routeIndex === index ? ' is-selected' : ''}`} aria-pressed={routeIndex === index}
          onClick={() => { setRouteIndex(index); setAnimateCamera(true); setCamera(fitRoute(item)); setOffCenter(false) }}>
          <div><strong>{item.minutes}<small>min</small></strong><span>{item.distance} km</span></div>
          <div><span>{item.label}</span>{routeIndex === index && <NavigationIcon name="check" size={22} />}</div>
        </button>)}
      </div>
      <div className="navigation-arrival-estimate"><span>{arrivalTime(route.minutes)} Arrival</span><span>Battery at arrival <b>{100 - Math.ceil(route.distance * .7)}%</b></span></div>
      <button className="navigation-primary-button" onClick={() => { setMode('navigating'); setCamera(fitRoute(route)); setAnimateCamera(true); setOffCenter(false) }}><NavigationIcon name="arrow" size={26} />Start navigation</button>
      <span className="navigation-demo-note">Demo route</span>
    </section>}

    {mode === 'navigating' && destination && route && guidance && <>
      <section className="navigation-turn-card" aria-label="Driving directions">
        <NavigationIcon name={guidance.turn as NavigationIconName} size={58} />
        <div><strong>{guidance.meters >= 1000 ? `${(guidance.meters / 1000).toFixed(1)} km` : `${guidance.meters} m`}</strong><span>{guidance.instruction}</span></div>
        <small>{guidance.street}</small>
      </section>
      <section className="navigation-trip-card" aria-label="Navigation trip">
        <div className="navigation-trip-heading"><span>{destination.name}</span><span className="navigation-demo-badge">Ready to depart</span></div>
        <div className="navigation-trip-numbers"><strong>{route.minutes}<small>min</small></strong><span>{route.distance.toFixed(1)}<small>km</small></span><span>{arrivalTime(route.minutes)}<small>Arrival</small></span></div>
        <div className="navigation-trip-actions">
          <button onClick={resetNavigation}>End navigation</button>
          <button onClick={openSearch}><NavigationIcon name="search" size={23} />Change destination</button>
        </div>
      </section>
    </>}

    <MapToolbar zoom={camera.zoom} minZoom={MIN_ZOOM} maxZoom={MAX_ZOOM} onZoomChange={changeZoom} onReset={recenter}
      chargingSelected={visibleCharging} onChargingClick={() => { setLocalCharging(value => !value); setSettingsOpen(false); onChargingClick?.() }}
      settingsSelected={settingsOpen} onSettingsClick={() => { setSettingsOpen(value => !value); onSettingsClick?.() }} />
    {settingsOpen && <section className="navigation-map-settings" aria-label="Map display settings">
      <header><strong>Map display</strong><button className="navigation-icon-button" aria-label="Close map settings" onClick={() => setSettingsOpen(false)}><NavigationIcon name="close" size={22} /></button></header>
      {[
        { name: "Places & street names", value: labels, change: setLabels },
        { name: "Neighborhood detail", value: buildings, change: setBuildings },
      ].map(setting => <button key={setting.name} role="switch" aria-checked={setting.value} onClick={() => setting.change(!setting.value)}><span>{setting.name}</span><i><b /></i></button>)}
    </section>}
    {offCenter && <button className="navigation-recenter" onClick={recenter}><NavigationIcon name="locate" size={24} />Back to vehicle</button>}
    <div className="navigation-map-caption"><span>Atlanta</span><i /><span>Demo map</span><div className="navigation-scale"><span>{Math.round(600 / camera.zoom / 50) * 50} m</span><b /></div></div>
  </section>
})
