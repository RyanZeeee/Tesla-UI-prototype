import { useState } from 'react'
import albumCover from '../assets/artwork/album-cover.svg'
import { DashboardIcon, IconButton } from './DashboardIcon'

interface NowPlayingProps {
  expandLabel?: string
  title?: string
  artist?: string
  coverSrc?: string
  progress?: number
  playing?: boolean
  onPlayingChange?: (playing: boolean) => void
  onProgressChange?: (progress: number) => void
  onPrevious?: () => void
  onNext?: () => void
  onSearch?: () => void
  onExpand?: () => void
}

export function NowPlaying({ expandLabel = "Expand player", title = "Under Mount Fuji", artist = "Eason Chan", coverSrc = albumCover, progress,
  playing, onPlayingChange, onProgressChange, onPrevious, onNext, onSearch, onExpand }: NowPlayingProps) {
  const [localPlaying, setLocalPlaying] = useState(true)
  const [localProgress, setLocalProgress] = useState(182 / 540 * 100)
  const isPlaying = playing ?? localPlaying
  const currentProgress = Math.max(0, Math.min(100, progress ?? localProgress))

  function togglePlayback() {
    setLocalPlaying(!isPlaying)
    onPlayingChange?.(!isPlaying)
  }

  return (
    <section className="now-playing dashboard-card dashboard-ui" aria-label="Now playing">
      <div className="track-info" role="button" tabIndex={0} aria-label="View track details" onClick={onExpand} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onExpand?.() } }}>
        <img className="album-cover" src={coverSrc} alt={`${title} cover art`} draggable={false} />
        <div className="track-copy"><div className="track-title">{title}</div><div className="track-artist">{artist}</div></div>
      </div>
      <div className="track-progress" onClick={event => event.stopPropagation()}>
        <div className="track-progress-fill" style={{ width: `${currentProgress}%` }} />
        <input aria-label="Playback progress" type="range" min={0} max={100} step={0.1} value={currentProgress}
          onChange={event => { const value = Number(event.target.value); setLocalProgress(value); onProgressChange?.(value) }} />
      </div>
      <div className="playback-controls" onClick={event => event.stopPropagation()}>
        <IconButton label="Previous track" onClick={onPrevious}><DashboardIcon name="previous" /></IconButton>
        <IconButton label={isPlaying ? "Pause" : "Play "} aria-pressed={isPlaying} onClick={togglePlayback}>
          {isPlaying ? <DashboardIcon name="pause" /> : <span className="play-symbol" />}
        </IconButton>
        <IconButton label="Next track" onClick={onNext}><DashboardIcon name="next" /></IconButton>
        <IconButton label="Search music" onClick={onSearch}><DashboardIcon name="search" /></IconButton>
        <IconButton label={expandLabel} onClick={onExpand}><DashboardIcon name="collapse" /></IconButton>
      </div>
    </section>
  )
}
