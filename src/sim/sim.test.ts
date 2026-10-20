import { describe, expect, it } from 'vitest'
import { ticksDue } from './clock'
import { EAT_RELIEF, HUNGER_PER_TICK, REACH, SPEED, STAT_MAX } from './creature'
import { nextRandom } from './rng'
import { PERSONAL_SPACE, step } from './tick'
import { createWorld, ESSENCE_RESPAWN_TICKS, ESSENCE_START, MANA_MAX, spawnCreature, type World } from './world'

/** Simple scripted brain: gather nearest Essence, eat when hungry. */
function brain(w: World) {
  return w.creatures.map((c) => {
    if (c.hunger > 50 && w.resources.essence > 0) return { type: 'eat', id: c.id }
    const e = [...w.essence].sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0]
    return e ? { type: 'gather', id: c.id, target: e.id } : { type: 'move', id: c.id, x: c.x, y: c.y }
  })
}

function run(seed: number, ticks: number) {
  const w = createWorld(seed)
  spawnCreature(w, 'Mochi', 'Slime')
  spawnCreature(w, 'Bloop', 'Slime', 1, 1)
  for (let i = 0; i < ticks; i++) step(w, brain(w))
  return w
}

describe('rng', () => {
  it('is deterministic and in [0, 1)', () => {
    let s = 42
    const a: number[] = []
    for (let i = 0; i < 1000; i++) { const [v, n] = nextRandom(s); a.push(v); s = n }
    expect(a.every((v) => v >= 0 && v < 1)).toBe(true)
    expect(nextRandom(42)).toEqual(nextRandom(42))
    expect(nextRandom(42)[0]).not.toBe(nextRandom(43)[0])
  })
})

describe('world', () => {
  it('same seed + same commands = same world (replayable)', () => {
    expect(run(7, 600)).toEqual(run(7, 600))
  })
  it('different seeds scatter Essence differently', () => {
    expect(createWorld(1).essence).not.toEqual(createWorld(2).essence)
  })
  it('starts with Essence on distinct tiles inside the room', () => {
    const w = createWorld(3)
    expect(w.essence).toHaveLength(ESSENCE_START)
    expect(new Set(w.essence.map((e) => `${e.x},${e.y}`)).size).toBe(ESSENCE_START)
    for (const e of w.essence) {
      expect(e.x).toBeGreaterThan(0); expect(e.x).toBeLessThan(w.width)
      expect(e.y).toBeGreaterThan(0); expect(e.y).toBeLessThan(w.height)
    }
  })
  it('respawns Essence over time', () => {
    const w = createWorld(5)
    w.essence = []
    for (let i = 0; i < ESSENCE_RESPAWN_TICKS; i++) step(w, [])
    expect(w.essence).toHaveLength(1)
  })
})

describe('move', () => {
  it('steps towards the target at SPEED and stops on it', () => {
    const w = createWorld(1)
    const c = spawnCreature(w, 'a', 'Slime', 0, 0)
    step(w, [{ type: 'move', id: c.id, x: 10, y: 0 }])
    expect(c.x).toBeCloseTo(SPEED)
    for (let i = 0; i < 100; i++) step(w, [{ type: 'move', id: c.id, x: 1, y: 0 }])
    expect(c.x).toBe(1)
  })
  it('clamps targets to the room', () => {
    const w = createWorld(1)
    const c = spawnCreature(w, 'a', 'Slime', 0.1, 0.1)
    for (let i = 0; i < 10; i++) step(w, [{ type: 'move', id: c.id, x: -50, y: -50 }])
    expect(c.x).toBe(0); expect(c.y).toBe(0)
  })
  it('fails when out of energy', () => {
    const w = createWorld(1)
    const c = spawnCreature(w, 'a', 'Slime', 0, 0)
    c.energy = 0
    const ev = step(w, [{ type: 'move', id: c.id, x: 5, y: 5 }])
    expect(c.x).toBe(0)
    expect(ev).toContainEqual({ type: 'rejected', id: c.id, reason: 'tired' })
  })
})

