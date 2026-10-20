/** World-side creature state. Player code only ever sees a copy of this. */
export type Creature = {
  id: number
  name: string
  className: string
  x: number // tiles, float
  y: number
  hp: number
  energy: number
  hunger: number
  /** How many times it has eaten (quests: "each eats by its own hunger"). */
  meals: number
}

export const STAT_MAX = 100

// Balance numbers (ticks are 1/10 s).
export const SPEED = 0.25 // tiles per tick
export const REACH = 0.6 // tiles: close enough to gather
export const HUNGER_PER_TICK = 0.1 // full hunger after ~100 s
export const EAT_RELIEF = 40
export const EAT_ENERGY = 30 // food is energy: a starving, worn-out creature can eat and walk again
export const MOVE_ENERGY = 0.2
export const ENERGY_REGEN = 0.5 // per idle tick
export const STARVING_DRAIN = 0.5 // energy lost per tick spent walking while starving
export const STARVING_REGEN = 0.15 // a starving creature that stands still still gets its breath back: no dead ends

/** Personality multipliers, per class (from its element; content/elements.json). */
export type Traits = { speed: number; hunger: number; moveEnergy: number }
export const NO_TRAITS: Traits = { speed: 1, hunger: 1, moveEnergy: 1 }

export function newCreature(id: number, name: string, className: string, x: number, y: number): Creature {
  return { id, name, className, x, y, hp: STAT_MAX, energy: STAT_MAX, hunger: 0, meals: 0 }
}

/** Step towards (tx, ty). Returns false if too tired to move. */
export function stepTowards(c: Creature, tx: number, ty: number, tr: Traits = NO_TRAITS): boolean {
  if (c.energy <= 0) return false
  const dx = tx - c.x, dy = ty - c.y
  const d = Math.hypot(dx, dy)
  const speed = SPEED * tr.speed
  if (d <= speed) { c.x = tx; c.y = ty }
  else { c.x += (dx / d) * speed; c.y += (dy / d) * speed }
  c.energy = Math.max(0, c.energy - MOVE_ENERGY * tr.moveEnergy)
  return true
}

/** Per-tick body needs. `moved` = the creature spent energy this tick. */
export function updateNeeds(c: Creature, moved: boolean, tr: Traits = NO_TRAITS) {
  c.hunger = Math.min(STAT_MAX, c.hunger + HUNGER_PER_TICK * tr.hunger)
  const starving = c.hunger >= STAT_MAX
  if (moved) { if (starving) c.energy = Math.max(0, c.energy - STARVING_DRAIN) }
  else c.energy = Math.min(STAT_MAX, c.energy + (starving ? STARVING_REGEN : ENERGY_REGEN))
}
