export const TICK_MS = 100 // 10 ticks per second

/** Hard cap so a backgrounded tab doesn't replay minutes of ticks in one frame. */
export const MAX_TICKS_PER_FRAME = 64

/**
 * Fixed-step accumulator. Given leftover time and a frame delta, how many ticks to run now.
 * `speed` is the time multiplier (0 = paused, 1, 4, 16).
 */
export function ticksDue(accMs: number, dtMs: number, speed: number): { ticks: number; accMs: number } {
  const acc = accMs + dtMs * speed
  const ticks = Math.min(MAX_TICKS_PER_FRAME, Math.floor(acc / TICK_MS))
  return { ticks, accMs: ticks === MAX_TICKS_PER_FRAME ? 0 : acc - ticks * TICK_MS }
}
