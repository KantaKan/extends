import { describe, expect, it } from 'vitest'
import ORDERS from '../../content/orders.json'
import { emptyOrders, ORDER_GAP_TICKS, updateOrders, type OrderTemplate } from './orders'
import { createWorld, spawnCreature } from './world'

const templates = ORDERS as OrderTemplate[]
const T: OrderTemplate[] = [
  { id: 'g', kind: 'gather', count: 3, seconds: 60, reward: 2, minQuest: 0 },
  { id: 'f', kind: 'feed', count: 1, seconds: 60, reward: 1, minQuest: 0 },
  { id: 'late', kind: 'herd', count: 1, seconds: 10, reward: 9, minQuest: 5 },
]
const none = () => undefined

describe('orders board', () => {
  it('posts orders up to the limit, spaced out, only those unlocked by quest progress', () => {
    const w = createWorld(1)
    const s = emptyOrders()
    expect(updateOrders(s, w, T, 0, none)).toEqual([{ type: 'new', id: 'g' }])
    w.tick += ORDER_GAP_TICKS
    updateOrders(s, w, T, 0, none)
    expect(s.active.map((o) => o.id)).toEqual(['g', 'f']) // 'late' isn't unlocked yet
  })

  it('a finished order pays its Crystal once and leaves the board', () => {
    const w = createWorld(1)
    const s = emptyOrders()
    updateOrders(s, w, T, 0, none)
    w.stats.gathered += 3
    expect(updateOrders(s, w, T, 0, none)).toContainEqual({ type: 'done', id: 'g' })
    expect(w.resources.crystal).toBe(2)
    updateOrders(s, w, T, 0, none)
    expect(w.resources.crystal).toBe(2)
    expect(s.active.some((o) => o.id === 'g')).toBe(false)
  })

  it('Essence gathered before the order was posted does not count', () => {
    const w = createWorld(1)
    w.stats.gathered = 50
    const s = emptyOrders()
    updateOrders(s, w, T, 0, none)
    expect(updateOrders(s, w, T, 0, none).some((e) => e.type === 'done')).toBe(false)
  })

  it('an order that runs out of time expires with no reward', () => {
    const w = createWorld(1)
    const s = emptyOrders()
    updateOrders(s, w, T, 0, none)
    w.tick += 60 * 10
    expect(updateOrders(s, w, T, 0, none)).toContainEqual({ type: 'expired', id: 'g' })
    expect(w.resources.crystal).toBe(0)
  })

  it('element orders count creatures by their class element', () => {
    const w = createWorld(1)
    spawnCreature(w, 'a', 'FireSlime')
    spawnCreature(w, 'b', 'FireSlime')
    const s = emptyOrders()
    const fire: OrderTemplate[] = [{ id: 'e', kind: 'element', element: 'fire', count: 2, seconds: 10, reward: 4, minQuest: 0 }]
    updateOrders(s, w, fire, 0, (cls) => (cls === 'FireSlime' ? 'fire' : 'none'))
    updateOrders(s, w, fire, 0, (cls) => (cls === 'FireSlime' ? 'fire' : 'none'))
    expect(w.resources.crystal).toBe(4)
  })

  it('the real templates are valid and cycle deterministically', () => {
    for (const t of templates) expect(t.count).toBeGreaterThan(0)
    const run = () => {
      const w = createWorld(1)
      const s = emptyOrders()
      const seen: string[] = []
      for (let i = 0; i < 2000; i++) { w.tick++; for (const e of updateOrders(s, w, templates, 7, none)) if (e.type === 'new') seen.push(e.id) }
      return seen
    }
    expect(run()).toEqual(run())
    expect(new Set(run()).size).toBeGreaterThan(3)
  })
})
