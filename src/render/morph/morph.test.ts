import { describe, expect, it } from 'vitest'
import { BODY_NAMES } from './bodies'
import { compose, N } from './compose'
import { buildSpecies, DEFAULT_LOOKS, normalizeLooks, type Looks } from './looks'
import { ELEMENTS, PAL } from './palette'
import { EYE_NAMES } from './parts'

const HORN_OPTS = ['none', 'small', 'big'] as const

/** Every phase-0 part on every body: the "contact sheet" as a test. */
function* everyCombo(): Generator<Looks> {
  for (const body of BODY_NAMES) for (const element of ELEMENTS) for (const eyes of EYE_NAMES) for (const horns of HORN_OPTS)
    yield { body, element, eyes, horns }
}

describe('compose', () => {
  it('is deterministic', () => {
    const lk: Looks = { body: 'blob', element: 'fire', eyes: 'big', horns: 'small' }
    expect(compose(lk, 1234, 7).px).toEqual(compose(lk, 1234, 7).px)
  })

  it('every body × element × eyes × horns draws a creature with visible eyes, at several times', () => {
    for (const lk of everyCombo()) for (const t of [0, 500, 1700]) {
      const f = compose(lk, t)
      expect(f.px).toHaveLength(N * N)
      expect(f.eyes.size, JSON.stringify(lk)).toBeGreaterThan(0)
      // Cuteness rule: nothing draws over the eyes.
      for (const i of f.eyes) expect(f.px[i] === PAL[lk.element].o || f.px[i] === '#ffffff').toBe(true)
    }
  })

  it('horns add pixels above the plain head', () => {
    const count = (lk: Looks) => compose(lk, 0).px.filter(Boolean).length
    for (const body of BODY_NAMES) {
      const plain = count({ ...DEFAULT_LOOKS, body })
      expect(count({ ...DEFAULT_LOOKS, body, horns: 'small' })).toBeGreaterThan(plain)
      expect(count({ ...DEFAULT_LOOKS, body, horns: 'big' })).toBeGreaterThan(count({ ...DEFAULT_LOOKS, body, horns: 'small' }))
    }
  })

  it('element recolours the body from its palette', () => {
    const f = compose({ ...DEFAULT_LOOKS, element: 'water' }, 0)
    expect(f.px).toContain(PAL.water.b)
    expect(f.px).not.toContain(PAL.none.b)
  })

  it('glowing parts get a glow outline; non-glowing do not', () => {
    const lk: Looks = { ...DEFAULT_LOOKS, element: 'fire' }
    expect(compose(lk, 0, 0, new Set(['element'])).px).toContain('#fffbe0')
    expect(compose(lk, 0).px).not.toContain('#fffbe0')
  })
})

describe('looks', () => {
  it('validates class properties and reports bad values', () => {
    const r = normalizeLooks({ body: 'dragon', element: 'fire', horns: 2 })
    expect(r.looks).toEqual({ body: 'blob', element: 'fire', eyes: 'big', horns: 'small' })
    expect(r.invalid).toEqual([{ part: 'body', value: 'dragon' }])
  })

  it('subclass inherits parts and glows only on what it changed', () => {
    const sp = buildSpecies({
      Slime: { looks: { body: 'blob', horns: 'small' }, parent: null },
      FireSlime: { looks: { body: 'blob', horns: 'small', element: 'fire' }, parent: 'Slime' },
    })
    expect(sp.get('FireSlime')!.looks).toEqual({ body: 'blob', element: 'fire', eyes: 'big', horns: 'small' })
    expect([...sp.get('FireSlime')!.glow]).toEqual(['element'])
    expect(sp.get('Slime')!.glow.size).toBe(0)
  })
  it('a part that is not researched yet is reported and drawn as the default', () => {
    const sp = buildSpecies({ Slime: { looks: { body: 'quad', horns: 'small' }, parent: null } }, (part, v) => part === 'body' && v === 'quad')
    expect(sp.get('Slime')!.looks).toMatchObject({ body: 'blob', horns: 'small' })
    expect(sp.get('Slime')!.locked).toEqual([{ part: 'body', value: 'quad' }])
  })
})
