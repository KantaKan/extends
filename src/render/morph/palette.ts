// Ported from reference/morph-lab.html. Parts use palette roles (b base, l light, s shade, o outline).

export const ELEMENTS = ['none', 'fire', 'water', 'earth', 'air', 'void'] as const
export type Element = (typeof ELEMENTS)[number]
export type Palette = { b: string; l: string; s: string; o: string }

export const PAL: Record<Element, Palette> = {
  none: { b: '#9ed8ff', l: '#dbf2ff', s: '#6fb0e4', o: '#2a4670' },
  fire: { b: '#ffa77a', l: '#ffdcc4', s: '#ec7653', o: '#6b2a2c' },
  water: { b: '#5cc4d6', l: '#b4eff4', s: '#3a95b6', o: '#173d55' },
  earth: { b: '#a6d47e', l: '#dcf3c0', s: '#78ab56', o: '#2b4922' },
  air: { b: '#cdf3e6', l: '#f6fffc', s: '#92d4bf', o: '#2a5a50' },
  void: { b: '#b9a3f5', l: '#e7deff', s: '#8b71db', o: '#32256a' },
}

/** Fixed colours: only for things that are not "the creature" (horn bone, flames, eye whites…). */
export const C = {
  white: '#ffffff', pink: '#ffb0c4', cheek: '#ff94b2', beak: '#ffb347', beakD: '#e5832a',
  hornB: '#fff0c4', hornS: '#e5c98a', fy: '#ffe066', fo: '#ff8a3d', fr: '#ff5a3d',
  leaf: '#7dcf5a', leafD: '#4f9a3a', mouthIn: '#ff6f8a', bub: '#e6fbff', star: '#fff7c2',
  glow: '#fffbe0',
}
