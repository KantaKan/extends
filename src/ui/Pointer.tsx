import { useRef, type RefObject } from 'react'
import type { Lab } from '../render/lab'
import { useFollow } from './follow'

/** Bouncing tutorial arrow above a creature. */
export function Pointer({ lab, id }: { lab: RefObject<Lab | null>; id: number }) {
  const el = useRef<HTMLDivElement>(null)
  useFollow(el, lab, id)
  return <div className="pointer" ref={el} aria-hidden="true"><span>▼</span></div>
}
