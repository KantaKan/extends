// Class mode (the file declares a class): each creature runs update() every tick.

declare class Creature {
  readonly id: number
  /** Shown above its head: `const slime = new Slime(); slime.name = "Mochi"` */
  name: string
  readonly x: number
  readonly y: number
  readonly hp: number
  readonly energy: number
  readonly hunger: number
  // Morph: these become parts on the creature the moment you save.
  // (Typed as string so `body = "blob"` in a subclass never shows a false error.)
  /** "blob" | "quad" | "bird" | "serpent" | "bean" | "puff" */
  body?: string
  /** "none" | "fire" | "water" | "earth" | "air" | "void" */
  element?: string
  /** "big" | "dot" | "happy" | "sleepy" | "sparkle" | "surprised" | "wink" */
  eyes?: string
  /** "none" | "small" | "big", or a number (0 = none) */
  horns?: string | number
  /** Called by the lab every tick (10 times a second). */
  update?(): void
  /** Walk one step towards a point. */
  move(x: number, y: number): void
  move(target: { x: number; y: number }): void
  /** Spend 1 Essence from the lab to lower hunger. */
  eat(): void
  /** Walk to an Essence and pick it up. */
  gather(target: Essence | null): void

  /** Go and gather the closest Essence. */
  gatherNearest(): void
}
