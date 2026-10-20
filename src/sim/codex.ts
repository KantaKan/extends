import CODEX from '../../content/codex.json'

// Species codex: every body × element combo is a species with its own nickname (syllables from
// content/codex.json, picked like reference/morph-lab.html). A species is discovered the first time
// a creature of it lives in the lab.

const ES: Record<string, string[]> = CODEX.elementSyllables
const BS: Record<string, string[]> = CODEX.bodySyllables

export const codexKey = (body: string, element: string) => `${body}:${element}`

function hash(str: string) {
  let h = 2166136261
  for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** The species' nickname, e.g. "Flammochi". Same combo, same name, every time. */
export function nickname(body: string, element: string): string {
  const h = hash(codexKey(body, element))
  const e = ES[element] ?? ES.none!, b = BS[body] ?? BS.blob!
  return e[h % e.length]! + b[(h >>> 4) % b.length]!
}

/** Add the species seen now to `found`; returns the ones that are new. */
export function discover(found: Set<string>, seen: Iterable<string>): string[] {
  const fresh: string[] = []
  for (const k of seen) if (!found.has(k)) { found.add(k); fresh.push(k) }
  return fresh
}
