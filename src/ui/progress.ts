// What the game remembers between visits (per browser). Phase 0: localStorage; IndexedDB later.
const KEY = 'extends.progress'

export type Progress = { starter: { element: string; name: string } | null; tutorialDone: boolean }
const EMPTY: Progress = { starter: null, tutorialDone: false }

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Progress>) } : EMPTY
  } catch {
    return EMPTY // private window / blocked storage: just play the tutorial again
  }
}

export function saveProgress(p: Progress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* not fatal */ }
}

export function clearProgress() {
  try { localStorage.removeItem(KEY) } catch { /* nothing to clear */ }
}
