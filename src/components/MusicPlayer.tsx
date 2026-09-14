import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { NowPlaying } from './NowPlaying'
import { DockMusicPanel } from './DockMusicPanel'
import albumCover from '../assets/artwork/album-cover.svg'
import sunnyDayCover from '../assets/artwork/sunny-day.png'
import travelCover from '../assets/artwork/the-meaning-of-travel.png'
import brightestStarCover from '../assets/artwork/brightest-star-in-the-night-sky.png'
import sunsetCover from '../assets/artwork/sunset-boulevard.png'

const tracks = [
  { title: "Under Mount Fuji", artist: "Eason Chan", duration: 259, color: '#856747' },
  { title: "Sunny Day", artist: "Jay Chou", duration: 269, color: '#557b89' },
  { title: "The Meaning of Travel", artist: "Cheer Chen", duration: 257, color: '#7d8870' },
  { title: "Brightest Star in the Night Sky", artist: "Escape Plan", duration: 252, color: '#575777' },
  { title: "Sunset Boulevard", artist: "Liang Bo", duration: 284, color: '#a66951' },
]
const covers = [albumCover, sunnyDayCover, travelCover, brightestStarCover, sunsetCover]
const coverFor = (index: number) => covers[index]
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`

export function MusicPlayer({ host, left, dockHost, dockOpen, onDockClose }: { host: RefObject<HTMLDivElement | null>; left: number; dockHost?: RefObject<HTMLDivElement | null>; dockOpen?: boolean; onDockClose?: () => void }) {
  const [playback, setPlayback] = useState({ index: 0, elapsed: 82, playing: true })
  const [panel, setPanel] = useState<'player' | 'search' | null>(null)
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<number[]>([])
  const closeRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const track = tracks[playback.index]
  const progress = playback.elapsed / track.duration * 100

  useEffect(() => {
    if (!playback.playing) return
    let last = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      const delta = (now - last) / 1000
      last = now
      setPlayback(current => {
        const elapsed = current.elapsed + delta
        return elapsed >= tracks[current.index].duration
          ? { ...current, index: (current.index + 1) % tracks.length, elapsed: 0 }
          : { ...current, elapsed }
      })
    }, 250)
    return () => window.clearInterval(timer)
  }, [playback.playing])

  useEffect(() => {
    if (!panel) return
    if (panel === 'search') searchRef.current?.focus()
    else closeRef.current?.focus()
  }, [panel])

  function open(mode: 'player' | 'search') {
    if (!panel) returnFocus.current = document.activeElement as HTMLElement
    setPanel(mode)
    if (mode === 'search') searchRef.current?.focus()
  }
  function close() {
    setPanel(null)
    returnFocus.current?.focus()
  }
  function skip(direction: number) {
    setPlayback(current => ({ ...current, index: (current.index + direction + tracks.length) % tracks.length, elapsed: 0 }))
  }
  const playerProps = {
    title: track.title, artist: track.artist, coverSrc: coverFor(playback.index), progress, playing: playback.playing,
    onPlayingChange: (playing: boolean) => setPlayback(current => ({ ...current, playing })),
    onProgressChange: (value: number) => setPlayback(current => ({ ...current, elapsed: value / 100 * tracks[current.index].duration })),
    onPrevious: () => skip(-1), onNext: () => skip(1),
    onSearch: () => open('search'), onExpand: () => open('player'),
  }
  const matches = tracks.map((song, index) => ({ ...song, index }))


  return <>
    <NowPlaying {...playerProps} />
    {dockOpen && dockHost?.current && createPortal(<DockMusicPanel tracks={tracks.map((track, index) => ({ ...track, cover: coverFor(index) }))}
      index={playback.index} elapsed={playback.elapsed} playing={playback.playing} favorites={favorites}
      onClose={() => onDockClose?.()} onSelect={index => setPlayback({ index, elapsed: 0, playing: true })}
      onPlaying={() => setPlayback(current => ({ ...current, playing: !current.playing }))}
      onSeek={elapsed => setPlayback(current => ({ ...current, elapsed }))}
      onFavorite={() => setFavorites(current => current.includes(playback.index) ? current.filter(index => index !== playback.index) : [...current, playback.index])} />, dockHost.current)}
    {panel && !dockOpen && host.current && createPortal(
      <div className="music-overlay" onClick={close}>
        <section role="dialog" aria-modal="true" aria-label={panel === 'search' ? "Search music" : "Music player"} className={`music-panel music-panel--${panel} dashboard-ui`}
          style={{ left: left + 20 }} onClick={event => event.stopPropagation()}
          onKeyDown={event => {
            if (event.key === 'Escape') { event.stopPropagation(); close() }
            if (event.key === 'Tab') {
              const elements = [...event.currentTarget.querySelectorAll<HTMLElement>('button, input')].filter(el => !el.hasAttribute('disabled'))
              const first = elements[0], last = elements[elements.length - 1]
              if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
              if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
            }
          }}>
          <header><span>{panel === 'search' ? "Search music" : "Now playing"} <small>Demo playback · No audio</small></span><button ref={closeRef} onClick={close} aria-label={panel === 'search' ? "Close search" : "Collapse player"}>×</button></header>
          {panel === 'player' && <>
          <div className="music-feature" style={{ background: `radial-gradient(ellipse at top right, ${track.color}66, transparent 80%)` }}>
            <img src={coverFor(playback.index)} alt="" />
            <div><span className={`music-equalizer ${playback.playing ? 'is-playing' : ''}`} aria-hidden="true"><i /><i /><i /><i /></span>
              <h2>{track.title}</h2><p>{track.artist}</p>
            </div>
            <button className="music-favorite" aria-label={favorites.includes(playback.index) ? "Remove from favorites" : "Add to favorites"} aria-pressed={favorites.includes(playback.index)}
              onClick={() => setFavorites(current => current.includes(playback.index) ? current.filter(index => index !== playback.index) : [...current, playback.index])}>
              {favorites.includes(playback.index) ? '♥' : '♡'}
            </button>
          </div>
          <div className="music-expanded-controls"><NowPlaying {...playerProps} onExpand={close} expandLabel="Collapse player" />
            <div className="music-times"><span>{time(playback.elapsed)}</span><span>{time(track.duration)}</span></div>
          </div>
          </>}
          {panel === 'search' && <label className="music-search"><span aria-hidden="true">⌕</span><input ref={searchRef} aria-label="Search songs or artists" placeholder="Search songs or artists" value={query} onChange={event => setQuery(event.target.value)} />
            {query && <button aria-label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus() }}>×</button>}
          </label>}
          {panel === 'player' && <>
          <div className="music-list-heading">Up next<span>{tracks.length} songs</span></div>
          <div className="music-queue">
            {matches.map(song => <button key={song.index} className={song.index === playback.index ? 'is-current' : ''} aria-label={`Play ${song.title}`} aria-pressed={song.index === playback.index}
              onClick={() => setPlayback({ index: song.index, elapsed: 0, playing: true })}>
              <span className="music-track-number">{song.index === playback.index && playback.playing ? '♫' : String(song.index + 1).padStart(2, '0')}</span>
              <span className="music-track-name">{song.title}<small>{song.artist}</small></span><span>{favorites.includes(song.index) ? '♥ ' : ''}{time(song.duration)}</span>
            </button>)}
            {!matches.length && <div className="music-empty">No songs found<small>Try another song or artist</small></div>}
          </div>
          </>}
        </section>
      </div>, host.current)}
  </>
}
