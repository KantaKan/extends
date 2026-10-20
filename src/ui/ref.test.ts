import { describe, expect, it } from 'vitest'
import { buildSpecies } from '../render/morph/looks'
import { explainError, explainInvalidParts } from './ref'

describe('Ref explains errors in Thai', () => {
  it('reading from undefined names the property, the creature and the editor line', () => {
    const s = explainError({ id: 1, kind: 'error', message: "TypeError: cannot read property 'x' of undefined", line: 4 }, 'Mochi', [0, 1, 1, 2, 3])
    expect(s).toBe('Mochi หา "x" ไม่เจอ เพราะของที่อยู่หน้าจุดเป็น undefined ลองเช็คบรรทัด 3')
  })
  it('unknown names', () => {
    expect(explainError({ id: 1, kind: 'error', message: "ReferenceError: 'nearst' is not defined", line: 2 }, 'Mochi')).toContain('"nearst"')
  })
  it('infinite loops, at load vs in update()', () => {
    expect(explainError({ id: 1, kind: 'timeout', message: '', line: 2 }, 'Mochi')).toContain('Mochi วนไม่จบ')
    expect(explainError({ id: null, kind: 'timeout', message: '', line: 1 }, null)).toContain('โค้ดนอก class')
    // Act 1 has no class: blame the loop, not a method or a bogus line 1.
    const s = explainError({ id: 1, kind: 'timeout', message: '', line: 1 }, 'Mochi', [], 'script')
    expect(s).toContain('Mochi')
    expect(s).not.toContain('class')
    expect(s).not.toContain('method')
  })
  it('falls back to the raw message without the error class name', () => {
    expect(explainError({ id: 1, kind: 'error', message: 'Error: boom', line: 9 }, 'Mochi')).toBe('Mochi เจอปัญหาที่บรรทัด 9: boom')
  })
  it('bad part values list the real options, once', () => {
    const sp = buildSpecies({
      A: { looks: { body: 'dragon' }, parent: null },
      B: { looks: { body: 'dragon' }, parent: 'A' },
    })
    const lines = explainInvalidParts(sp)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('"dragon"')
    expect(lines[0]).toContain('blob')
  })
})
