import { describe, expect, it } from 'vitest'
import { emptyOrders } from './orders'
import { fromSave, SAVE_VERSION, toSave } from './save'
import { step } from './tick'
import { createWorld, spawnCreature } from './world'

function lab() {
  const w = createWorld(7)
  const c = spawnCreature(w, 'Mochi', 'Slime')
  for (let i = 0; i < 50; i++) step(w, [{ type: 'gather', id: c.id, target: w.essence[0]!.id }])
  w.resources.crystal = 4
  return w
}

describe('saving the lab', () => {
  it('round-trips the world and quest state through storage (JSON)', () => {
    const w = lab()
    const saved = toSave({ world: w, questIx: 3, questSince: { ...w.stats }, mealsAtStart: { 9: 2 }, lit: true, orders: emptyOrders(), unlocks: ['body:quad'], codex: ['blob:fire'] })
    const back = fromSave(JSON.parse(JSON.stringify(saved)))!
    expect(back.world).toEqual(w)
    expect(back).toMatchObject({ questIx: 3, lit: true, mealsAtStart: { 9: 2 }, unlocks: ['body:quad'], codex: ['blob:fire'] })
  })

  it('a loaded lab keeps running exactly like the original (determinism survives a reload)', () => {
    const a = lab()
    const b = fromSave(toSave({ world: a, questIx: 0, questSince: { ...a.stats }, mealsAtStart: {}, lit: false, orders: emptyOrders(), unlocks: [], codex: [] }))!.world
    for (let i = 0; i < 100; i++) { step(a, []); step(b, []) }
    expect(b).toEqual(a)
  })

  it('unknown versions and junk start fresh', () => {
    expect(fromSave({ version: SAVE_VERSION + 1, world: lab(), questIx: 0 })).toBeNull()
    expect(fromSave(null)).toBeNull()
    expect(fromSave({ version: SAVE_VERSION })).toBeNull()
  })
})
