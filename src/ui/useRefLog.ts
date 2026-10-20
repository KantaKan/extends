import { useCallback, useRef, useState } from 'react'
import type { RefLine } from './RefConsole'

const REPEAT_MS = 15_000 // Ref won't repeat the same line more often than this
const KEEP = 200

let nextLine = 0

/** Ref's message log: `say` always speaks, `sayOnce` skips lines said recently (errors repeat every tick). */
export function useRefLog(first: string) {
  const [lines, setLines] = useState<RefLine[]>(() => [{ id: nextLine++, kind: 'say', text: first }])
  const spoken = useRef(new Map<string, number>())

  const say = useCallback((text: string, kind: RefLine['kind'] = 'say') => {
    setLines((ls) => [...ls.slice(-KEEP), { id: nextLine++, kind, text }])
  }, [])

  const sayOnce = useCallback((key: string, text: string, kind: RefLine['kind'] = 'say') => {
    const now = performance.now()
    if (now - (spoken.current.get(key) ?? -Infinity) < REPEAT_MS) return
    spoken.current.set(key, now)
    say(text, kind)
  }, [say])

  const forgetRepeats = useCallback(() => spoken.current.clear(), [])

  return { lines, say, sayOnce, forgetRepeats }
}
