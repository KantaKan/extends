// Assemble a creature into a 32×32 pixel frame. Pure: same looks + time = same pixels.
// Ported from reference/morph-lab.html `render()` (phase-0 parts: body, element, eyes, horns).
import { BODIES, type Body } from './bodies'
import type { Looks, Part } from './looks'
import { C, PAL } from './palette'
import { EYES, HORNS, TUFT } from './parts'

export const N = 32
export const FRAME_MS = 80 // morph-lab redraw rate

export type Frame = {
  /** Row-major N*N colours, null = transparent. */
  px: (string | null)[]
  /** Ground shadow cells (drawn translucent under everything). */
  ground: number[]
  /** Pixels that belong to the eyes (nothing may cover them). */
  eyes: Set<number>
}

const NO_GLOW: ReadonlySet<Part> = new Set()
const BOUNCE = [0, 0, 1, 0, -1, 0]

export function compose(lk: Looks, t: number, phase = 0, glow: ReadonlySet<Part> = NO_GLOW): Frame {
  const tick = Math.floor((t + phase) / 160)
  const s = BOUNCE[tick % 6]!
  const blink = (t + phase) % (3000 + (phase % 1700)) < 150
  const b: Body = BODIES[lk.body](s, 1)
  const pal = PAL[lk.element]

  const M: boolean[] = []
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) M.push(b.inside(x, y))
  const ok = (x: number, y: number) => x >= 0 && x < N && y >= 0 && y < N
  const I = (x: number, y: number) => ok(x, y) && M[y * N + x]!
  const topAt = (x: number) => { for (let y = 0; y < N; y++) if (I(x, y)) return y; return N }
  const edges = (y: number) => {
    let lo = N, hi = -1
    for (let x = 0; x < N; x++) if (I(x, y)) { lo = Math.min(lo, x); hi = Math.max(hi, x) }
    return [lo, hi] as const
  }

  const sil: (string | null)[] = new Array(N * N).fill(null)
  const over: (string | null)[] = new Array(N * N).fill(null)
  const owner: (Part | null)[] = new Array(N * N).fill(null)
  const eyes = new Set<number>()
  const set = (g: (string | null)[], x: number, y: number, c: string, part?: Part) => {
    if (!ok(x, y)) return
    g[y * N + x] = c
    if (g === sil && part) owner[y * N + x] = part
  }

  /** Stamp a pattern with its bottom row at yBottom; optionally mirror around x = mirrorAt. */
  function stamp(pat: string[], x0: number, yBottom: number, cmap: Record<string, string>, part: Part, mirrorAt?: number) {
    const h = pat.length
    const put = (mir?: number) => {
      for (let r = 0; r < h; r++) for (let c = 0; c < pat[r]!.length; c++) {
        const ch = pat[r]![c]!
        if (ch === '.') continue
        const x = x0 + c
        set(sil, mir === undefined ? x : 2 * mir - 1 - x, yBottom - (h - 1 - r), cmap[ch]!, part)
      }
    }
    put()
    if (mirrorAt !== undefined) put(mirrorAt)
  }

  // Back layer: horns sit behind the head outline.
  if (lk.horns !== 'none') {
    const p = HORNS[lk.horns], w = p[0]!.length, x0 = b.ecx - 3 - (w - 1)
    let base = topAt(x0 + Math.floor(w / 2))
    if (base > b.ey) base = topAt(b.ecx)
    stamp(p, x0, base + 1, { '#': C.hornB, l: C.white, s: C.hornS }, 'horns', b.ecx)
  }

  // Body with edge shading.
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!I(x, y)) continue
    let c = pal.b
    if (!I(x, y + 1) || (!I(x, y + 2) && x > b.mx - 4) || (!I(x + 2, y) && y > b.ey)) c = pal.s
    else if ((!I(x, y - 2) && x < b.mx + 2) || (!I(x - 2, y) && y < b.ey + 1)) c = pal.l
    set(sil, x, y, c, 'body')
  }
  if (b.feet) for (const [x, y] of [[12, 28], [13, 28], [18, 28], [19, 28]] as const) set(sil, x, y, C.beak, 'body')

  // Element tuft on the head centre (fire flame / earth sprout).
  const tuft = lk.element === 'fire' || lk.element === 'earth' ? lk.element : null
  if (tuft === 'fire') stamp(TUFT.fire[tick % 2]!, b.ecx - 2, topAt(b.ecx) + 1, { y: C.fy, o: C.fo, r: C.fr }, 'element')
  if (tuft === 'earth') stamp(TUFT.earth[tick % 4 < 2 ? 0 : 1]!, b.ecx - 3, topAt(b.ecx - 1), { g: C.leaf, d: C.leafD }, 'element')

  // Outline. Outline next to a glowing part pulses in the glow colour.
  const glowing = (i: number) => {
    const o = owner[i]
    if (!o) return false
    if (glow.has(o)) return true
    return o === 'body' && glow.has('element') && !tuft // element with no tuft = the whole body changed
  }
  const pulse = Math.sin((t + phase) / 180) > -0.2
  const out: (string | null)[] = new Array(N * N).fill(null)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x
    if (sil[i]) continue
    const nb = [ok(x, y - 1) && i - N, ok(x, y + 1) && i + N, ok(x - 1, y) && i - 1, ok(x + 1, y) && i + 1].filter((n): n is number => n !== false && sil[n] != null)
    if (!nb.length) continue
    out[i] = glow.size && pulse && nb.some(glowing) ? C.glow : pal.o
  }

  if (b.gloss) {
    const gx = Math.round(b.sh.cx - b.sh.rx * 0.55), gy = Math.round(b.sh.cy - b.sh.ry * 0.5)
    for (const [x, y] of [[gx, gy], [gx + 1, gy], [gx, gy + 1]] as const) if (I(x, y)) set(sil, x, y, C.white)
  }

  // Face: always the top layer.
  const k = pal.o, cx = b.ecx, ey = b.ey
  const eyeAt = (name: keyof typeof EYES, left: boolean) => {
    let p = EYES[name]
    if (blink) p = ['k'.repeat(p[0]!.length)]
    const w = p[0]!.length, h = p.length
    const x0 = left ? cx - 3 - w : cx + 3, y0 = ey - Math.floor(h / 2) + (name === 'sleepy' ? 1 : 0)
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const ch = p[r]![c]!
      if (ch === '.') continue
      set(sil, x0 + c, y0 + r, ch === 'w' ? C.white : k)
      if (ok(x0 + c, y0 + r)) eyes.add((y0 + r) * N + x0 + c)
    }
  }
  if (lk.eyes === 'wink') { eyeAt('big', true); eyeAt('happy', false) }
  else { eyeAt(lk.eyes, true); eyeAt(lk.eyes, false) }
  for (const [x, y] of [[cx - 6, ey + 2], [cx - 5, ey + 2], [cx + 4, ey + 2], [cx + 5, ey + 2]] as const) if (I(x, y)) set(sil, x, y, C.cheek)
  const my = ey + 3
  if (b.beak) { set(sil, cx - 1, ey + 2, C.beak); set(sil, cx, ey + 2, C.beak); set(sil, cx - 1, ey + 3, C.beakD); set(sil, cx, ey + 3, C.beakD) }
  else if (lk.eyes === 'happy' || lk.eyes === 'sparkle') {
    for (let x = cx - 2; x <= cx + 1; x++) set(sil, x, my, k)
    set(sil, cx - 1, my + 1, C.mouthIn); set(sil, cx, my + 1, C.mouthIn)
  } else if (lk.eyes === 'surprised') { set(sil, cx - 1, my, k); set(sil, cx, my, k); set(sil, cx - 1, my + 1, k); set(sil, cx, my + 1, k) }
  else if (lk.eyes === 'sleepy') { set(sil, cx - 1, my, k); set(sil, cx, my, k) }
  else { set(sil, cx - 2, my, k); set(sil, cx + 1, my, k); set(sil, cx - 1, my + 1, k); set(sil, cx, my + 1, k) }

  // Element particles.
  const tt = t + phase
  if (lk.element === 'fire') {
    const top = topAt(b.ecx)
    ;[-6, 5].forEach((dx, i) => set(over, b.ecx + dx, top - 1 - Math.floor((tt / 140 + i * 5) % 7), i ? C.fy : C.fo))
  }
  if (lk.element === 'water') for (const [dx, o] of [[-13, 0], [12, 3], [-11, 6]] as const) {
    const y = 27 - Math.floor((tt / 170 + o) % 14)
    set(over, b.mx + dx, y, C.bub); set(over, b.mx + dx, y + 1, pal.s)
  }
  if (lk.element === 'air') for (const o of [0, 2.1, 4.2]) {
    const a = tt / 700 + o, x = Math.round(16 + Math.cos(a) * 14), y = Math.round(18 + Math.sin(a) * 6)
    for (let j = 0; j < 3; j++) set(over, x - j * (Math.sin(a) > 0 ? 1 : -1), y, j ? pal.s : C.white)
  }
  if (lk.element === 'void') for (const [x, y, o] of [[3, 6, 0], [28, 9, 1.3], [5, 22, 2.6], [27, 24, 3.9]] as const) {
    const v = Math.sin(tt / 400 + o)
    if (v > -0.2) {
      set(over, x, y, C.star)
      if (v > 0.5) { set(over, x - 1, y, pal.l); set(over, x + 1, y, pal.l); set(over, x, y - 1, pal.l); set(over, x, y + 1, pal.l) }
    }
  }

  const px = sil.map((c, i) => (eyes.has(i) ? c : over[i] ?? c ?? out[i] ?? null))

  const ground: number[] = []
  const [lo, hi] = edges(27)
  const hw = Math.max(4, (hi - lo) / 2 + 1)
  for (let x = 0; x < N; x++) {
    const d = Math.abs(x + 0.5 - b.mx)
    if (d <= hw) ground.push(29 * N + x)
    if (d <= hw - 3) ground.push(30 * N + x)
  }
  return { px, ground, eyes }
}
