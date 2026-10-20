import { useEffect, type RefObject } from 'react'
import type { Lab } from '../render/lab'

/** Keep an absolutely-positioned element next to a creature's head every frame (no React re-render). */
export function useFollow(el: RefObject<HTMLElement | null>, lab: RefObject<Lab | null>, id: number | null, onFrame?: () => void) {
  useEffect(() => {
    if (id === null) return
    let raf = 0
    const frame = () => {
      const p = lab.current?.screenPos(id)
      if (el.current) {
        el.current.style.visibility = p ? 'visible' : 'hidden'
        if (p) el.current.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`
      }
      onFrame?.()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [el, lab, id, onFrame])
}
