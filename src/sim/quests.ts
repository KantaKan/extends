import type { World } from './world'

// Quest definitions are data (content/quests.json); this only knows how to check each goal type.

/** A concept the quest teaches: the player's code must really use it (src/editor/features.ts). */
export type Concept = 'loop' | 'if' | 'function' | 'this' | 'class'

export type Goal = (
  | { type: 'renamed' }
  | { type: 'gathered'; count: number }
  | { type: 'ate'; count: number }
  | { type: 'fieldCleared' }
  | { type: 'herd'; count: number; uniqueNames?: boolean }
  /** `count` different creatures each ate at least once since the quest started. */
  | { type: 'eachAte'; count: number }
  /** `count` creatures (default 1) of a class that extends a player class and changes its element. */
  | { type: 'subclass'; changes: 'element'; count?: number }
  /** Machine levels bought, in total. */
  | { type: 'upgraded'; count: number }
  | { type: 'researched'; count: number }
  /** Species in the codex. */
  | { type: 'species'; count: number }
) & { needs?: Concept[] }

export type Quest = { id: string; goal: Goal; reward: { lights?: boolean }; textKey: string }

/** What the quest checker needs to know about each player class (from the sandbox). */
export type ClassInfo = Map<string, { element: string; parent: string | null }>

/** `missing`: the count is reached but the code skipped the concept this quest teaches. */
export type Progress = { have: number; need: number; missing?: Concept }

/** Everything a goal can look at besides the world. */
export type QuestContext = {
  classes: ClassInfo
  /** World stats when the quest started, so earlier work doesn't count. */
  since: World['stats']
  /** Each creature's meals when the quest started (creatures born later count from 0). */
  mealsAtStart: Record<number, number>
  /** Concepts the player's code uses. */
  code: Record<Concept, boolean>
  /** Parts researched so far. */
  unlocks: number
  /** Species found so far (codex). */
  species: number
}

const count = (have: number, need: number): Progress => ({ have: Math.max(0, Math.min(have, need)), need })

function measure(goal: Goal, w: World, { classes, since, mealsAtStart, unlocks, species }: QuestContext): Progress {
  switch (goal.type) {
    case 'renamed': return count(w.stats.renamed - since.renamed, 1)
    case 'gathered': return count(w.stats.gathered - since.gathered, goal.count)
    case 'ate': return count(w.stats.ate - since.ate, goal.count)
    case 'fieldCleared': return count(w.stats.cleared - since.cleared, 1)
    case 'eachAte': return count(w.creatures.filter((c) => c.meals > (mealsAtStart[c.id] ?? 0)).length, goal.count)
    case 'herd': return count(goal.uniqueNames ? new Set(w.creatures.map((c) => c.name)).size : w.creatures.length, goal.count)
    case 'subclass': {
      // A class that extends a player class and changes its element: inheritance, not copy-paste.
      const morphed = w.creatures.filter((c) => {
        const info = classes.get(c.className)
        const parent = info?.parent ? classes.get(info.parent) : undefined
        return !!info && !!parent && info.element !== parent.element
      })
      return count(morphed.length, goal.count ?? 1)
    }
    case 'upgraded': return count(Object.values(w.levels).reduce((a, b) => a + b, 0), goal.count)
    case 'researched': return count(unlocks, goal.count)
    case 'species': return count(species, goal.count)
  }
}

export function progress(goal: Goal, w: World, ctx: QuestContext): Progress {
  const p = measure(goal, w, ctx)
  // Reached the goal the copy-paste way? Then the lesson's concept is what's still missing.
  if (p.have >= p.need) {
    const missing = goal.needs?.find((c) => !ctx.code[c])
    if (missing) p.missing = missing
  }
  return p
}

export const done = (p: Progress) => p.have >= p.need && !p.missing
