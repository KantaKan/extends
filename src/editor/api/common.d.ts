// What the editor knows about in every mode.

interface Essence {
  readonly kind: 'essence'
  readonly id: number
  readonly x: number
  readonly y: number
  /** Golden Essence: worth 5, but it vanishes after 15 seconds. */
  readonly golden: boolean
}

/**
 * The closest thing of that kind (to the slime, or to the creature being updated). `null` if there is none.
 * `"essence"` = any Essence, `"golden"` = golden Essence only.
 */
declare function nearest(kind: 'essence' | 'golden'): Essence | null

declare const console: { log(...args: unknown[]): void }
