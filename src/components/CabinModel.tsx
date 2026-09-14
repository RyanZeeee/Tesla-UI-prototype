import { useEffect, useRef, useState } from 'react'
import type { CabinScene, CabinView } from '../climate/createCabinScene'

export function CabinModel(props: CabinView) {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<CabinScene | null>(null)
  const latest = useRef(props)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [started, setStarted] = useState(false)
  // Defer the second WebGL context until climate is opened for the first time.
  if (props.visible && !started) setStarted(true)
  useEffect(() => {
    if (!started || !host.current) return
    const element = host.current
    let disposed = false, view: CabinScene | undefined
    import('../climate/createCabinScene').then(({ createCabinScene }) => {
      if (disposed) return
      view = createCabinScene(element, next => { if (!disposed) setStatus(next) })
      scene.current = view; view.update(latest.current)
    }).catch(() => { if (!disposed) setStatus('error') })
    return () => { disposed = true; scene.current = null; view?.dispose() }
  }, [started, attempt])
  useEffect(() => { latest.current = props; scene.current?.update(props) }, [props])
  return <>
    <div ref={host} className="cabin-render" data-cabin-status={status} />
    {status !== 'ready' && <div className="cabin-loading" role="status">{status === 'loading' ? "Preparing cabin…" : "Cabin unavailable"}
      {status === 'error' && <button onClick={() => { setStatus('loading'); setAttempt(value => value + 1) }}>Reload</button>}
    </div>}
  </>
}