describe('gather', () => {
  it('walks to the Essence, then collects it into the lab total', () => {
    const w = createWorld(1)
    const e = w.essence[0]!
    const c = spawnCreature(w, 'a', 'Slime', e.x - 2, e.y)
    let ticks = 0
    while (w.essence.includes(e) && ticks++ < 50) step(w, [{ type: 'gather', id: c.id, target: e.id }])
    expect(Math.hypot(c.x - e.x, c.y - e.y)).toBeLessThanOrEqual(REACH)
    expect(w.resources.essence).toBe(1)
    expect(w.stats.gathered).toBe(1)
  })
  it('rejects a missing target', () => {
    const w = createWorld(1)
    const c = spawnCreature(w, 'a', 'Slime')
    expect(step(w, [{ type: 'gather', id: c.id, target: 9999 }])).toContainEqual({ type: 'rejected', id: c.id, reason: 'no-target' })
  })
})

describe('eat', () => {
  it('spends 1 Essence to lower hunger', () => {
    const w = createWorld(1)
    const c = spawnCreature(w, 'a', 'Slime')
    c.hunger = 60
    w.resources.essence = 2
    step(w, [{ type: 'eat', id: c.id }])
    expect(w.resources.essence).toBe(1)
    expect(c.hunger).toBeCloseTo(60 - EAT_RELIEF + HUNGER_PER_TICK)
  })
  it('eating gives a worn-out creature its legs back', () => {
    const w = createWorld(1)
    const c = spawnCreature(w, 'a', 'Slime')
    c.hunger = 100
    c.energy = 0
    w.resources.essence = 1
    step(w, [{ type: 'eat', id: c.id }])
    expect(c.energy).toBeGreaterThan(20)
  })
  it('needs Essence in the lab', () => {
    const w = createWorld(1)
    const c = spawnCreature(w, 'a', 'Slime')
    c.hunger = 60
    expect(step(w, [{ type: 'eat', id: c.id }])).toContainEqual({ type: 'rejected', id: c.id, reason: 'no-food' })
  })
})

describe('needs', () => {
  it('hunger rises each tick; walking while starving drains energy', () => {
    const w = createWorld(1)
    const c = spawnCreature(w, 'a', 'Slime', 0, 0)
    step(w, [])
    expect(c.hunger).toBeCloseTo(HUNGER_PER_TICK)
    c.hunger = STAT_MAX
    const before = c.energy
    step(w, [{ type: 'move', id: c.id, x: 5, y: 0 }])
    expect(c.energy).toBeLessThan(before)
  })
  it('no dead end: a starving, worn-out creature with no food gets its legs back by resting', () => {
    const w = createWorld(1)
    const c = spawnCreature(w, 'a', 'Slime', 0, 0)
    c.hunger = STAT_MAX
    c.energy = 0
    for (let i = 0; i < 50; i++) step(w, [])
    expect(c.energy).toBeGreaterThan(5)
    step(w, [{ type: 'move', id: c.id, x: 5, y: 0 }])
    expect(c.x).toBeGreaterThan(0)
  })
})

describe('element personality (traits)', () => {
  it('a fire class walks farther and gets hungrier per tick; unknown classes use defaults', () => {
    const w = createWorld(1)
    w.traits = { Hot: { speed: 1.4, hunger: 1.6, moveEnergy: 1 } }
    const hot = spawnCreature(w, 'h', 'Hot', 0, 0)
    const plain = spawnCreature(w, 'p', 'Plain', 0, 5)
    step(w, [{ type: 'move', id: hot.id, x: 9, y: 0 }, { type: 'move', id: plain.id, x: 9, y: 5 }])
    expect(hot.x).toBeCloseTo(SPEED * 1.4)
    expect(plain.x).toBeCloseTo(SPEED)
    expect(hot.hunger).toBeCloseTo(HUNGER_PER_TICK * 1.6)
    expect(plain.hunger).toBeCloseTo(HUNGER_PER_TICK)
  })
})

describe('personal space', () => {
  it('creatures on the same spot drift apart over a few ticks', () => {
    const w = createWorld(1)
    const a = spawnCreature(w, 'a', 'Slime', 4, 3)
    const b = spawnCreature(w, 'b', 'Slime', 4, 3)
    for (let i = 0; i < 20; i++) step(w, [])
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(PERSONAL_SPACE * 0.9)
  })
})

