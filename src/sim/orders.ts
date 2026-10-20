import type { World } from './world'

// The orders board: short timed jobs that pay Crystal. Templates are data (content/orders.json).

export type OrderTemplate = {
  id: string
  kind: 'gather' | 'feed' | 'herd' | 'element'
  count: number
  element?: string
  seconds: number
  reward: number
  /** Shows up once the player has reached this quest index. */
  minQuest: number
}

export type ActiveOrder = { id: string; startTick: number; gatheredAtStart: number; ateAtStart: number }
export type OrdersState = { active: ActiveOrder[]; cursor: number; nextAt: number }
export type OrderEvent = { type: 'done' | 'expired' | 'new'; id: string }

export const MAX_ORDERS = 2
export const ORDER_GAP_TICKS = 100 // a short break before the next order (10 s)
const TICKS_PER_SECOND = 10

export const emptyOrders = (): OrdersState => ({ active: [], cursor: 0, nextAt: 0 })

/** How far an order is. `elementOf` maps a class name to its element (from the sandbox). */
export function orderProgress(t: OrderTemplate, o: ActiveOrder, w: World, elementOf: (cls: string) => string | undefined) {
  const have = (() => {
    switch (t.kind) {
      case 'gather': return w.stats.gathered - o.gatheredAtStart
      case 'feed': return w.stats.ate - o.ateAtStart
      case 'herd': return w.creatures.length
      case 'element': return w.creatures.filter((c) => elementOf(c.className) === t.element).length
    }
  })()
  return { have: Math.max(0, Math.min(have, t.count)), need: t.count }
}

export const ticksLeft = (t: OrderTemplate, o: ActiveOrder, w: World) => o.startTick + t.seconds * TICKS_PER_SECOND - w.tick

/**
 * One step of the board (call after each sim tick): pay finished orders, drop expired ones, and
 * post the next unlocked template in a fixed cycle (no randomness, so saves replay the same).
 * Mutates `state` and `w.resources.crystal`.
 */
export function updateOrders(
  state: OrdersState, w: World, templates: readonly OrderTemplate[], questIx: number, elementOf: (cls: string) => string | undefined,
): OrderEvent[] {
  const events: OrderEvent[] = []
  const byId = new Map(templates.map((t) => [t.id, t]))
  state.active = state.active.filter((o) => {
    const t = byId.get(o.id)
    if (!t) return false
    const p = orderProgress(t, o, w, elementOf)
    if (p.have >= p.need) {
      w.resources.crystal += t.reward
      events.push({ type: 'done', id: t.id })
      state.nextAt = w.tick + ORDER_GAP_TICKS
      return false
    }
    if (ticksLeft(t, o, w) <= 0) {
      events.push({ type: 'expired', id: t.id })
      state.nextAt = w.tick + ORDER_GAP_TICKS
      return false
    }
    return true
  })

  const open = templates.filter((t) => t.minQuest <= questIx && !state.active.some((o) => o.id === t.id))
  if (state.active.length < MAX_ORDERS && w.tick >= state.nextAt && open.length) {
    const t = open[state.cursor % open.length]!
    state.cursor++
    state.active.push({ id: t.id, startTick: w.tick, gatheredAtStart: w.stats.gathered, ateAtStart: w.stats.ate })
    state.nextAt = w.tick + ORDER_GAP_TICKS
    events.push({ type: 'new', id: t.id })
  }
  return events
}
