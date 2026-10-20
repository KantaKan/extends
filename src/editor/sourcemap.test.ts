import { describe, expect, it } from 'vitest'
import { lineMap } from './sourcemap'

describe('lineMap', () => {
  it('maps generated lines back to source lines', () => {
    // Hand-built: JS line 1 ← src line 1, JS line 2 ← src line 1 (reformatted), JS line 3 ← src line 3.
    // Segments: [genCol, src, srcLine, srcCol] deltas. "AAAA" = 0,0,0,0; "AAEA" = srcLine +2.
    const m = lineMap('AAAA;AAAA;AAEA')
    expect(m.slice(1)).toEqual([1, 1, 3])
  })
  it('lines without segments inherit the previous mapping', () => {
    expect(lineMap('AAAA;;AACA').slice(1)).toEqual([1, 1, 2])
  })
  it('decodes multi-digit VLQ (line +16 = "AAgBA")', () => {
    expect(lineMap('AAgBA')[1]).toBe(17)
  })
})
