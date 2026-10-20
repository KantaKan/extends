// Act 1 (no class in the file yet): one slime, driven line by line.
// Every action waits until the slime has finished it, then the next line runs.

interface Slime {
  /** Shown above its head. `slime.name = "Mochi"` */
  name: string
  readonly hp: number
  readonly energy: number
  /** 0 = full, 100 = starving */
  readonly hunger: number
  readonly x: number
  readonly y: number
  /** Walk to an Essence and pick it up. Waits until it has it. `true` if it got it. */
  gather(target: Essence | null): boolean
  /** `gather(nearest("essence"))` */
  gatherNearest(): boolean
  /** Walk to a point. Waits until it arrives. `false` if too tired. */
  move(x: number, y: number): boolean
  /** Eat 1 Essence from the lab. `true` if it ate. */
  eat(): boolean
}

/** Your first slime. */
declare const slime: Slime
