export const NUDGE_AFTER_TICKS = 300 // 30 s of lab time

/**
 * Should Ref nudge the player? Only when a quest is running, nothing moved on it and the code
 * wasn't saved for a while, and Ref hasn't nudged for this quest yet.
 */
export function shouldNudge(s: {
  tick: number
  lastProgressTick: number
  lastSaveTick: number
  questActive: boolean
  inTutorial: boolean
  alreadyNudged: boolean
}): boolean {
  if (!s.questActive || s.inTutorial || s.alreadyNudged) return false
  return s.tick - s.lastProgressTick >= NUDGE_AFTER_TICKS && s.tick - s.lastSaveTick >= NUDGE_AFTER_TICKS
}
