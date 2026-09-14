import { useEffect, useRef } from 'react'
import { DashboardIcon, IconButton } from './DashboardIcon'

interface DockTrack { title: string; artist: string; duration: number; cover: string }
interface Props {
  tracks: DockTrack[]; index: number; elapsed: number; playing: boolean; favorites: number[]
  onClose: () => void; onSelect: (index: number) => void; onPlaying: () => void
  onSeek: (seconds: number) => void; onFavorite: () => void
}
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`

export function DockMusicPanel({ tracks, index, elapsed, playing, favorites, onClose, onSelect, onPlaying, onSeek, onFavorite }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus({ preventScroll: true })
    return () => previousFocus.current?.focus({ preventScroll: true })
  }, [])
  const track = tracks[index]
  return <div className="dock-music-backdrop" onClick={onClose}>
    <section className="dock-music-window dashboard-ui" role="dialog" aria-modal="true" aria-label="Music" onClick={event => event.stopPropagation()}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); onClose() }
        if (event.key === 'Tab') {
          const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button, input')]
          const first = focusable[0], last = focusable[focusable.length - 1]
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }
      }}>
      <header><div><span>Music</span><small>Your library</small></div><button ref={closeRef} className="dock-music-close" aria-label="Close music window" onClick={onClose}>×</button></header>
      <div className="dock-music-body">
        <div className="dock-music-playing">
          <img className="dock-music-cover" src={track.cover} alt={`${track.title} album cover`} draggable={false} />
          <div className="dock-music-title"><div><h2>{track.title}</h2><p>{track.artist}</p></div><button className="dock-music-favorite" aria-label="Favorite current song" aria-pressed={favorites.includes(index)} onClick={onFavorite}>{favorites.includes(index) ? '♥' : '♡'}</button></div>
          <input className="dock-music-progress" type="range" aria-label="Song position" min="0" max={track.duration} step="1" value={elapsed} onChange={event => onSeek(Number(event.target.value))} />
          <div className="dock-music-times"><span>{time(elapsed)}</span><span>{time(track.duration)}</span></div>
          <div className="dock-music-transport">
            <IconButton label="Previous song" onClick={() => onSelect((index + tracks.length - 1) % tracks.length)}><DashboardIcon name="previous" size={36} /></IconButton>
            <IconButton className="dock-music-play" label={playing ? 'Pause music' : 'Play music'} onClick={onPlaying}>{playing ? <DashboardIcon name="pause" size={38} /> : <span className="play-symbol" />}</IconButton>
            <IconButton label="Next song" onClick={() => onSelect((index + 1) % tracks.length)}><DashboardIcon name="next" size={36} /></IconButton>
          </div>
        </div>
        <div className="dock-music-library"><div className="dock-music-list-title"><h3>Up next</h3><span>{tracks.length} songs</span></div>
          {tracks.map((song, i) => <button className="dock-music-song" key={song.title} aria-label={`Play ${song.title}`} aria-pressed={index === i} onClick={() => onSelect(i)}><img src={song.cover} alt="" draggable={false} /><span><strong>{song.title}</strong><small>{song.artist}</small></span><span className="dock-music-song-time">{index === i && playing ? '♫' : time(song.duration)}</span></button>)}
        </div>
      </div>
    </section>
  </div>
}
