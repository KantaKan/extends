import COSTS from '../../content/research.json'

// Research: Crystal unlocks body parts (content/research.json). Anything not listed is free from the
// start — blob body, big eyes, no horns, and the starter elements (none / fire / water / earth).

const TABLE: Record<string, number> = COSTS

export const researchKey = (part: string, value: string) => `${part}:${value}`

/** Crystal price, or 0 for parts everyone has. */
export const researchCost = (part: string, value: string) => TABLE[researchKey(part, value)] ?? 0

export const isLocked = (unlocked: ReadonlySet<string>, part: string, value: string) =>
  researchCost(part, value) > 0 && !unlocked.has(researchKey(part, value))

/** Spend Crystal on a part. Returns false (and changes nothing) if it's free, owned, or unaffordable. */
export function research(unlocked: Set<string>, wallet: { crystal: number }, part: string, value: string): boolean {
  const cost = researchCost(part, value)
  if (!cost || unlocked.has(researchKey(part, value)) || wallet.crystal < cost) return false
  wallet.crystal -= cost
  unlocked.add(researchKey(part, value))
  return true
}
