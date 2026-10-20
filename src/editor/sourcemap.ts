const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/**
 * From a source map's `mappings`, build JS line → source line (both 1-based).
 * Only the first segment of each line matters for "which line is this error on".
 */
export function lineMap(mappings: string): number[] {
  const map: number[] = [0]
  let srcLine = 0
  for (const line of mappings.split(';')) {
    let first: number | undefined
    for (const seg of line.split(',')) {
      if (!seg) continue
      const f = decodeVlq(seg)
      if (f.length < 4) continue
      srcLine += f[2]!
      first ??= srcLine + 1
    }
    map.push(first ?? map[map.length - 1] ?? 1)
  }
  return map
}

function decodeVlq(seg: string): number[] {
  const out: number[] = []
  let value = 0, shift = 0
  for (const ch of seg) {
    const d = B64.indexOf(ch)
    value += (d & 31) << shift
    if (d & 32) { shift += 5; continue }
    out.push(value & 1 ? -(value >>> 1) : value >>> 1)
    value = 0; shift = 0
  }
  return out
}
