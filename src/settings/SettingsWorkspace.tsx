import tireCar from '../assets/vehicle/tire-car.svg'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { dialogDefaults, defaultPreferences, pageDescriptions, preferenceFields, settingsSections, type Preferences, type SettingField, type SettingValue, type SettingsPage } from './settingsData'
import { SettingsDialog } from './SettingsDialog'
import { migratePreference } from './legacyPreferences'
import './settings.css'

const storageKey = 'tesla-prototype.vehicle-settings.v1'
function readPreferences(): Preferences {
  const values = { ...defaultPreferences }
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || '{}')
    if (!saved || typeof saved !== 'object') return values
    for (const field of preferenceFields) {
      const value = migratePreference((saved as Preferences)[field.id])
      if (typeof value !== typeof field.initial) continue
      if (field.kind === 'select' && !field.options?.includes(String(value))) continue
      if (field.kind === 'range' && (typeof value !== 'number' || !Number.isFinite(value) || value < field.min! || value > field.max!)) continue
      if (field.initial !== undefined) values[field.id] = value
    }
    for (const [id, initial] of Object.entries(dialogDefaults)) {
      const value = migratePreference((saved as Preferences)[id])
      if (typeof value !== typeof initial) continue
      if (typeof value === 'number' && (!Number.isInteger(value) || Math.abs(value) > 5)) continue
      if (id === 'wheels' && !["18-inch Aero", "19-inch Sport", "20-inch"].includes(String(value))) continue
      if (id === 'tires' && !["Summer", "All-season", "Winter"].includes(String(value))) continue
      values[id] = value
    }
  } catch { /* Use defaults when browser storage is unavailable or invalid. */ }
  return values
}

function SettingsField({ field, values, onChange, onAction }: { field: SettingField; values: Preferences; onChange: (id: string, value: SettingValue) => void; onAction: (id: string, title: string) => void }) {
  const { id, label, description, kind } = field
  const value = values.washMode && id === 'wipers' ? "Off" : values.washMode && id === 'walkAway' ? false : values[id]
  const disabled = (id === 'acceleration' && !!values.speedLimit) || (['wipers', 'walkAway'].includes(id) && !!values.washMode) || !!field.requires && !values[field.requires] || (['frontFog', 'rearFog'].includes(id) && ["Off", "Parking"].includes(String(values.headlights))) || (id === 'securityAlarm' && !!values.sentry)
  const extra = id === 'securityAlarm' && values.sentry ? "Sentry Mode is managing the parking alarm." : description
  const status = kind === 'action' ? (id === 'glovebox' ? values.glovebox ? "Open" : "Closed" : id === 'drivePin' || id === 'glovePin' ? values[id] ? "Set" : "Not set" : id === 'wheels' ? String(values.wheels || "18-inch Aero") : id === 'washMode' || id === 'towing' ? values[id] ? "On" : "Off" : id === 'cameraCalibration' ? values.cameraCalibration ? "Waiting for a drive" : "Calibrated" : '') : ''
  const titleId = `setting-label-${id}`
  return <div className={`vehicle-setting field-${kind}`} data-setting={id} data-disabled={disabled || undefined}>
    {kind === 'action' ? <button className="settings-action-row" onClick={() => onAction(id, label)} aria-label={label}>
      <span><strong>{label}</strong>{extra && <small>{extra}</small>}</span><span className="settings-action-status">{status}<b aria-hidden="true">›</b></span>
    </button> : <>
      <div className="settings-field-label"><span><strong id={titleId}>{label}</strong>{extra && <small>{extra}</small>}</span>
        {kind === 'toggle' && <button className="settings-toggle" role="switch" aria-label={label} aria-checked={!!value} disabled={disabled} onClick={() => onChange(id, !value)}><i /></button>}
        {kind === 'range' && <output htmlFor={`setting-${id}`}>{value}<small>{field.unit}</small></output>}
      </div>
      {kind === 'select' && <div className="settings-segments" role="group" aria-labelledby={titleId}>{field.options!.map(option => <button key={option} aria-pressed={value === option} disabled={disabled} onClick={() => onChange(id, option)}>{option}</button>)}</div>}
      {kind === 'range' && <input id={`setting-${id}`} aria-label={label} type="range" min={field.min} max={field.max} step={field.step || 1} value={Number(value)} disabled={disabled} onChange={event => onChange(id, Number(event.target.value))}
        style={{ '--range-fill': `${(Number(value) - field.min!) / (field.max! - field.min!) * 100}%` } as CSSProperties} />}
    </>}
  </div>
}

