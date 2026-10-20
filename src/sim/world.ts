import LAB_JSON from '../../content/lab.json'
import { newCreature, type Creature, type Traits } from './creature'
import { nextRandom } from './rng'
import { BASE, machineStats, START_LEVELS, type Levels } from './upgrades'

/** A piece of Essence on the floor. Golden ones (better wells) are worth more but vanish at tick `until`. */
export type Essence = { id: number; x: number; y: number; golden?: true; until?: number }

export type World = {
  tick: number
  rng: number
  width: number // tiles
  height: number
  creatures: Creature[]
  essence: Essence[]
  resources: { essence: number; crystal: number }
  manaMax: number
  manaLeft: number
  /** Running totals for quests. `cleared` = times the field was gathered empty. */
  stats: { gathered: number; ate: number; renamed: number; cleared: number }
  /** Creatures the code asked for that haven't hatched yet (waiting on Essence). */
  pending: { className: string; name: string }[]
  /** Personality per class name; set by the host on every successful save. */
  traits: Record<string, Traits>
  /** Where the lab's machines are (content/lab.json): new creatures hatch, new Essence appears. */
  layout: Layout
  /** Machine upgrade levels (src/sim/upgrades.ts). */
  levels: Levels
  nextId: number
}

export type Layout = {
  hatchery: { x: number; y: number }
  well: { x: number; y: number; radius: number }
  terminal: { x: number }
  generator: { x: number }
  board: { x: number }
}
export const LAB: Layout = LAB_JSON

export const ROOM_W = 9 // small room so creatures draw at 3× on a typical laptop screen
export const ROOM_H = 6
export const ESSENCE_START = 8
// Level-0 machines (content/upgrades.json): one new Essence every 2 s, so a herd of 10 eating still nets a surplus.
export const ESSENCE_MAX = BASE.essenceMax
export const ESSENCE_RESPAWN_TICKS = BASE.respawnTicks
export const MANA_MAX = BASE.mana // commands per tick for the whole lab
export const GOLDEN_VALUE = 5 // Essence a golden piece is worth
export const GOLDEN_TICKS = 150 // 15 s on the floor, then it's gone

export function createWorld(seed: number, layout: Layout = LAB): World {
  const w: World = {
    tick: 0, rng: seed | 0, width: ROOM_W, height: ROOM_H, layout, levels: { ...START_LEVELS },
    creatures: [], essence: [], resources: { essence: 0, crystal: 0 },
    manaMax: MANA_MAX, manaLeft: MANA_MAX, stats: { gathered: 0, ate: 0, renamed: 0, cleared: 0 }, pending: [], traits: {}, nextId: 1,
  }
  for (let i = 0; i < ESSENCE_START; i++) spawnEssence(w)
  return w
}

export function random(w: World): number {
  const [v, s] = nextRandom(w.rng)
  w.rng = s
  return v
}

/** Free tile centres within the Essence well's radius (and inside the room). */
function wellTiles(w: World): { x: number; y: number }[] {
  const { x: wx, y: wy } = w.layout.well
  const radius = w.layout.well.radius + machineStats(w.levels).extraRadius
  const out: { x: number; y: number }[] = []
  for (let ty = 0; ty < w.height; ty++) for (let tx = 0; tx < w.width; tx++) {
    const x = tx + 0.5, y = ty + 0.5
    if (Math.hypot(x - wx, y - wy) <= radius && !w.essence.some((e) => e.x === x && e.y === y)) out.push({ x, y })
  }
  return out
}

/** New Essence bubbles up from the well: a random free tile around it. */
export function spawnEssence(w: World): Essence | null {
  const free = wellTiles(w)
  if (!free.length) return null
  const t = free[Math.floor(random(w) * free.length)]!
  const e: Essence = { id: w.nextId++, x: t.x, y: t.y }
  const { goldenChance } = machineStats(w.levels)
  if (goldenChance > 0 && random(w) < goldenChance) { e.golden = true; e.until = w.tick + GOLDEN_TICKS }
  w.essence.push(e)
  return e
}

export function spawnCreature(w: World, name: string, className: string, x = w.width / 2, y = w.height / 2): Creature {
  const c = newCreature(w.nextId++, name, className, x, y)
  w.creatures.push(c)
  return c
}
