import { describe, expect, it } from 'vitest'
import COSTS from '../../content/research.json'
import { BODY_NAMES } from '../render/morph/bodies'
import { ELEMENTS } from '../render/morph/palette'
import { EYE_NAMES } from '../render/morph/parts'
import { isLocked, research, researchCost } from './research'

const VALID: Record<string, readonly string[]> = { body: BODY_NAMES, element: ELEMENTS, eyes: EYE_NAMES, horns: ['none', 'small', 'big'] }

describe('research', () => {
  it('every priced part really exists', () => {
    for (const key of Object.keys(COSTS)) {
      const [part, value] = key.split(':') as [string, string]
      expect(VALID[part], key).toContain(value)
    }
  })
  it('starter parts stay free (blob, big eyes, the starter elements)', () => {
    for (const [p, v] of [['body', 'blob'], ['eyes', 'big'], ['horns', 'none'], ['element', 'fire'], ['element', 'water'], ['element', 'earth'], ['element', 'none']] as const)
      expect(researchCost(p, v), `${p}:${v}`).toBe(0)
  })
  it('buying spends Crystal once; too poor or already owned changes nothing', () => {
    const owned = new Set<string>()
    const wallet = { crystal: 4 }
    expect(isLocked(owned, 'body', 'quad')).toBe(true)
    expect(research(owned, wallet, 'body', 'bird')).toBe(false) // costs 5
    expect(research(owned, wallet, 'body', 'quad')).toBe(true)
    expect(wallet.crystal).toBe(0)
    expect(isLocked(owned, 'body', 'quad')).toBe(false)
    wallet.crystal = 10
    expect(research(owned, wallet, 'body', 'quad')).toBe(false)
    expect(wallet.crystal).toBe(10)
  })
})
