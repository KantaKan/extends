import { describe, expect, it } from 'vitest'
import QUESTS from '../../content/quests.json'
import { done, progress, type Quest, type QuestContext } from './quests'
import { createWorld, spawnCreature } from './world'

const quests = QUESTS as Quest[]
const goal = (id: string) => quests.find((q) => q.id === id)!.goal
const zero = { gathered: 0, ate: 0, renamed: 0, cleared: 0 }
const ctx = (over: Partial<QuestContext> = {}): QuestContext => ({
  classes: new Map(), since: zero, mealsAtStart: {}, code: { loop: true, if: true, function: true, this: true, class: true }, unlocks: 0, species: 0, ...over,
})

describe('quests (content/quests.json)', () => {
  it('follow the GDD curriculum: JS basics first, then class, then extends', () => {
    expect(quests.map((q) => q.id)).toEqual(['name-slime', 'gather-5', 'eat-when-hungry', 'clear-field', 'gather-function', 'first-class', 'herd-10', 'each-own-hunger', 'new-element', 'upgrade-machine', 'research-part', 'codex-4'])
  })

  it('name the slime: a rename after the quest started', () => {
    const w = createWorld(1)
    expect(done(progress(goal('name-slime'), w, ctx()))).toBe(false)
    w.stats.renamed = 1
    expect(done(progress(goal('name-slime'), w, ctx()))).toBe(true)
  })

  it('gather 5 only counts Essence gathered after the quest started', () => {
    const w = createWorld(1)
    w.stats.gathered = 7
    expect(progress(goal('gather-5'), w, ctx({ since: { ...zero, gathered: 7 } }))).toEqual({ have: 0, need: 5 })
    w.stats.gathered = 12
    expect(done(progress(goal('gather-5'), w, ctx({ since: { ...zero, gathered: 7 } })))).toBe(true)
  })

  it('eat when hungry needs a meal and an if', () => {
    const w = createWorld(1)
    w.stats.ate = 1
    expect(done(progress(goal('eat-when-hungry'), w, ctx()))).toBe(true)
    expect(progress(goal('eat-when-hungry'), w, ctx({ code: { loop: true, if: false, function: true, this: true, class: true } }))).toMatchObject({ missing: 'if' })
  })

  it('clear the field needs a loop', () => {
    const w = createWorld(1)
    w.stats.cleared = 1
    expect(progress(goal('clear-field'), w, ctx({ code: { loop: false, if: true, function: true, this: true, class: true } }))).toMatchObject({ missing: 'loop' })
    expect(done(progress(goal('clear-field'), w, ctx()))).toBe(true)
  })

  it('the function quest needs 6 gathered and a reused function', () => {
    const w = createWorld(1)
    w.stats.gathered = 6
    expect(progress(goal('gather-function'), w, ctx({ code: { loop: true, if: true, function: false, this: true, class: true } }))).toMatchObject({ missing: 'function' })
    expect(done(progress(goal('gather-function'), w, ctx()))).toBe(true)
  })

  it('nothing is "missing" until the count is reached', () => {
    const w = createWorld(1)
    w.stats.gathered = 2
    expect(progress(goal('gather-function'), w, ctx({ code: { loop: false, if: false, function: false, this: true, class: true } }))).toEqual({ have: 2, need: 6 })
  })

  it('a herd of 10 needs 10 different names and a loop', () => {
    const w = createWorld(1)
    for (let i = 0; i < 10; i++) spawnCreature(w, i < 9 ? `s${i}` : 's0', 'Slime')
    expect(progress(goal('herd-10'), w, ctx())).toEqual({ have: 9, need: 10 })
    w.creatures[9]!.name = 'Bloop'
    expect(done(progress(goal('herd-10'), w, ctx()))).toBe(true)
    expect(progress(goal('herd-10'), w, ctx({ code: { loop: false, if: true, function: true, this: true, class: true } }))).toMatchObject({ missing: 'loop' })
  })

  it('this: 5 different creatures each ate since the quest began, reading this.hunger', () => {
    const w = createWorld(1)
    const cs = Array.from({ length: 6 }, (_, i) => spawnCreature(w, `s${i}`, 'Slime'))
    cs.forEach((c) => { c.meals = 2 })
    const start = Object.fromEntries(cs.map((c) => [c.id, c.meals]))
    expect(progress(goal('each-own-hunger'), w, ctx({ mealsAtStart: start }))).toEqual({ have: 0, need: 5 })
    cs.slice(0, 5).forEach((c) => { c.meals++ })
    expect(done(progress(goal('each-own-hunger'), w, ctx({ mealsAtStart: start })))).toBe(true)
    expect(progress(goal('each-own-hunger'), w, ctx({ mealsAtStart: start, code: { loop: true, if: true, function: true, this: false, class: true } }))).toMatchObject({ missing: 'this' })
  })

  it('new species: the whole herd morphs into a subclass with a different element than its parent', () => {
    const w = createWorld(1)
    for (let i = 0; i < 10; i++) spawnCreature(w, `a${i}`, 'Hot')
    const info = (hot: { element: string; parent: string | null }) => ctx({ classes: new Map([['Slime', { element: 'water', parent: null }], ['Hot', hot]]) })
    expect(done(progress(goal('new-element'), w, info({ element: 'fire', parent: null })))).toBe(false) // copy-paste, no extends
    expect(done(progress(goal('new-element'), w, info({ element: 'water', parent: 'Slime' })))).toBe(false) // same element
    expect(done(progress(goal('new-element'), w, info({ element: 'fire', parent: 'Slime' })))).toBe(true)
  })

  it('one new slime is not the herd yet: all 10 must morph', () => {
    const w = createWorld(1)
    spawnCreature(w, 'hot', 'Hot')
    for (let i = 0; i < 9; i++) spawnCreature(w, `s${i}`, 'Slime')
    const c = ctx({ classes: new Map([['Slime', { element: 'water', parent: null }], ['Hot', { element: 'fire', parent: 'Slime' }]]) })
    expect(progress(goal('new-element'), w, c)).toEqual({ have: 1, need: 10 })
  })

  it('first class: creatures gathering on their own, from a class with update()', () => {
    const w = createWorld(1)
    w.stats.gathered = 3
    expect(done(progress(goal('first-class'), w, ctx()))).toBe(true)
    expect(progress(goal('first-class'), w, ctx({ code: { loop: true, if: true, function: true, this: true, class: false } }))).toMatchObject({ missing: 'class' })
  })

  it('after extends: upgrade, research and the codex give the next goals', () => {
    const w = createWorld(1)
    expect(done(progress(goal('upgrade-machine'), w, ctx()))).toBe(false)
    w.levels.well = 1
    expect(done(progress(goal('upgrade-machine'), w, ctx()))).toBe(true)
    expect(done(progress(goal('research-part'), w, ctx({ unlocks: 1 })))).toBe(true)
    expect(progress(goal('codex-4'), w, ctx({ species: 3 }))).toEqual({ have: 3, need: 4 })
  })
})
