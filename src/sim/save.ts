import { emptyOrders, type OrdersState } from './orders'
import { START_LEVELS } from './upgrades'
import { LAB, type World } from './world'

// Everything the player built, as plain data. Bump the version when the shape changes:
// an unknown version starts the lab fresh (phase 0 has no migrations).
export const SAVE_VERSION = 1

export type LabSave = {
  version: number
  world: World
  questIx: number
  questSince: World['stats']
  mealsAtStart: Record<number, number>
  lit: boolean
  orders: OrdersState
  /** Researched parts, `part:value` (src/sim/research.ts). */
  unlocks: string[]
  /** Discovered species, `body:element` (src/sim/codex.ts). */
  codex: string[]
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((u): u is string => typeof u === 'string') : [])

export const toSave = (s: Omit<LabSave, 'version'>): LabSave => JSON.parse(JSON.stringify({ ...s, version: SAVE_VERSION })) as LabSave

/** Validate a stored record. Anything odd → null, i.e. "no save, start fresh". */
export function fromSave(raw: unknown): LabSave | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Partial<LabSave>
  if (s.version !== SAVE_VERSION || !s.world || !Array.isArray(s.world.creatures) || typeof s.questIx !== 'number') return null
  return {
    version: SAVE_VERSION,
    world: { ...s.world, layout: LAB, levels: { ...START_LEVELS, ...s.world.levels } }, // machines follow the current content/lab.json
    questIx: s.questIx,
    questSince: s.questSince ?? { ...s.world.stats },
    mealsAtStart: s.mealsAtStart ?? {},
    lit: !!s.lit,
    orders: s.orders ?? emptyOrders(),
    unlocks: strings(s.unlocks),
    codex: strings(s.codex),
  }
}