function SettingsPreview({ page, values }: { page: SettingsPage; values: Preferences }) {
  if (page === "Autopilot") return <div className="settings-hero driver-preview">
    <div><span className="settings-eyebrow">AUTOPILOT</span><h2>{String(values.autopilot)}</h2><p>Following distance: {String(values.followDistance)}</p></div>
    <svg viewBox="0 0 330 200" aria-hidden="true"><defs><linearGradient id="road-fill" x2="0" y2="1"><stop stopColor="#243647" stopOpacity="0"/><stop offset="1" stopColor="#354d62" stopOpacity=".65"/></linearGradient></defs><path d="m120 0-110 200h310L210 0" fill="url(#road-fill)"/><path d="m120 0-80 200M210 0l80 200" stroke={values.autopilot === "Autosteer" ? '#a3d5ff' : '#768594'} strokeWidth="3"/><path d="M165 0v200" stroke="#8b9ca9" strokeDasharray="10 18" opacity=".35"/><rect x="143" y="106" width="44" height="76" rx="15" fill="#c0c5cd"/><path d="m150 123 30 0 3 24h-36z" fill="#27323b"/><rect x="153" y="40" width="24" height="38" rx="8" fill="#555f69"/></svg>
  </div>
  if (page === "Display") return <div className={`settings-display-preview ${values.appearance === "Light" ? 'is-light' : ''} ${values.reduceBlue ? 'is-warm' : ''}`} style={{ '--display-brightness': .5 + Number(values.brightness) / 200 } as CSSProperties}>
    <span>Display preview</span><div className={values.textSize === "Large" ? 'large-clock' : ''}>{values.timeFormat === "24-hour" ? '22:21' : '10:21'}<small>{values.timeFormat === "12-hour" ? 'PM' : ''}</small></div><p>{values.temperatureUnit === '°F' ? '63 °F' : '17 °C'}<i/> {values.energyDisplay === "Percentage" ? '100%' : values.distanceUnit === "Miles" ? '272 mi' : '438 km'}</p>
  </div>
  if (page === "Dynamics") return <div className="settings-hero dynamics-preview"><div><span className="settings-eyebrow">DRIVING</span><h2>{String(values.acceleration)} acceleration</h2><p>{String(values.steeringWeight)} steering · {String(values.stoppingMode)} stopping</p></div><svg viewBox="0 0 320 170" aria-hidden="true"><path d="M10 140h300M10 140V15" stroke="#48515b" fill="none"/><path d={values.acceleration === "Chill" ? 'M10 138C120 138 140 65 305 20' : 'M10 138C65 125 100 32 305 20'} stroke="#bccddb" strokeWidth="3" fill="none"/><path d="M10 85h300M10 35h300" stroke="#ffffff09" strokeDasharray="5 8"/></svg></div>
  if (page === "Safety") return <div className="settings-summary"><div><span className={`status-dot ${values.sentry ? 'active' : ''}`}/><span>Sentry Mode<strong>{values.sentry ? "On" : "Off"}</strong></span></div><div><span className={`status-dot ${values.dashcam !== "Off" ? 'active' : ''}`}/><span>Dashcam<strong>{String(values.dashcam)}</strong></span></div></div>
  if (page === "Lights") return <div className="settings-hero lights-preview"><div><span className="settings-eyebrow">LIGHTING</span><h2>{String(values.headlights)} lighting</h2><p>Exterior lighting settings</p></div><svg viewBox="0 0 320 160" aria-hidden="true"><path d="M230 30c-35 0-55 25-55 50s20 50 55 50V30Z" fill="#ffffff08" stroke="#c0c6cd" strokeWidth="3"/>{[40,60,80,100,120].map(y=><path key={y} d={`M155 ${y} 30 ${y + 15}`} stroke={values.headlights === "Off" ? '#303740' : '#d1e8f7'} strokeWidth="3" opacity={values.headlights === "Parking" ? '.3' : '1'}/>)}</svg></div>
  if (page === "Service") {
    const psi = values.pressureUnit === 'PSI'
    return <div className="settings-tires"><div className="settings-tire-heading"><span>Tire pressure</span><small>Demo readings · {psi ? 'PSI' : 'BAR'}</small></div><div className="settings-tire-diagram"><img src={tireCar} alt="Vehicle top view" draggable={false} />{[43,44,44,44].map((pressure,i)=><div className={`settings-tire-value wheel-${i}`} key={i}><small>{["Front left","Front right","Rear left","Rear right"][i]}</small><strong>{psi ? pressure : (pressure / 14.5038).toFixed(1)}</strong></div>)}</div></div>
  }
  return null
}

