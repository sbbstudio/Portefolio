import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import AtelierCanvas from '../../components/atelier-canvas'
import { useReducedMotion } from '../../lib/motion'
import { scrollState } from '../../lib/scroll'
import { ATELIER_INVALIDATE, type LoadState } from '../../lib/atelier'

function Studio({ host }: { host: HTMLElement }) {
  const [skipped, setSkipped] = useState(host.dataset.skipped === 'true')
  const still = useReducedMotion()
  const [load, setLoad] = useState<LoadState>({ phase: 'loading', loaded: 0, total: 0 })
  const [attempt, setAttempt] = useState(0)
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const copy = useRef<HTMLDivElement>(null)
  const onLoad = useCallback((value: LoadState) => setLoad(value), [])
  const source = document.querySelector<HTMLTemplateElement>('#studio-copy-template')!.content

  useLayoutEffect(() => {
    host.dataset.loadPhase = load.phase
    // Notify only after React has committed readiness to the stage.
    document.dispatchEvent(new CustomEvent('studio:load', { detail: load }))
  }, [host, load])

  useEffect(() => {
    const skip = () => flushSync(() => setSkipped(true))
    host.addEventListener('studio:skip', skip)
    return () => host.removeEventListener('studio:skip', skip)
  }, [host])

  useLayoutEffect(() => {
    let frame = 0
    let renderedProgress = -1
    const update = () => {
      frame = 0
      const el = section.current
      if (!el) return
      host.dataset.mode = skipped || still ? 'static' : 'scroll'
      const raw = Math.max(0, Math.min(1, -el.getBoundingClientRect().top / Math.max(1, el.offsetHeight - innerHeight)))
      // Reveal during the final black-frame zoom, then hold the text for reading.
      const p = Math.min(1, raw / .82)
      const reveal = skipped || still ? 1 : Math.max(0, Math.min(1, (raw - .80) / .06))
      scrollState.p = skipped || still ? 1 : p
      host.dataset.progress = String(scrollState.p)
      // The rising underside pushes navigation out before the final close-up.
      const navPush = skipped || still ? 1 : Math.max(0, Math.min(1, (p * 27 - 23.4)))
      const navReady = p >= .067 && navPush < 1
      if (host.dataset.copyReveal !== String(reveal) || host.dataset.navReady !== String(navReady) || host.dataset.navPush !== String(navPush)) {
        host.dataset.navPush = String(navPush)
        host.dataset.copyReveal = String(reveal)
        host.dataset.navReady = String(navReady)
        host.dispatchEvent(new Event('studio:presentation'))
      }
      stage.current?.style.setProperty('--studio-copy', String(reveal))
      stage.current?.setAttribute('data-complete', String(reveal > 0))
      if (copy.current) { copy.current.inert = reveal === 0; copy.current.setAttribute('aria-hidden', String(reveal === 0)) }
      // Keep the prepared canvas idle while scrolling the hero or later projects.
      if (scrollState.p !== renderedProgress) {
        renderedProgress = scrollState.p
        window.dispatchEvent(new Event(ATELIER_INVALIDATE))
      }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    update()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule) }
  }, [host, skipped, still, load.phase])

  const retry = () => { setLoad({ phase: 'loading', loaded: 0, total: 0 }); setAttempt(n => n + 1) }
  const restart = () => {
    scrollState.p = 0
    host.dataset.skipped = 'false'
    flushSync(() => { retry(); setSkipped(false) })
    section.current?.scrollIntoView({ behavior: 'instant' })
    history.replaceState(null, '', '#approach')
    stage.current?.focus({ preventScroll: true })
  }
  const percent = load.total ? Math.round(load.loaded / load.total * 100) : 0
  return <section ref={section} className={`studio-journey ${still || skipped ? 'is-still' : ''}`} aria-label="Interactive 3D studio">
    <div ref={stage} className="studio-stage" tabIndex={-1} data-ready={skipped || load.phase === 'ready'} data-skipped={skipped}>
      {!skipped && <div className="studio-canvas" aria-hidden="true"><AtelierCanvas key={attempt} still={still} onLoad={onLoad} /></div>}
      {!skipped && load.phase !== 'ready' && <div className="studio-loading">
        {load.phase === 'error' ? <><img src="/models/atelier/poster.webp" alt="Rune’s studio with agents delivering a website." /><div role="alert"><p>The studio couldn’t load.</p><button onClick={retry}>Try again ↻</button></div></>
          : <div role="status"><p>Opening the studio</p><span>{load.phase === 'preparing' ? 'Almost there.' : percent ? `${percent}%` : 'Loading…'}</span></div>}
      </div>}
      {!skipped && <a className="studio-skip" href="#approach-copy" data-studio-exit>Skip animation <span aria-hidden="true">↘</span></a>}
      {!still && (skipped ? <button className="studio-replay" onClick={restart}>Replay animation <span aria-hidden="true">↻</span></button> : <span className="studio-explore">Explore with scroll <span aria-hidden="true">↓</span></span>)}
      <div ref={copy} id="approach-copy" className="studio-endcopy" tabIndex={-1} aria-labelledby="studio-copy-title">
        <h2 id="studio-copy-title">{source.querySelector('h2')!.textContent}</h2>
        <p>{source.querySelector('p')!.textContent}</p>
      </div>
    </div>
  </section>
}

export function mountStudio(host: HTMLElement) {
  const root = createRoot(host)
  flushSync(() => root.render(<Studio host={host} />))
  host.dataset.mounted = 'true'
}
