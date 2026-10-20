import { beforeEach, describe, expect, it } from 'vitest'
import { step } from '../sim/tick'
import { createWorld, spawnCreature, type World } from '../sim/world'
import { classNames, Sandbox, type TickInput } from './vm'

const SLIME = `
class Slime extends Creature {
  body = "blob"
  update() {
    if (this.hunger > 50) this.eat()
    else this.gather(nearest("essence"))
  }
}
`

function input(w: World): TickInput {
  return { tick: w.tick, width: w.width, height: w.height, events: [], seed: w.rng, manaMax: w.manaMax, resources: w.resources, essence: w.essence, creatures: w.creatures }
}

let sb: Sandbox
beforeEach(async () => { sb?.dispose(); sb = await Sandbox.create() })

describe('sandbox', () => {
  it('calls update() on each creature and returns its commands', () => {
    expect(sb.load(SLIME)).toMatchObject({ ok: true, classes: ['Slime'] })
    const w = createWorld(1)
    const c = spawnCreature(w, 'Mochi', 'Slime')
    const out = sb.tick(input(w))
    expect(out.errors).toEqual([])
    expect(out.commands).toHaveLength(1)
    expect(out.commands[0]).toMatchObject({ type: 'gather', id: c.id })
    c.hunger = 80
    expect(sb.tick(input(w)).commands[0]).toEqual({ type: 'eat', id: c.id })
  })

  it('drives the simulation end to end: the slime gathers Essence', () => {
    sb.load(SLIME)
    const w = createWorld(1)
    spawnCreature(w, 'Mochi', 'Slime')
    for (let i = 0; i < 300; i++) step(w, sb.tick(input(w)).commands)
    expect(w.stats.gathered).toBeGreaterThanOrEqual(5)
  })

  it('subclasses inherit update() through extends', () => {
    sb.load(SLIME + 'class FireSlime extends Slime { element = "fire" }')
    const w = createWorld(1)
    spawnCreature(w, 'Ember', 'FireSlime')
    expect(sb.tick(input(w)).commands[0]).toMatchObject({ type: 'gather' })
  })

  it('stops an infinite loop and reports which creature and line', () => {
    sb.load('class Slime extends Creature {\n  update() {\n    while (true) {}\n  }\n}')
    const w = createWorld(1)
    const a = spawnCreature(w, 'a', 'Slime')
    spawnCreature(w, 'b', 'Slime')
    const t0 = Date.now()
    const out = sb.tick(input(w))
    expect(Date.now() - t0).toBeLessThan(500)
    expect(out.errors).toHaveLength(2)
    // QuickJS reports an interrupt at the *function's* first line, not the loop's.
    expect(out.errors[0]).toMatchObject({ id: a.id, kind: 'timeout', line: 2 })
  })

  it('stops a command spam loop when the tick Mana runs out', () => {
    sb.load('class Slime extends Creature { update() { for (;;) this.eat() } }')
    const w = createWorld(1)
    spawnCreature(w, 'a', 'Slime')
    const out = sb.tick(input(w))
    expect(out.commands).toHaveLength(w.manaMax)
    expect(out.errors[0]).toMatchObject({ kind: 'mana' })
  })

  it('reports runtime errors with a line number, and other creatures keep running', () => {
    sb.load('class Bad extends Creature {\n  update() {\n    this.target.x\n  }\n}\n' + SLIME)
    const w = createWorld(1)
    const bad = spawnCreature(w, 'bad', 'Bad')
    spawnCreature(w, 'ok', 'Slime')
    const out = sb.tick(input(w))
    expect(out.errors).toEqual([expect.objectContaining({ id: bad.id, kind: 'error', line: 3 })])
    expect(out.commands).toHaveLength(1)
  })

  it('a broken save keeps the last good code running', () => {
    sb.load(SLIME)
    const r = sb.load('class Slime extends Creature { update() { ')
    expect(r).toMatchObject({ ok: false, error: { kind: 'syntax' } })
    const w = createWorld(1)
    spawnCreature(w, 'a', 'Slime')
    expect(sb.tick(input(w)).commands).toHaveLength(1)
  })

  it('describes each class: its morph parts and which player class it extends', () => {
    const r = sb.load(SLIME + 'class FireSlime extends Slime { element = "fire"; horns = 2 }\nclass Cat {}')
    expect(r).toMatchObject({ ok: true, species: {
      Slime: { looks: { body: 'blob' }, parent: null },
      FireSlime: { looks: { body: 'blob', element: 'fire', horns: 2 }, parent: 'Slime' },
      Cat: { looks: {}, parent: null },
    } })
  })

  it('a throwing constructor is reported, not fatal', () => {
    sb.load('class Bad extends Creature { constructor() { super(); throw new Error("boom") } }\n' + SLIME)
    const w = createWorld(1)
    spawnCreature(w, 'b', 'Bad')
    spawnCreature(w, 'ok', 'Slime')
    const out = sb.tick(input(w))
    expect(out.errors[0]).toMatchObject({ kind: 'error', line: 1 })
    expect(out.commands).toHaveLength(1)
  })

  it('top-level `new` calls become the roster, with names', () => {
    const r = sb.load(SLIME + 'class FireSlime extends Slime {}\nconst a = new Slime()\na.name = "Mochi"\nnew FireSlime()')
    expect(r).toMatchObject({ ok: true, roster: [{ className: 'Slime', name: 'Mochi' }, { className: 'FireSlime', name: null }] })
  })

  it('hot reload keeps fields the player made, and takes new looks from the class', () => {
    sb.load('class Slime extends Creature { trips = 0; body = "blob"; update() { this.trips++ } }')
    const w = createWorld(1)
    spawnCreature(w, 'a', 'Slime')
    for (let i = 0; i < 3; i++) sb.tick(input(w))
    sb.load('class Slime extends Creature { trips = 0; body = "bean"; update() { console.log(this.trips, this.body) } }')
    expect(sb.tick(input(w)).logs[0]!.text).toBe('3 bean')
  })

  it('a creature switching class keeps its fields too', () => {
    sb.load(SLIME.replace('body = "blob"', 'seen = 0') + 'class FireSlime extends Slime {}')
    const w = createWorld(1)
    const c = spawnCreature(w, 'a', 'Slime')
    sb.load('class Slime extends Creature { seen = 0; update() { this.seen = 7 } }\nclass FireSlime extends Slime { update() { console.log(this.seen) } }')
    sb.tick(input(w))
    c.className = 'FireSlime'
    expect(sb.tick(input(w)).logs[0]!.text).toBe('7')
  })

  it("a herd comes from the player's own loop of `new`", () => {
    const r = sb.load('class Slime extends Creature {}\nfor (let i = 0; i < 10; i++) {\n  new Slime()\n}')
    expect(r.ok && r.roster).toHaveLength(10)
  })

  it('no shortcut helpers that do a lesson for the player', () => {
    sb.load('class Slime extends Creature { update() { console.log(typeof this.work, typeof this.eatIfHungry, typeof hatch) } }')
    const w = createWorld(1)
    spawnCreature(w, 'a', 'Slime')
    expect(sb.tick(input(w)).logs[0]!.text).toBe('undefined undefined undefined')
  })

  it('`new` inside update() does not spawn creatures', () => {
    expect(sb.load('class Slime extends Creature { update() { new Slime() } }')).toMatchObject({ ok: true, roster: [] })
  })

  it('flags creatures whose class is missing', () => {
    sb.load(SLIME)
    const w = createWorld(1)
    spawnCreature(w, 'x', 'Dragon')
    expect(sb.tick(input(w)).errors[0]).toMatchObject({ kind: 'no-class', message: 'Dragon' })
  })

  it('player code cannot reach host globals', () => {
    sb.load(`class Slime extends Creature { update() { console.log(typeof fetch, typeof postMessage, typeof self, typeof process) } }`)
    const w = createWorld(1)
    spawnCreature(w, 'a', 'Slime')
    expect(sb.tick(input(w)).logs[0]!.text).toBe('undefined undefined undefined undefined')
  })

  it('Math.random is seeded by the world, so runs replay', () => {
    sb.load('class Slime extends Creature { update() { console.log(Math.random()) } }')
    const w = createWorld(9)
    spawnCreature(w, 'a', 'Slime')
    const a = sb.tick(input(w)).logs[0]!.text
    expect(sb.tick(input(w)).logs[0]!.text).toBe(a)
  })

  it('top-level infinite loop fails the load instead of hanging', () => {
    expect(sb.load('while (true) {}')).toMatchObject({ ok: false, error: { kind: 'timeout' } })
  })
})

describe('classNames', () => {
  it('finds declared classes', () => {
    expect(classNames('class A {}\n  class B extends A {}\nconst x = "class C"')).toEqual(['A', 'B'])
  })
})
