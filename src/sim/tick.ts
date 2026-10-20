import { parseCommand } from './commands'
import { EAT_ENERGY, EAT_RELIEF, NO_TRAITS, REACH, STAT_MAX, stepTowards, updateNeeds } from './creature'
import { machineStats, respawnInterval } from './upgrades'
import { GOLDEN_VALUE, random, spawnCreature, spawnEssence, type World } from './world'

export type RejectReason = 'bad-command' | 'no-creature' | 'busy' | 'no-mana' | 'tired' | 'no-target' | 'no-food' | 'not-hungry'

export type TickEvent =
  | { type: 'gathered'; id: number; essence: number }
  | { type: 'golden'; essence: number } // a golden piece appeared
  | { type: 'ate'; id: number }
  | { type: 'hatched'; id: number }
  | { type: 'rejected'; id: number | null; reason: RejectReason }

/**
 * Advance the world by one tick. Mutates `w`; deterministic for the same world + commands.
 * Each creature gets at most one command per tick; every well-formed command costs 1 Mana.
 */
export function step(w: World, rawCommands: readonly unknown[]): TickEvent[] {
  const events: TickEvent[] = []
  const reject = (id: number | null, reason: RejectReason) => events.push({ type: 'rejected', id, reason })
  const acted = new Set<number>()
  const moved = new Set<number>()
  w.manaLeft = w.manaMax

  for (const raw of rawCommands) {
    const cmd = parseCommand(raw)
    if (!cmd) { reject(null, 'bad-command'); continue }
    const c = w.creatures.find((k) => k.id === cmd.id)
    if (!c) { reject(cmd.id, 'no-creature'); continue }
    if (w.manaLeft <= 0) { reject(c.id, 'no-mana'); continue }
    w.manaLeft-- // every call costs Mana, even a wasted one
    if (cmd.type === 'rename') { c.name = cmd.name; w.stats.renamed++; continue } // instant: not the tick's action
    if (acted.has(c.id)) { reject(c.id, 'busy'); continue }
    acted.add(c.id)
    const tr = w.traits[c.className] ?? NO_TRAITS

    switch (cmd.type) {
      case 'move':
        if (stepTowards(c, clamp(cmd.x, 0, w.width), clamp(cmd.y, 0, w.height), tr)) moved.add(c.id)
        else reject(c.id, 'tired')
        break
      case 'gather': {
        const i = w.essence.findIndex((e) => e.id === cmd.target)
        const e = w.essence[i]
        if (!e) { reject(c.id, 'no-target'); break }
        if (Math.hypot(e.x - c.x, e.y - c.y) <= REACH) {
          w.essence.splice(i, 1)
          w.resources.essence += e.golden ? GOLDEN_VALUE : 1
          w.stats.gathered++
          if (!w.essence.length) w.stats.cleared++
          events.push({ type: 'gathered', id: c.id, essence: e.id })
        } else if (stepTowards(c, e.x, e.y, tr)) moved.add(c.id)
        else reject(c.id, 'tired')
        break
      }
      case 'eat':
        if (c.hunger <= 0) reject(c.id, 'not-hungry')
        else if (w.resources.essence < 1) reject(c.id, 'no-food')
        else {
          w.resources.essence--
          c.hunger = Math.max(0, c.hunger - EAT_RELIEF)
          c.energy = Math.min(STAT_MAX, c.energy + EAT_ENERGY)
          w.stats.ate++
          c.meals++
          events.push({ type: 'ate', id: c.id })
        }
        break
    }
  }

  for (const c of w.creatures) updateNeeds(c, moved.has(c.id), w.traits[c.className] ?? NO_TRAITS)
  separate(w)
  hatch(w, events)
  w.tick++
  const { essenceMax } = machineStats(w.levels)
  w.essence = w.essence.filter((e) => e.until === undefined || e.until > w.tick) // golden pieces fade
  if (w.tick % respawnInterval(w.levels, w.creatures.length) === 0 && w.essence.length < essenceMax) {
    const e = spawnEssence(w)
    if (e?.golden) events.push({ type: 'golden', essence: e.id })
  }
  return events
}

export const PERSONAL_SPACE = 0.7 // tiles

/** Gently push apart creatures standing on each other, so a herd running the same code stays readable. */
function separate(w: World) {
  const cs = w.creatures // ponytail: O(n²), fine for MAX_CREATURES = 40
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
    const a = cs[i]!, b = cs[j]!
    let dx = b.x - a.x, dy = b.y - a.y
    const d = Math.hypot(dx, dy)
    if (d >= PERSONAL_SPACE) continue
    if (d < 1e-6) { dx = 1; dy = 0 } // same spot: split sideways, deterministic by order
    else { dx /= d; dy /= d }
    const push = (PERSONAL_SPACE - d) / 4
    a.x = clamp(a.x - dx * push, 0, w.width); a.y = clamp(a.y - dy * push, 0, w.height)
    b.x = clamp(b.x + dx * push, 0, w.width); b.y = clamp(b.y + dy * push, 0, w.height)
  }
}

/** One queued creature hatches per tick, out of the hatchery, if the lab can pay for it. */
function hatch(w: World, events: TickEvent[]) {
  const next = w.pending[0]
  const cost = machineStats(w.levels).hatchCost
  if (!next || w.resources.essence < cost) return
  w.pending.shift()
  w.resources.essence -= cost
  const { x, y } = w.layout.hatchery
  const c = spawnCreature(w, next.name, next.className, x + (random(w) - 0.5) * 0.6, y)
  events.push({ type: 'hatched', id: c.id })
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
