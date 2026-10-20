import NAMES from '../../content/names.json'
import { BASE } from './upgrades'
import type { World } from './world'

/** One `new X()` from the top level of the player's code. */
export type RosterEntry = { className: string; name: string | null }

export const SPAWN_COST = BASE.hatchCost // Essence per new creature, before hatchery upgrades
export const MAX_CREATURES = 40

/** A cute name nobody in the lab has yet (content/names.json, then numbered). */
function freshName(taken: Set<string>): string {
  let name = NAMES.find((n) => !taken.has(n))
  for (let i = 2; !name; i++) name = NAMES.map((n) => `${n} ${i}`).find((n) => !taken.has(n))
  taken.add(name)
  return name
}

/**
 * Hot reload: make the lab match the creatures the code lists, without losing anything they
 * built up. Existing creatures are matched by name, then in order; they keep hp/energy/hunger and
 * position and only change class. Unmatched entries are queued and hatch when Essence allows.
 * An empty roster (code with no `new`) leaves the lab as it is.
 */
export function reconcile(w: World, roster: readonly RosterEntry[]) {
  if (!roster.length) return
  const wanted = roster.slice(0, MAX_CREATURES)
  const free = new Set(w.creatures)
  const slots: (typeof w.creatures[number] | null)[] = wanted.map((r) => {
    const c = r.name ? [...free].find((k) => k.name === r.name) : undefined
    if (c) free.delete(c)
    return c ?? null
  })
  slots.forEach((c, i) => {
    if (c || wanted[i]!.name) return // named entries only match by name
    const next = [...free][0]
    if (next) { free.delete(next); slots[i] = next }
  })
  w.creatures = w.creatures.filter((c) => !free.has(c))
  w.pending = []
  const taken = new Set([...w.creatures.map((c) => c.name), ...wanted.flatMap((r) => (r.name ? [r.name] : []))])
  slots.forEach((c, i) => {
    const r = wanted[i]!
    if (c) { c.className = r.className; if (r.name) c.name = r.name }
    else w.pending.push({ className: r.className, name: r.name ?? freshName(taken) })
  })
}
