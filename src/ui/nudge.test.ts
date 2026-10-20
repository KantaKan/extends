import { describe, expect, it } from 'vitest'
import { NUDGE_AFTER_TICKS, shouldNudge } from './nudge'

const base = { tick: 1000, lastProgressTick: 0, lastSaveTick: 0, questActive: true, inTutorial: false, alreadyNudged: false }

describe('Ref idle nudge', () => {
  it('nudges after a long stretch with no progress and no save', () => {
    expect(shouldNudge(base)).toBe(true)
  })
  it('waits while things are moving or the player just saved', () => {
    expect(shouldNudge({ ...base, lastProgressTick: base.tick - NUDGE_AFTER_TICKS + 1 })).toBe(false)
    expect(shouldNudge({ ...base, lastSaveTick: base.tick - 10 })).toBe(false)
  })
  it('never during the tutorial, after the last quest, or twice for one quest', () => {
    expect(shouldNudge({ ...base, inTutorial: true })).toBe(false)
    expect(shouldNudge({ ...base, questActive: false })).toBe(false)
    expect(shouldNudge({ ...base, alreadyNudged: true })).toBe(false)
  })
})
