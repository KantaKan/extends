import { describe, expect, it } from 'vitest'
import { fromSave, toSave } from './save'
import { emptyOrders } from './orders'
import { step } from './tick'
import { machineStats, maxLevel, upgrade, upgradeCost } from './upgrades'
import { createWorld, MANA_MAX } from './world'

describe('machine upgrades', () => {
  it('Essence buys the next level; each level does more', () => {
    const w = createWorld(1)
    w.resources.essence = 1000
    const before = machineStats(w.levels)
    for (const m of ['well', 'generator', 'hatchery'] as const) {
      while (upgradeCost(w.levels, m) !== null) expect(upgrade(w, m)).toBe(true)
      expect(w.levels[m]).toBe(maxLevel(m))
      expect(upgrade(w, m)).toBe(false) // max level
    }
    const after = machineStats(w.levels)
    expect(after.mana).toBeGreaterThan(before.mana)
    expect(w.manaMax).toBe(after.mana)
    expect(after.maxSpeed).toBeGreaterThan(before.maxSpeed) // fast-forward is earned
    expect(after.respawnTicks).toBeLessThan(before.respawnTicks)
    expect(after.essenceMax).toBeGreaterThan(before.essenceMax)
    expect(after.hatchCost).toBeLessThan(before.hatchCost)
  })

  it('cannot buy without enough Essence, and nothing changes', () => {
    const w = createWorld(1)
    w.resources.essence = upgradeCost(w.levels, 'generator')! - 1
    expect(upgrade(w, 'generator')).toBe(false)
    expect(w.levels.generator).toBe(0)
    expect(w.manaMax).toBe(MANA_MAX)
  })

  it('a better well grows more Essence, and hatching gets cheaper', () => {
    const run = (lvl: number) => {
      const w = createWorld(3)
      w.levels.well = lvl
      w.essence = []
      for (let i = 0; i < 200; i++) step(w, [])
      return w.essence.length
    }
    expect(run(2)).toBeGreaterThan(run(0))
    const w = createWorld(3)
    w.levels.hatchery = 2
    w.resources.essence = 1
    w.pending.push({ className: 'Slime', name: 'Bo' })
    step(w, [])
    expect(w.creatures).toHaveLength(1)
    expect(w.resources.essence).toBe(0)
  })

  it('levels survive a save, and old saves start at level 0', () => {
    const w = createWorld(1)
    w.levels.well = 2
    const s = toSave({ world: w, questIx: 0, questSince: { ...w.stats }, mealsAtStart: {}, lit: true, orders: emptyOrders(), unlocks: [], codex: [] })
    expect(fromSave(JSON.parse(JSON.stringify(s)))!.world.levels.well).toBe(2)
    const old = JSON.parse(JSON.stringify(s)) as { world: { levels?: unknown } }
    delete old.world.levels
    expect(fromSave(old)!.world.levels).toEqual({ well: 0, generator: 0, hatchery: 0 })
  })
})
