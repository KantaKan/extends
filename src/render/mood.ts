import type { Creature } from '../sim/creature'

export const HUNGRY_AT = 70
export const TIRED_BELOW = 15

/** What a creature's face shows (GDD: the eyes tell its state, no bars needed). */
export type Mood = { hungry: boolean; tired: boolean }

export const moodOf = (c: Pick<Creature, 'hunger' | 'energy'>): Mood => ({ hungry: c.hunger > HUNGRY_AT, tired: c.energy < TIRED_BELOW })
