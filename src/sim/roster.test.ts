import { describe, expect, it } from 'vitest'
import { reconcile, SPAWN_COST } from './roster'
import { step } from './tick'
import { createWorld, spawnCreature } from './world'

describe('reconcile (hot reload roster)', () => {
  it('existing creatures change class but keep their stats and place', () => {
    const w = createWorld(1)
    const c = spawnCreature(w, 'Mochi', 'Slime', 2, 3)
    c.hunger = 42
    reconcile(w, [{ className: 'FireSlime', name: null }])
    expect(w.creatures).toEqual([{ ...c, className: 'FireSlime', hunger: 42, x: 2, y: 3 }])
    expect(w.pending).toEqual([])
  })

  it('matches by name first, then by order', () => {
    const w = createWorld(1)
    const a = spawnCreature(w, 'A', 'Slime')
    const b = spawnCreature(w, 'B', 'Slime')
    reconcile(w, [{ className: 'X', name: null }, { className: 'Y', name: 'A' }])
    expect(a.className).toBe('Y')
    expect(b.className).toBe('X')
  })

  it('extra entries queue up and hatch one per tick while Essence lasts', () => {
    const w = createWorld(1)
    spawnCreature(w, 'Mochi', 'Slime')
    reconcile(w, [{ className: 'Slime', name: null }, { className: 'Slime', name: 'Bloop' }, { className: 'Slime', name: null }])
    expect(w.pending).toHaveLength(2)
    w.resources.essence = SPAWN_COST + 1
    step(w, [])
    expect(w.creatures.map((c) => c.name)).toEqual(['Mochi', 'Bloop'])
    expect(w.resources.essence).toBe(1)
    step(w, [])
    expect(w.creatures).toHaveLength(2) // can't afford the third yet
    w.resources.essence = SPAWN_COST
    step(w, [])
    expect(w.creatures).toHaveLength(3)
    expect(new Set(w.creatures.map((c) => c.name)).size).toBe(3)
  })

  it('unnamed creatures get unique cute names', () => {
    const w = createWorld(1)
    spawnCreature(w, 'Mochi', 'Slime')
    reconcile(w, Array.from({ length: 12 }, () => ({ className: 'Slime', name: null })))
    const names = ['Mochi', ...w.pending.map((p) => p.name)]
    expect(new Set(names).size).toBe(12)
    expect(w.pending[0]!.name).toBe('Bloop')
  })

  it('creatures the code no longer lists leave; empty roster changes nothing', () => {
    const w = createWorld(1)
    spawnCreature(w, 'A', 'Slime')
    spawnCreature(w, 'B', 'Slime')
    reconcile(w, [])
    expect(w.creatures).toHaveLength(2)
    reconcile(w, [{ className: 'Slime', name: 'B' }])
    expect(w.creatures.map((c) => c.name)).toEqual(['B'])
  })
})
