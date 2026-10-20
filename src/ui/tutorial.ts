import STEPS from '../../content/tutorial.json'
import { stripComments } from '../editor/features'

export type TutorialEvent =
  | { type: 'clickCreature' }
  | { type: 'openDna' }
  | { type: 'typed'; text: string }
  | { type: 'saved' }
  | { type: 'closeDna' }

export type PointAt = 'creature' | 'dna-handle' | 'editor-line' | 'none'
export type Step = { id: string; textKey: string; waitFor: TutorialEvent['type']; pointAt: PointAt }

export const TUTORIAL = STEPS as Step[]
export const TUTORIAL_DONE = TUTORIAL.length

/** The line the player writes in step "type" (the starter comment shows it). */
export const FIRST_LINE = 'slime.gather(nearest("essence"))'
const WROTE_FIRST_LINE = /\bslime\.gather(Nearest)?\s*\(/

/** Ref walks the player through: each step waits for one specific thing. Anything else is ignored. */
export function advance(ix: number, e: TutorialEvent): number {
  const step = TUTORIAL[ix]
  if (!step || step.waitFor !== e.type) return ix
  if (e.type === 'typed' && !WROTE_FIRST_LINE.test(stripComments(e.text))) return ix
  return ix + 1
}

