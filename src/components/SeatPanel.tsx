import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { clampSeat, defaultSeats, readSeats, seatLimits, seatStorageKey, type SeatAxis, type SeatPair, type SeatSide } from '../seats/seatState'
import type { SeatScene, SeatView } from '../seats/createSeatScene'
import './seats.css'

interface Props { visible: boolean; selected: SeatSide; onSelect: (side: SeatSide) => void; onClose: () => void }
const axes: Record<SeatAxis, string> = { position:" position", recline:" recline" }
const name = (side: SeatSide) => side === 0 ? "Driver" : "Passenger"
function Arrow({ direction }: { direction: 'up' | 'down' | 'left' | 'right' }) {
  return <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" style={{transform:`rotate(${direction==='up'?0:direction==='down'?180:direction==='left'?-90:90}deg)`}}><path d="m7 14 5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function SeatModel(props: SeatView) {
  const host = useRef<HTMLDivElement>(null), scene = useRef<SeatScene | null>(null), latest = useRef(props)
  const [started,setStarted]=useState(false),[attempt,setAttempt]=useState(0),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading')
  if(props.visible&&!started)setStarted(true)
  useEffect(()=>{
    if(!started||!host.current)return
    const element=host.current;let disposed=false,view:SeatScene|undefined
    import('../seats/createSeatScene').then(({createSeatScene})=>{if(disposed)return;view=createSeatScene(element,next=>{if(!disposed)setStatus(next)});scene.current=view;view.update(latest.current)}).catch(()=>{if(!disposed)setStatus('error')})
    return()=>{disposed=true;scene.current=null;view?.dispose()}
  },[started,attempt])
  useEffect(()=>{latest.current=props;scene.current?.update(props)},[props])
  return <><div className="seat-render" ref={host} data-seat-status={status}/>{status==='loading'&&<div className="seat-loading" role="status" aria-label="Loading seat model"><i/></div>}{status==='error'&&<button className="seat-retry" aria-label="Reload seat model" onClick={()=>{setStatus('loading');setAttempt(i=>i+1)}}><svg viewBox="0 0 24 24" width="36" height="36"><path d="M20 11a8 8 0 1 0-2 7M20 5v6h-6" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></button>}</>
}
type Adjustment = {side: SeatSide; axis: SeatAxis}
export function SeatPanel({visible,selected,onSelect,onClose}: Props) {
  const panel=useRef<HTMLElement>(null),stage=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null)
  const [poses,setPoses]=useState<SeatPair>(readSeats)
  const [active,setActive]=useState<Adjustment|null>(null),[hovered,setHovered]=useState<Adjustment|null>(null),[motion,setMotion]=useState<Adjustment|null>(null)
  const flashTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
  const repeatTimer=useRef<ReturnType<typeof setTimeout>|null>(null), repeatInterval=useRef<ReturnType<typeof setInterval>|null>(null),held=useRef(false)
  const drag=useRef<{id:number;side:SeatSide;axis:SeatAxis;x:number;y:number;initial:number;width:number;height:number;target:HTMLElement}|null>(null)
  useEffect(()=>{try{localStorage.setItem(seatStorageKey,JSON.stringify(poses))}catch{/* Adjustment remains available without storage. */}},[poses])
  function stopRepeat(){if(repeatTimer.current)clearTimeout(repeatTimer.current);if(repeatInterval.current)clearInterval(repeatInterval.current);repeatTimer.current=null;repeatInterval.current=null}
  useEffect(()=>()=>{if(flashTimer.current)clearTimeout(flashTimer.current);stopRepeat()},[])
  useEffect(()=>{
    if(!visible)return
    const previous=document.activeElement as HTMLElement|null;close.current?.focus({preventScroll:true})
    function outside(event:MouseEvent){
      if(!(event.target instanceof Node)||panel.current?.contains(event.target))return
      if(event.target instanceof Element&&event.target.closest('[data-dock-control="vehicle"],[data-dock-control="driverSeat"],[data-dock-control="passengerSeat"],[data-dock-control="driverTemperature"],[data-dock-control="passengerTemperature"],[data-dock-control="fan"]'))return
      event.preventDefault();event.stopPropagation();onClose()
    }
    document.addEventListener('click',outside,true)
    window.addEventListener('blur',stopRepeat)
    return()=>{stopRepeat();window.removeEventListener('blur',stopRepeat);document.removeEventListener('click',outside,true);const current=drag.current;drag.current=null;if(current?.target.hasPointerCapture(current.id))current.target.releasePointerCapture(current.id);if(previous?.isConnected)previous.focus({preventScroll:true})}
  },[visible,onClose])
  function flash(side:SeatSide,axis:SeatAxis){setMotion({side,axis});if(flashTimer.current)clearTimeout(flashTimer.current);flashTimer.current=setTimeout(()=>setMotion(null),650)}
  function adjust(side:SeatSide,axis:SeatAxis,value:number|((current:number)=>number)){
    onSelect(side)
    setPoses(current=>current.map((pose,i)=>i===side?{...pose,[axis]:clampSeat(axis,typeof value==='function'?value(pose[axis]):value)}:pose) as SeatPair)
    flash(side,axis)
  }
  function nudge(side:SeatSide,axis:SeatAxis,amount:number){adjust(side,axis,current=>current+amount)}
  function pointerDown(event:PointerEvent<HTMLDivElement>,side:SeatSide,axis:SeatAxis){
    if(!event.isPrimary||event.button!==0||!stage.current)return
    event.preventDefault();onSelect(side);event.currentTarget.focus({preventScroll:true});event.currentTarget.setPointerCapture(event.pointerId)
    const rect=stage.current.getBoundingClientRect()
    drag.current={id:event.pointerId,side,axis,x:event.clientX,y:event.clientY,initial:poses[side][axis],width:rect.width,height:rect.height,target:event.currentTarget};setActive({side,axis})
  }
  function pointerMove(event:PointerEvent<HTMLDivElement>){
    const current=drag.current;if(!current||event.pointerId!==current.id)return
    const dx=(event.clientX-current.x)/current.width,dy=(event.clientY-current.y)/current.height
    const delta=current.axis==='recline'?dx*(current.side===0?-5.4:5.4):dy*7.2
    adjust(current.side,current.axis,current.initial+delta)
  }
  function finish(event:PointerEvent<HTMLDivElement>){if(drag.current?.id!==event.pointerId)return;drag.current=null;setActive(null);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}
  function draggable(side:SeatSide,axis:SeatAxis,className:string,accessible=true){
    return <div className={className} role={accessible?'slider':undefined} tabIndex={accessible?0:undefined} aria-hidden={!accessible||undefined}
      aria-label={accessible?`${name(side)}${axes[axis]}`:undefined} aria-valuemin={accessible?seatLimits[axis][0]:undefined} aria-valuemax={accessible?seatLimits[axis][1]:undefined} aria-valuenow={accessible?Number(poses[side][axis].toFixed(2)):undefined} aria-orientation={accessible?(axis==='recline'?'horizontal':'vertical'):undefined}
      data-active={active?.side===side&&active.axis===axis} onPointerEnter={()=>setHovered({side,axis})} onPointerLeave={()=>setHovered(null)}
      onPointerDown={event=>pointerDown(event,side,axis)} onPointerMove={pointerMove} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={()=>{drag.current=null;setActive(null)}}
      onKeyDown={event=>{
        if(!accessible||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return
        event.preventDefault();event.stopPropagation()
        const step=axis==='recline'?.04:.12
        const direction=axis==='position'?(event.key==='ArrowDown'||event.key==='ArrowRight'?1:-1):event.key==='ArrowUp'||event.key==='ArrowRight'?1:-1
        adjust(side,axis,event.key==='Home'?seatLimits[axis][0]:event.key==='End'?seatLimits[axis][1]:poses[side][axis]+step*direction)
      }}/>
  }
  function stepButton(side:SeatSide,axis:SeatAxis,amount:number,label:string,direction:'up'|'down'|'left'|'right',className=''){
    const disabled=amount>0?poses[side][axis]>=seatLimits[axis][1]:poses[side][axis]<=seatLimits[axis][0]
    return <button className={`seat-step ${className}`} aria-label={label} disabled={disabled}
      onPointerDown={event=>{if(!event.isPrimary||event.button!==0)return;stopRepeat();held.current=false;event.currentTarget.setPointerCapture(event.pointerId);setActive({side,axis});repeatTimer.current=setTimeout(()=>{held.current=true;nudge(side,axis,amount);repeatInterval.current=setInterval(()=>nudge(side,axis,amount*.4),55)},300)}}
      onPointerUp={event=>{stopRepeat();setActive(null);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}} onPointerCancel={()=>{stopRepeat();setActive(null)}} onLostPointerCapture={()=>{stopRepeat();setActive(null)}}
      onClick={event=>{if(!held.current||event.detail===0)nudge(side,axis,amount);held.current=false}}><Arrow direction={direction}/></button>
  }
  function vars(side:SeatSide):CSSProperties {
    const anchorValue=(anchor:string,fallback:string)=>`var(--seat-${side}-${anchor}, ${fallback})`
    return {
      '--back-x':anchorValue('back-x',side===0?'10%':'90%'),'--back-y':anchorValue('back-y','35%'),
      '--hinge-x':anchorValue('hinge-x',side===0?'11%':'89%'),'--hinge-y':anchorValue('hinge-y','74%'),
      '--front-x':anchorValue('front-x',side===0?'40%':'60%'),'--front-y':anchorValue('front-y','73%'),
      '--back-radius':`calc(${anchorValue('back-radius','275px')} + 100px)`,
      '--back-angle':anchorValue('back-angle',side===0?'-108deg':'-72deg'),
      '--position-progress':`${50+poses[side].position*26}%`,
    } as CSSProperties
  }
  return <div className="seat-drawer-viewport">
    <section className="seat-panel dashboard-ui" ref={panel} data-open={visible} aria-hidden={!visible} inert={!visible} role="region" aria-label="Front seat adjustment" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onClose()}}}>
      <div className="seat-panel-grip" aria-hidden="true"/>
      <div className="seat-panel-actions"><button aria-label="Reset front seats" onClick={()=>{setPoses(defaultSeats());flash(selected,'recline')}}><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M4 10a8 8 0 1 1 2 8M4 4v6h6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button><button ref={close} aria-label="Close seat adjustment" onClick={onClose}><Arrow direction="down"/></button></div>
      <div className="seat-stage" data-selected-seat={selected} ref={stage}>
        <SeatModel visible={visible} selected={selected} poses={poses}/>
        {([0,1] as const).map(side=><div key={side} className={`seat-controls seat-side-${side}`} style={vars(side)} data-selected={selected===side} data-moving-axis={motion?.side===side?motion.axis:undefined} data-guided-axis={active?.side===side?active.axis:hovered?.side===side?hovered.axis:undefined}>
          {draggable(side,'position',`seat-model-hit position-hit-${side}`,false)}
          {draggable(side,'recline',`seat-model-hit recline-hit-${side}`,false)}
          <div className="seat-rotation-guide seat-guide" data-axis="recline">
            <div className="seat-back-orbit">
              <svg className="seat-orbit-path" viewBox="0 0 200 200" aria-hidden="true"><path className="orbit-halo" d="M69.1 4.9A100 100 0 0 1 130.9 4.9"/><path className="orbit-line" d="M69.1 4.9A100 100 0 0 1 130.9 4.9"/><path className="orbit-tether" d="M100 17V88"/><circle className="orbit-pivot" cx="100" cy="100" r="1.6"/></svg>
              {stepButton(side,'recline',side===0?.06:-.06,`${name(side)} backrest ${side===0?"recline":"forward"}`,'left','orbit-start')}
              {stepButton(side,'recline',side===0?-.06:.06,`${name(side)} backrest ${side===0?"forward":"recline"}`,'right','orbit-end')}
              {draggable(side,'recline','seat-drag-handle recline-handle')}
            </div>
          </div>
          <div className="seat-position-leader seat-leader" aria-hidden="true"/>
          <div className="seat-position-guide seat-guide" data-axis="position">
            <div className="seat-rail"><i/><i/><i/><i/><i/></div>
            {stepButton(side,'position',-.16,`${name(side)} seat backward`,'up','rail-start')}
            {draggable(side,'position','seat-drag-handle position-handle')}
            {stepButton(side,'position',.16,`${name(side)} seat forward`,'down','rail-end')}
          </div>
        </div>)}
      </div>
    </section>
  </div>
}