interface KeyEntry { id: number; name: string; type: string }
const keysStorageKey = `${storageKey}.keys`
function readKeys(): KeyEntry[] {
  const defaults = [{ id: 1, name: "My Phone", type: "Phone Key" }, { id: 2, name: "Key Card", type: "Key Card" }]
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(keysStorageKey) || 'null')
    if (!Array.isArray(saved) || !saved.length) return defaults
    const migrated = saved.map(key => key && typeof key === 'object' ? { ...key, name: migratePreference(key.name), type: migratePreference(key.type) } : key)
    const valid = migrated.every(key => key && typeof key === 'object' && Number.isSafeInteger(key.id) && typeof key.name === 'string' && key.name.trim().length > 0 && key.name.length <= 24 && ["Phone Key", "Key Card"].includes(key.type))
    return valid && new Set(migrated.map(key => key.id)).size === migrated.length ? migrated : defaults
  } catch { return defaults }
}
export function SettingsWorkspace({ page, visible = true }: { page: SettingsPage; visible?: boolean }) {
  const [values, setValues] = useState<Preferences>(readPreferences)
  const [keys, setKeys] = useState<KeyEntry[]>(readKeys)
  const [dialog, setDialog] = useState<{ id: string; title: string; key?: KeyEntry } | null>(null)
  const [message, setMessage] = useState('')
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [cleaning, setCleaning] = useState<HTMLDivElement | null>(null)
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(values)) } catch { /* Preferences still work without storage. */ } }, [values])
  useEffect(() => { try { localStorage.setItem(keysStorageKey, JSON.stringify(keys)) } catch { /* Key management remains available for this session. */ } }, [keys])
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current) }, [])
  function notify(text: string) { setMessage(text); if (noticeTimer.current) clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setMessage(''), 2600) }
  function change(id: string, value: SettingValue) {
    setValues(current => {
      const next = { ...current, [id]: value }
      if (id === 'headlights' && ["Off", "Parking"].includes(String(value))) { next.frontFog = false; next.rearFog = false }
      if (id === 'speedLimit' && value) next.acceleration = "Chill"
      return next
    })
  }
  function action(id: string, title: string) {
    if (id === 'glovebox') { change('glovebox', !values.glovebox); notify(values.glovebox ? "Glovebox closed · Demo" : "Glovebox open · Demo"); return }
    if (id === 'saveClip') { notify(values.dashcam === "Off" ? "Turn on Dashcam first" : "Clip-saving flow complete"); return }
    setDialog({ id, title })
  }
  return <div className="settings-workspace dashboard-ui" ref={host}>
    <div className="vehicle-settings-scroll" key={page} role="tabpanel" id="vehicle-settings-panel" aria-labelledby={`settings-tab-${page}`} tabIndex={0}>
      <header className="vehicle-settings-heading"><div><h1>{page}</h1><p>{pageDescriptions[page]}</p></div><span>P</span></header>
      <SettingsPreview page={page} values={values}/>
      {page === "Locks" && <section className="settings-section"><div className="settings-section-heading"><h2>Keys</h2><button onClick={()=>action('addKey',"Add key")}>＋ Add</button></div><div className="settings-keys">{keys.map(key=><button key={key.id} onClick={()=>setDialog({id:'editKey',title:"Manage key",key})}><svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">{key.type === "Phone Key" ? <><rect x="9" y="3" width="18" height="30" rx="4"/><path d="M15 28h6"/></> : <><rect x="3" y="7" width="30" height="22" rx="3"/><path d="M23 12h5m-5 4h5"/></>}</svg><span>{key.name}<small>{key.type}</small></span><b>›</b></button>)}</div></section>}
      {settingsSections[page].map(section=><section key={section.title} className="settings-section"><h2>{section.title}</h2>{section.fields.map(field=><SettingsField key={field.id} field={field} values={values} onChange={change} onAction={action}/>)}</section>)}
      <footer className="settings-page-footer">MODEL 3<span>Settings saved automatically</span></footer>
    </div>
    {message && visible && <div className="settings-notice" role="status">{message}</div>}
    {dialog && visible && <SettingsDialog key={`${dialog.id}-${dialog.key?.id || ''}`} action={dialog} values={values} keyCount={keys.length} onClose={()=>setDialog(null)}
      onSave={(updates, feedback) => { setValues(current=>({...current,...updates})); setDialog(null); if (feedback) notify(feedback) }}
      onKeySave={(name,type)=>{ setKeys(current=>dialog.key ? current.map(key=>key.id===dialog.key!.id ? {...key,name,type} : key) : [...current,{id:Date.now(),name,type}]); setDialog(null); notify("Key list updated") }}
      onKeyRemove={()=>{setKeys(current=>current.filter(key=>key.id!==dialog.key?.id));setDialog(null);notify("Key removed")}}
      onReset={()=>{setValues({...defaultPreferences});setDialog(null);notify("Vehicle settings reset")}}
      onClean={()=>{setDialog(null);setCleaning(host.current)}}/>}
    {cleaning && visible && <ScreenCleaning host={cleaning} onClose={()=>setCleaning(null)}/>}
  </div>
}

// This portal covers the scaled prototype, including its Dock.
function ScreenCleaning({ host, onClose }: { host: HTMLDivElement | null; onClose: () => void }) {
  const exit = useRef<HTMLButtonElement>(null)
  useEffect(()=>{ const previous=document.activeElement as HTMLElement | null; exit.current?.focus({preventScroll:true});return()=>previous?.focus({preventScroll:true}) },[])
  const target = host?.closest('[data-dashboard-canvas]') || host
  if (!target) return null
  return createPortal(<div className="settings-clean-screen" role="dialog" aria-modal="true" aria-label="Screen cleaning mode" onKeyDown={event=>{if(event.key==='Tab'){event.preventDefault();exit.current?.focus()}if(event.key==='Escape'){event.stopPropagation();onClose()}}}><span>Screen cleaning mode</span><p>Select the button below when you have finished cleaning</p><button ref={exit} onClick={onClose}>Exit cleaning mode</button></div>,target)
}
