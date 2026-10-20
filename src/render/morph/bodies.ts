// Each body declares its shape (`inside`) and anchors. Parts only ever read these anchors,
// so a new body works with every existing part. Ported from reference/morph-lab.html.

export type Body = {
  inside(x: number, y: number): boolean
  ecx: number // head centre x
  ey: number // eye line y
  mx: number // body middle x (mirror axis)
  sh: { cx: number; cy: number; rx: number; ry: number } // ellipse used for markings / gloss
  feet?: boolean
  beak?: boolean
  gloss?: boolean
}

/** s = squash (-1..1) from the bounce, k = size scale. */
export type BodyFn = (s: number, k: number) => Body

const sup = (dx: number, dy: number, e: number) => Math.abs(dx) ** e + Math.abs(dy) ** e <= 1

export const BODIES = {
  blob(s, k) {
    const rx = (11 + s * 0.8) * k, tr = (11 - s * 1.2) * k, bot = 8 * k, cy = 29 - bot
    return {
      inside(x, y) {
        const px = x + 0.5, py = y + 0.5, dx = (px - 16) / rx
        if (py < cy) { const dy = (py - cy) / tr; return dx * dx + dy * dy <= 1 }
        const dy = (py - cy) / bot
        return py < 29 && dx ** 4 + dy ** 4 <= 1
      },
      ecx: 16, ey: Math.round(cy - tr * 0.3), mx: 16, sh: { cx: 16, cy: cy - 1, rx, ry: tr }, gloss: true,
    }
  },
  quad(s, k) {
    const rx = (10 + s * 0.7) * k, ry = (7.5 - s * 0.8) * k, cy = 26.6 - ry + s * 0.3
    const o = Math.round(rx * 0.78), i = Math.max(2, Math.round(rx * 0.22))
    const legs = new Set([16 - o - 1, 16 - o, 15 + o, 16 + o, 16 - i - 1, 16 - i, 15 + i, 16 + i])
    return {
      inside(x, y) {
        if (sup((x + 0.5 - 16) / rx, (y + 0.5 - cy) / ry, 2.4)) return true
        return y >= 24 && y <= 28 && legs.has(x)
      },
      ecx: 16, ey: Math.round(cy - 1), mx: 16, sh: { cx: 16, cy, rx, ry },
    }
  },
  bird(s, k) {
    const rx = (9 + s * 0.7) * k, ry = (9 - s * 0.8) * k, cy = 27.6 - ry + s * 0.3
    return {
      inside: (x, y) => sup((x + 0.5 - 16) / rx, (y + 0.5 - cy) / ry, 2.1),
      ecx: 16, ey: Math.round(cy - 2 * k), mx: 16, sh: { cx: 16, cy, rx, ry }, feet: true, beak: true,
    }
  },
  serpent(s, k) {
    const crx = (11 + s * 0.6) * k, cry = (3.8 - s * 0.3) * k, ccy = 28.8 - cry, ny = ccy - 4.6 * k
    const hrx = (6.8 + s * 0.5) * k, hry = (6.4 - s * 0.6) * k, hy = ny - 5.6 * k
    return {
      inside(x, y) {
        const px = x + 0.5, py = y + 0.5
        return sup((px - 17) / hrx, (py - hy) / hry, 2.2) || sup((px - 16) / (4.6 * k), (py - ny) / (4.2 * k), 2) || (py < 29 && sup((px - 15) / crx, (py - ccy) / cry, 2.2))
      },
      ecx: 17, ey: Math.round(hy), mx: 16, sh: { cx: 17, cy: hy, rx: hrx, ry: hry },
    }
  },
  bean(s, k) {
    const rx = (7.6 + s * 0.7) * k, ry = (11 - s * 1) * k, cy = 28.8 - ry
    return {
      inside: (x, y) => sup((x + 0.5 - 16) / rx, (y + 0.5 - cy) / ry, 2.3),
      ecx: 16, ey: Math.round(cy - ry * 0.22), mx: 16, sh: { cx: 16, cy, rx, ry }, gloss: true,
    }
  },
  puff(s, k) {
    const R = 9.8 * k, rx = R * (1 + s * 0.08), ry = R * (1 - s * 0.1), cy = 28.6 - ry
    return {
      inside(x, y) {
        const dx = (x + 0.5 - 16) / rx, dy = (y + 0.5 - cy) / ry
        return Math.sqrt(dx * dx + dy * dy) <= 1 + 0.1 * Math.cos(10 * Math.atan2(dy, dx))
      },
      ecx: 16, ey: Math.round(cy - 1), mx: 16, sh: { cx: 16, cy, rx, ry },
    }
  },
} satisfies Record<string, BodyFn>

export type BodyName = keyof typeof BODIES
export const BODY_NAMES = Object.keys(BODIES) as BodyName[]
