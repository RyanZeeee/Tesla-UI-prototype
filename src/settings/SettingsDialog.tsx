import { useEffect, useRef, useState } from 'react'
import { manualBase, type Preferences } from './settingsData'

interface Props {
  action: { id: string; title: string; key?: { id: number; name: string; type: string } }
  values: Preferences
  keyCount: number
  onClose: () => void
  onSave: (updates: Preferences, message?: string) => void
  onKeySave: (name: string, type: string) => void
  onKeyRemove: () => void
  onReset: () => void
  onClean: () => void
}
const explanations: Record<string, string> = {
  cameraCalibration: "Camera calibration is completed while driving. This demo clears the previous calibration and shows the waiting-for-drive state.",
  washMode: "Car Wash Mode closes windows, locks the charge port, and pauses automatic wipers and walk-away locking. This is a demonstration of the flow.",
  towing: "Tow Mode prepares the vehicle for loading onto a flatbed truck. This prototype only demonstrates the mode; it does not operate a vehicle.",
  browserData: "Preview the confirmation for clearing the in-car browser cache. Your current browser data will remain unchanged.",
  powerOff: "Power can be turned off while parked. This demo shows the power-off flow; select Wake to return.",
  resetSettings: "Restore vehicle settings to their defaults. Added demo keys will be kept.",
  cleanScreen: "The display dims and other controls are temporarily disabled. Exit to return to the previous screen.",
}
export function SettingsDialog({ action, values, keyCount, onClose, onSave, onKeySave, onKeyRemove, onReset, onClean }: Props) {
  const { id, title } = action
  const dialog = useRef<HTMLDivElement>(null)
  const [name, setName] = useState(action.key?.name || '')
  const [keyType, setKeyType] = useState(action.key?.type || "Key Card")
  const [pin, setPin] = useState('')
  const [remove, setRemove] = useState(false)
  const [side, setSide] = useState("Left")
  const [draft, setDraft] = useState<Preferences>({ ...values })
  const [wheel, setWheel] = useState(String(values.wheels || "18-inch Aero"))
  const [tire, setTire] = useState(String(values.tires || "All-season"))
  const [poweredOff, setPoweredOff] = useState(false)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const focusable = dialog.current?.querySelector<HTMLElement>('input, button, a')
    focusable?.focus({ preventScroll: true })
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [])
  const adjustment = ['mirrors', 'steering', 'headlightAim'].includes(id)
  const prefix = id === 'mirrors' ? `mirror${side === "Left" ? 'Left' : 'Right'}` : id
  const x = Number(draft[`${prefix}X`] || 0), y = Number(draft[`${prefix}Y`] || 0)
  function nudge(dx: number, dy: number) { setDraft(current => ({ ...current, [`${prefix}X`]: Math.max(-5, Math.min(5, x + dx)), [`${prefix}Y`]: Math.max(-5, Math.min(5, y + dy)) })) }
  function confirm() {
    if (adjustment) {
      const updates = Object.fromEntries(Object.entries(draft).filter(([key]) => key.startsWith(id === 'mirrors' ? 'mirror' : id)))
      onSave(updates, `${title} position saved`)
    } else if (id === 'addKey' || id === 'editKey') onKeySave(name.trim(), keyType)
    else if (id === 'drivePin' || id === 'glovePin') onSave({ [id]: !values[id] }, values[id] ? "PIN protection off · Demo" : "PIN setup complete · Demo")
    else if (id === 'wheels') onSave({ wheels: wheel, tires: tire }, "Wheel and tire settings updated")
    else if (id === 'resetSettings') onReset()
    else if (id === 'cleanScreen') onClean()
    else if (id === 'powerOff') setPoweredOff(true)
    else if (id === 'cameraCalibration') onSave({ cameraCalibration: true }, "Calibration: waiting for a drive · Demo")
    else if (id === 'washMode' || id === 'towing') onSave({ [id]: !values[id] }, `${title}${values[id] ? " exited" : " on"} · Demo`)
    else onSave({}, "Clear-data flow complete · Demo")
  }
  const pinDialog = id === 'drivePin' || id === 'glovePin'
  const canSave = (id === 'addKey' || id === 'editKey') ? !!name.trim() : pinDialog ? /^[0-9]{4}$/.test(pin) : true
  const informationOnly = ['manual', 'maintenance'].includes(id)
  return <div className="settings-dialog-scrim" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="settings-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose() }
      if (event.key === 'Tab') {
        const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]'))
        const first = focusable[0], last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }}>
      <header><h2 id="settings-dialog-title">{poweredOff ? "Power off · Demo" : title}</h2><button aria-label="Close settings dialog" onClick={onClose}>×</button></header>
      <div className="settings-dialog-body">
        {adjustment && <>
          <p>{id === 'mirrors' ? "Select a mirror, then use the arrows to adjust it." : id === 'steering' ? "Use up/down to adjust height and left/right to adjust reach." : "Use the arrows to adjust the headlight aim."}</p>
          {id === 'mirrors' && <div className="settings-segments">{["Left", "Right"].map(label => <button key={label} aria-pressed={side === label} onClick={() => setSide(label)}>{label}</button>)}</div>}
          <div className="settings-adjust-preview"><svg viewBox="0 0 300 160" aria-hidden="true"><g transform={`translate(${x * 4},${-y * 4})`}>
            {id === 'steering' ? <><circle cx="150" cy="80" r="62" fill="#171c22" stroke="#7c8791" strokeWidth="12"/><path d="m88 70 36 25 16 41h20l16-41 36-25" fill="#434d58"/><ellipse cx="150" cy="82" rx="40" ry="22" fill="#555f6b"/></> : id === 'mirrors' ? <><path d="M62 45Q80 21 205 33l39 82q-80 40-159 4Z" fill="#202b35" stroke="#8794a1" strokeWidth="3"/><path d="m90 112 130-50M81 92l109-49" stroke="#526371" strokeWidth="3"/></> : <><path d="M235 38q-55 0-55 43t55 43Z" fill="#465463"/>{[45,65,85,105].map(row=><path key={row} d={`M165 ${row} 35 ${row+12}`} stroke="#b2d6ed" strokeWidth="3"/>)}</>}
          </g></svg></div>
          <div className="settings-direction-pad"><button aria-label="Adjust up" onClick={() => nudge(0, 1)}>↑</button><button aria-label="Adjust left" onClick={() => nudge(-1, 0)}>←</button><button aria-label="Reset adjustment" onClick={() => setDraft(current => ({ ...current, [`${prefix}X`]: 0, [`${prefix}Y`]: 0 }))}>Reset</button><button aria-label="Adjust right" onClick={() => nudge(1, 0)}>→</button><button aria-label="Adjust down" onClick={() => nudge(0, -1)}>↓</button></div>
          <output className="settings-adjust-value">Horizontal {x > 0 ? '+' : ''}{x} · Vertical {y > 0 ? '+' : ''}{y}</output>
        </>}
        {(id === 'addKey' || id === 'editKey') && <><p>Set a name and type for this demo key.</p><label className="settings-text-input">Key name<input autoComplete="off" maxLength={24} placeholder="e.g. Spare card" value={name} onChange={event => setName(event.target.value)} /></label><div className="settings-segments">{["Phone Key", "Key Card"].map(type => <button key={type} aria-pressed={keyType === type} onClick={() => setKeyType(type)}>{type}</button>)}</div>{action.key && <div className="settings-remove-key">{remove ? <><p>Remove “{action.key.name}”?</p><button onClick={onKeyRemove}>Confirm removal</button></> : <button disabled={keyCount < 2} onClick={() => setRemove(true)}>Remove this key</button>}{keyCount < 2 && <small>Keep at least one key.</small>}</div>}</>}
        {pinDialog && <><p>{values[id] ? "Enter four digits to demonstrate turning off PIN protection." : "Enter four digits to try PIN setup."} Only the enabled state is saved, not the digits you enter.</p><label className="settings-text-input">Four-digit demo PIN<input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ''))}/></label></>}
        {id === 'wheels' && <><p>Select the wheels and tires currently fitted to the vehicle.</p><h3>Wheels</h3><div className="settings-segments">{["18-inch Aero", "19-inch Sport", "20-inch"].map(option => <button key={option} aria-pressed={wheel === option} onClick={() => setWheel(option)}>{option}</button>)}</div><h3>Tires</h3><div className="settings-segments">{["Summer", "All-season", "Winter"].map(option => <button key={option} aria-pressed={tire === option} onClick={() => setTire(option)}>{option}</button>)}</div></>}
        {id === 'maintenance' && <><p>Based on the China-market Model 3 manual. Adjust intervals to suit actual use.</p><dl className="settings-info-list"><div><dt>Cabin air filter</dt><dd>Replace annually</dd></div><div><dt>Wiper blades</dt><dd>Replace annually</dd></div><div><dt>Brake fluid condition</dt><dd>Check every 4 years</dd></div><div><dt>Tire rotation</dt><dd>Every 10,000 km, or at a 1.5 mm difference in tread depth</dd></div></dl><a href={`${manualBase}GUID-E95DAAD9-646E-4249-9930-B109ED7B1D91.html`} target="_blank" rel="noreferrer">View official maintenance guidance ↗</a></>}
        {id === 'manual' && <><p>MODEL 3 · 2017–2023</p><div className="settings-manual-links">{[["Owner’s Manual", ''], ["Lights & lighting", 'GUID-371B94E9-E74F-4BBB-9A55-5F4182894B99.html'], ["Driver assistance", 'GUID-20F2262F-CDF6-408E-A752-2AD9B0CC2FD6.html'], ["Maintenance", 'GUID-E95DAAD9-646E-4249-9930-B109ED7B1D91.html']].map(([label,path]) => <a key={label} href={manualBase + path} target="_blank" rel="noreferrer">{label}<span>↗</span></a>)}</div></>}
        {explanations[id] && <p>{explanations[id]}</p>}
        {id === 'washMode' && <div className="settings-mode-checks"><span>Windows closed</span><span>Charge port locked</span><span>Wipers off</span><span>Walk-away locking paused</span></div>}
        {id === 'towing' && <p className="settings-muted">Follow the transportation instructions in the Owner’s Manual for actual use.</p>}
        {poweredOff && <div className="settings-power-symbol">⏻</div>}
      </div>
      <footer><button onClick={onClose}>{informationOnly || poweredOff ? "Done" : "Cancel"}</button>{!informationOnly && <button className="settings-primary" disabled={!canSave} onClick={poweredOff ? onClose : confirm}>{poweredOff ? "Wake" : id === 'cleanScreen' ? "Enter cleaning mode" : id === 'washMode' || id === 'towing' ? values[id] ? "Exit mode" : "Enable mode" : pinDialog && values[id] ? "Disable protection" : adjustment || id === 'wheels' || id === 'editKey' ? "Save" : id === 'addKey' ? "Add key" : "Confirm"}</button>}</footer>
    </div>
  </div>
}
