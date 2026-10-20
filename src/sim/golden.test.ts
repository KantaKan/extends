import { describe, expect, it } from 'vitest'
import { step } from './tick'
import { createWorld, GOLDEN_TICKS, GOLDEN_VALUE, spawnCreature } from './world'

describe('golden Essence', () => {
  it('never appears from a level-1 well', () => {
    const w = createWorld(5)
    for (let i = 0; i < 2000; i++) { step(w, []); w.essence = [] }
    expect(w.essence.some((e) => e.golden)).toBe(false)
  })

  it('an upgraded well grows some; each is worth 5 and vanishes after 15 s', () => {
    const w = createWorld(5)
    w.levels.well = 2
    let golden = 0
    for (let i = 0; i < 3000 && !golden; i++) golden = step(w, []).filter((e) => e.type === 'golden').length
    expect(golden).toBe(1)
    const g = w.essence.find((e) => e.golden)!
    expect(g.until).toBe(w.tick + GOLDEN_TICKS)

    const c = spawnCreature(w, 'Mochi', 'Slime', g.x, g.y)
    const before = w.resources.essence
    step(w, [{ type: 'gather', id: c.id, target: g.id }])
    expect(w.resources.essence).toBe(before + GOLDEN_VALUE)

    const w2 = createWorld(5)
    w2.essence = [{ id: 99, x: 0.5, y: 0.5, golden: true, until: 10 }]
    for (let i = 0; i < 10; i++) step(w2, [])
    expect(w2.essence.some((e) => e.id === 99)).toBe(false)
  })
})
