import { BODY_NAMES, type BodyName } from './bodies'
import { ELEMENTS, type Element } from './palette'
import { EYE_NAMES, type EyeName, type HornSize } from './parts'

/** The parts a class asks for, after validation. */
export type Looks = { body: BodyName; element: Element; eyes: EyeName; horns: HornSize | 'none' }
export type Part = keyof Looks
export const PARTS: Part[] = ['body', 'element', 'eyes', 'horns']
export const DEFAULT_LOOKS: Looks = { body: 'blob', element: 'none', eyes: 'big', horns: 'none' }

/** What the sandbox reports per class: raw property values + parent class name. */
export type RawSpecies = Record<string, { looks: Record<string, unknown>; parent: string | null }>

export type Species = {
  looks: Looks
  glow: ReadonlySet<Part>
  invalid: { part: Part; value: unknown }[]
  /** Parts the code asks for that aren't researched yet (drawn as the default meanwhile). */
  locked: { part: Part; value: string }[]
}

/** Is this part value still locked behind research? */
export type LockCheck = (part: Part, value: string) => boolean

const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v)

function horns(v: unknown): Looks['horns'] | undefined {
  if (v === 'small' || v === 'big' || v === 'none') return v
  if (typeof v === 'number' || typeof v === 'boolean') return v ? 'small' : 'none' // `horns = 2` → a pair
  return undefined
}

export function normalizeLooks(raw: Record<string, unknown>): { looks: Looks; invalid: Species['invalid'] } {
  const looks = { ...DEFAULT_LOOKS }
  const invalid: Species['invalid'] = []
  const take = <P extends Part>(part: P, ok: Looks[P] | undefined) => {
    const v = raw[part]
    if (v === undefined) return
    if (ok === undefined) invalid.push({ part, value: v })
    else looks[part] = ok
  }
  take('body', oneOf(BODY_NAMES, raw.body) ? raw.body : undefined)
  take('element', oneOf(ELEMENTS, raw.element) ? raw.element : undefined)
  take('eyes', oneOf(EYE_NAMES, raw.eyes) ? raw.eyes : undefined)
  take('horns', horns(raw.horns))
  return { looks, invalid }
}

/**
 * Normalize every class. A class that extends another player class glows on the parts it
 * changed (GDD: inherited parts draw normally, newly added parts glow).
 */
export function buildSpecies(raw: RawSpecies, isLocked: LockCheck = () => false): Map<string, Species> {
  const out = new Map<string, Species>()
  const norm = new Map(Object.entries(raw).map(([k, v]) => [k, lockParts(normalizeLooks(v.looks), isLocked)]))
  for (const [name, { parent }] of Object.entries(raw)) {
    const me = norm.get(name)!
    const base = parent ? norm.get(parent) : undefined
    const glow = new Set(base ? PARTS.filter((p) => me.looks[p] !== base.looks[p]) : [])
    out.set(name, { looks: me.looks, glow, invalid: me.invalid, locked: me.locked })
  }
  return out
}

function lockParts(n: { looks: Looks; invalid: Species['invalid'] }, isLocked: LockCheck) {
  const looks = { ...n.looks }
  const locked: Species['locked'] = []
  for (const part of PARTS) {
    if (looks[part] !== DEFAULT_LOOKS[part] && isLocked(part, looks[part])) {
      locked.push({ part, value: looks[part] })
      ;(looks as Record<Part, string>)[part] = DEFAULT_LOOKS[part]
    }
  }
  return { ...n, looks, locked }
}