describe('rename', () => {
  it('renames at once, trims, caps the length, and still allows an action that tick', () => {
    const w = createWorld(1)
    const c = spawnCreature(w, 'a', 'Slime', 0, 0)
    step(w, [{ type: 'rename', id: c.id, name: '  Bubu the Very Long Name  ' }, { type: 'move', id: c.id, x: 5, y: 0 }])
    expect(c.name).toBe('Bubu the Very Lo')
    expect(w.stats.renamed).toBe(1)
    expect(c.x).toBeCloseTo(SPEED)
  })
  it('ignores empty or non-string names', () => {
    const w = createWorld(1)
    const c = spawnCreature(w, 'a', 'Slime')
    step(w, [{ type: 'rename', id: c.id, name: '   ' }, { type: 'rename', id: c.id, name: 42 }])
    expect(c.name).toBe('a')
  })
})

describe('command validation', () => {
  it('drops garbage from the sandbox', () => {
    const w = createWorld(1)
    const before = JSON.stringify(w.creatures)
    const ev = step(w, [null, 42, { type: 'fly', id: 1 }, { type: 'move', id: 1, x: NaN, y: 0 }, { type: 'move', id: 777, x: 1, y: 1 }])
    expect(JSON.stringify(w.creatures)).toBe(before)
    expect(ev.filter((e) => e.type === 'rejected')).toHaveLength(5)
  })
  it('one command per creature per tick', () => {
    const w = createWorld(1)
    const c = spawnCreature(w, 'a', 'Slime', 0, 0)
    const ev = step(w, [{ type: 'move', id: c.id, x: 5, y: 0 }, { type: 'move', id: c.id, x: 5, y: 0 }])
    expect(c.x).toBeCloseTo(SPEED)
    expect(ev).toContainEqual({ type: 'rejected', id: c.id, reason: 'busy' })
  })
  it('stops accepting commands when the tick Mana budget is spent', () => {
    const w = createWorld(1)
    const cs = Array.from({ length: MANA_MAX + 3 }, (_, i) => spawnCreature(w, `s${i}`, 'Slime', 0, 0))
    const ev = step(w, cs.map((c) => ({ type: 'move', id: c.id, x: 5, y: 0 })))
    expect(w.manaLeft).toBe(0)
    expect(ev.filter((e) => e.type === 'rejected' && e.reason === 'no-mana')).toHaveLength(3)
  })
})

describe('clock', () => {
  it('runs 10 ticks per second scaled by speed, carrying leftovers', () => {
    expect(ticksDue(0, 1000, 1).ticks).toBe(10)
    expect(ticksDue(0, 1000, 4).ticks).toBe(40)
    expect(ticksDue(0, 1000, 0).ticks).toBe(0)
    const a = ticksDue(0, 150, 1)
    expect(a).toEqual({ ticks: 1, accMs: 50 })
    expect(ticksDue(a.accMs, 50, 1).ticks).toBe(1)
  })
  it('caps catch-up after a long pause', () => {
    expect(ticksDue(0, 60_000, 16)).toEqual({ ticks: 64, accMs: 0 })
  })
})

describe('lab machines (layout)', () => {
  it('new Essence appears around the well, never outside its radius or the room', () => {
    const w = createWorld(3)
    w.essence = []
    for (let i = 0; i < 200; i++) step(w, [])
    const { x, y, radius } = w.layout.well
    expect(w.essence.length).toBeGreaterThan(0)
    for (const e of w.essence) {
      expect(Math.hypot(e.x - x, e.y - y)).toBeLessThanOrEqual(radius)
      expect(e.x).toBeGreaterThan(0); expect(e.x).toBeLessThan(w.width)
      expect(e.y).toBeGreaterThan(0); expect(e.y).toBeLessThan(w.height)
    }
  })
  it('new creatures hatch out of the hatchery', () => {
    const w = createWorld(3)
    w.pending = [{ className: 'Slime', name: 'Bloop' }]
    w.resources.essence = 10
    step(w, [])
    const c = w.creatures.find((k) => k.name === 'Bloop')!
    expect(Math.abs(c.x - w.layout.hatchery.x)).toBeLessThan(0.5)
  })
})
