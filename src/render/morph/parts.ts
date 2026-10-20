// Pixel patterns, bottom row = anchor row. '.' = empty. Ported from reference/morph-lab.html.

export const HORNS = {
  small: ['#..', '##.', '#l#', '###', '###'],
  big: ['#...', '##..', '.##.', '.#l#', '.###', '####'],
}
export type HornSize = keyof typeof HORNS

export const TUFT = {
  fire: [['.y.', 'yy.', 'yoy', 'oro', 'ooo'], ['.y.', '.yy', 'yoy', 'oro', 'ooo']],
  earth: [['gg.gg', '.gdg.', '..d..', '..d..'], ['.gg.gg', '..gdg.', '...d..', '..d...']],
}

export const EYES = {
  big: ['wk', 'kk', 'kk'],
  dot: ['wk', 'kk'],
  happy: ['.k.', 'k.k'],
  sleepy: ['kkk'],
  sparkle: ['wkk', 'kkk', 'kkw'],
  surprised: ['kkk', 'k.k', 'kkk'],
}
export type EyeName = keyof typeof EYES | 'wink'
export const EYE_NAMES = [...Object.keys(EYES), 'wink'] as EyeName[]
