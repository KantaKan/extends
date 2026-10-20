import { describe, expect, it } from 'vitest'
import { advance, TUTORIAL_DONE, type TutorialEvent } from './tutorial'

const happyPath: TutorialEvent[] = [
  { type: 'clickCreature' },
  { type: 'openDna' },
  { type: 'typed', text: '// hint\nslime.gather(nearest("essence"))' },
  { type: 'saved' },
  { type: 'closeDna' },
]

describe('tutorial', () => {
  it('walks through every step in order and ends', () => {
    expect(happyPath.reduce(advance, 0)).toBe(TUTORIAL_DONE)
  })
  it('ignores events for other steps', () => {
    expect(advance(0, { type: 'saved' })).toBe(0)
    expect(advance(1, { type: 'clickCreature' })).toBe(1)
  })
  it('typing counts once the first line is really written (gather or gatherNearest)', () => {
    expect(advance(2, { type: 'typed', text: 'slime.gath' })).toBe(2)
    expect(advance(2, { type: 'typed', text: 'slime.gather(nearest("essence"))' })).toBe(3)
    expect(advance(2, { type: 'typed', text: 'slime.gatherNearest()' })).toBe(3)
  })
  it('the hint comment itself does not count', () => {
    expect(advance(2, { type: 'typed', text: '// พิมพ์ slime.gather(nearest("essence")) แล้วกด Ctrl+S' })).toBe(2)
  })
  it('stays done', () => {
    expect(advance(TUTORIAL_DONE, { type: 'closeDna' })).toBe(TUTORIAL_DONE)
  })
})
