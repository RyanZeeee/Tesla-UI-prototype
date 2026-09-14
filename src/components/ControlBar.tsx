import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import model3Icon from '../assets/icons/model3-icon.svg'
import defrostIcon from '../assets/icons/defrost.svg'
import heaterIcon from '../assets/icons/heater.svg'
import seat1Icon from '../assets/icons/seat1.svg'
import seat2Icon from '../assets/icons/seat2.svg'
import musicIcon from '../assets/icons/music.svg'
import appCloseIcon from '../assets/icons/app close.svg'
import appOpenIcon from '../assets/icons/app open.svg'
import { FanControl, TemperatureControl, VolumeControl } from './ClimateControls'
import { IconButton } from './DashboardIcon'

interface ControlBarProps {
  settingsOpen?: boolean
  climateOpen?: boolean
  driverSeatOpen?: boolean
  passengerSeatOpen?: boolean
  musicOpen?: boolean
  onMusicClick?: () => void
  appToastOpen: boolean
  onAppClick: () => void
  onModel3Click: () => void
  driverTemperature?: number
  passengerTemperature?: number
  volume?: number
  fanMode?: string
  fanLevel?: number
  onDriverTemperatureChange?: (value: number) => void
  onPassengerTemperatureChange?: (value: number) => void
  onVolumeChange?: (value: number) => void
  onFanClick?: () => void
  onTemperatureClick?: () => void
  onDriverSeatClick?: () => void
  onPassengerSeatClick?: () => void
}

export function ControlBar({ settingsOpen, climateOpen, driverSeatOpen, passengerSeatOpen, musicOpen, onMusicClick, appToastOpen, onAppClick, onModel3Click, driverTemperature, passengerTemperature,
  volume, fanMode, fanLevel, onDriverTemperatureChange, onPassengerTemperatureChange, onVolumeChange, onFanClick, onTemperatureClick, onDriverSeatClick, onPassengerSeatClick }: ControlBarProps) {
  const [localDriverTemperature, setDriverTemperature] = useState(20)
  const [localPassengerTemperature, setPassengerTemperature] = useState(20)
  const [localVolume, setVolume] = useState(65)
  const [frontDefrost, setFrontDefrost] = useState(false)
  const [rearDefrost, setRearDefrost] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string } | null>(null)
  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(null), 1800)
    return () => window.clearTimeout(timer)
  }, [feedback])
  const active: Record<string, boolean | undefined> = { vehicle: settingsOpen, driverSeat: driverSeatOpen, passengerSeat: passengerSeatOpen, fan: climateOpen, driverTemperature: climateOpen, passengerTemperature: climateOpen, music: musicOpen, apps: appToastOpen, defrost: frontDefrost, heater: rearDefrost }

  const icon = (src: string, label: string, onClick?: () => void, pressed?: boolean) => (
    <IconButton label={label} onClick={onClick} aria-pressed={pressed}><img src={src} alt="" width={48} height={48} /></IconButton>
  )
  const controls: { key: string; gap: number; content: ReactNode }[] = [
    { key: 'vehicle', gap: 0, content: icon(model3Icon, "Vehicle settings", onModel3Click, settingsOpen) },
    { key: 'defrost', gap: 100, content: icon(defrostIcon, "Front defrost", () => { setFrontDefrost(!frontDefrost); setFeedback({ text: `Front defrost ${frontDefrost ? "off" : "on"}` }) }, frontDefrost) },
    { key: 'heater', gap: 100, content: icon(heaterIcon, "Rear defrost", () => { setRearDefrost(!rearDefrost); setFeedback({ text: `Rear defrost ${rearDefrost ? "off" : "on"}` }) }, rearDefrost) },
    { key: 'driverSeat', gap: 100, content: icon(seat1Icon, "Driver seat", onDriverSeatClick, driverSeatOpen) },
    { key: 'driverTemperature', gap: 80, content: <TemperatureControl label="Driver temperature" value={driverTemperature ?? localDriverTemperature} onOpen={onTemperatureClick}
      onChange={value => { setDriverTemperature(value); onDriverTemperatureChange?.(value) }} /> },
    { key: 'fan', gap: 25, content: <FanControl mode={fanMode} level={fanLevel} onClick={onFanClick} /> },
    { key: 'passengerTemperature', gap: 25, content: <TemperatureControl label="Passenger temperature" value={passengerTemperature ?? localPassengerTemperature} onOpen={onTemperatureClick}
      onChange={value => { setPassengerTemperature(value); onPassengerTemperatureChange?.(value) }} /> },
    { key: 'passengerSeat', gap: 80, content: icon(seat2Icon, "Passenger seat", onPassengerSeatClick, passengerSeatOpen) },
    { key: 'music', gap: 100, content: icon(musicIcon, "Music", onMusicClick, musicOpen) },
    { key: 'apps', gap: 100, content: icon(appToastOpen ? appOpenIcon : appCloseIcon, appToastOpen ? "Close app launcher" : "Open app launcher", onAppClick, appToastOpen) },
    { key: 'volume', gap: 100, content: <VolumeControl value={volume ?? localVolume}
      onChange={value => { setVolume(value); onVolumeChange?.(value) }} /> },
  ]

  return (
    <div className="dashboard-ui dock-controls" style={{ position: 'relative', width: 1920, height: 120, background: 'var(--color-controlbar)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {feedback && <div className="dock-feedback" role="status" key={feedback.text}>{feedback.text}</div>}
      {controls.map(control => <div key={control.key} data-dock-control={control.key} data-active={active[control.key] || undefined} style={{ marginLeft: control.gap, flexShrink: 0 }}>{control.content}</div>)}
    </div>
  )
}
