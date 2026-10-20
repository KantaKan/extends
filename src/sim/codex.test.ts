import { describe, expect, it } from 'vitest'
import { BODY_NAMES } from '../render/morph/bodies'
import { ELEMENTS } from '../render/morph/palette'
import { codexKey, discover, nickname } from './codex'

describe('codex', () => {
  it('every body × element has a nickname that never changes', () => {
    for (const b of BODY_NAMES) for (const e of ELEMENTS) {
      expect(nickname(b, e)).toMatch(/^[A-Z][a-z]+$/)
      expect(nickname(b, e)).toBe(nickname(b, e))
    }
    expect(new Set(BODY_NAMES.flatMap((b) => ELEMENTS.map((e) => nickname(b, e)))).size).toBeGreaterThan(20)
  })

  it('discover reports each species once', () => {
    const found = new Set([codexKey('blob', 'fire')])
    expect(discover(found, [codexKey('blob', 'fire'), codexKey('quad', 'water'), codexKey('quad', 'water')])).toEqual(['quad:water'])
    expect(found.size).toBe(2)
  })
})
