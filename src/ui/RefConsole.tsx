import { useEffect, useRef } from 'react'

export type RefLine = { id: number; kind: 'say' | 'error'; text: string }

/** Ref's full log (opened from the robot). */
export function RefConsole({ lines }: { lines: RefLine[] }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [lines])
  return (
    <div className="ref">
      {lines.map((l) => <p key={l.id} className={l.kind}>{l.text}</p>)}
      <div ref={end} />
    </div>
  )
}
