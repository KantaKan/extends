// Ref, the grumpy lab robot: turns engine errors into plain words (UI text, via i18n).
import { BODY_NAMES } from '../render/morph/bodies'
import type { Part, Species } from '../render/morph/looks'
import { ELEMENTS } from '../render/morph/palette'
import { EYE_NAMES } from '../render/morph/parts'
import type { CodeError } from '../sandbox/client'
import { t } from './i18n'

const OPTIONS: Record<Part, readonly string[]> = { body: BODY_NAMES, element: ELEMENTS, eyes: EYE_NAMES, horns: ['none', 'small', 'big'] }

/**
 * `lines` maps emitted-JS lines back to editor lines (from the source map). `mode`: act-1 scripts have no
 * class or method to blame, and QuickJS reports their runaway loops on line 1, so that message names the cause instead.
 */
export function explainError(e: CodeError, name: string | null, lines: readonly number[] = [], mode: 'script' | 'class' = 'class'): string {
  const line = e.line === undefined ? '?' : (lines[e.line] ?? e.line)
  const who = name ?? t('ref.someone')
  const msg = e.message.replace(/^\w*Error: /, '')
  const load = e.id === null
  switch (e.kind) {
    case 'syntax': return t('ref.syntax', { line, msg })
    case 'timeout':
      if (mode === 'script') return t('ref.scriptTimeout', { name: name ?? 'slime' })
      return t(load ? 'ref.loadTimeout' : 'ref.timeout', { name: who, line })
    case 'mana': return t('ref.mana', { name: who })
    case 'no-class': return t('ref.noClass', { name: who, cls: e.message })
  }
  let m: RegExpMatchArray | null
  if ((m = msg.match(/^cannot (?:read|set) property '(.+)' of (undefined|null)/))) return t('ref.undefined', { name: who, prop: m[1]!, what: m[2]!, line })
  if ((m = msg.match(/^'(.+)' is not defined/))) {
    // `slime` only exists in act-1 scripts; inside a class the creature is `this`.
    if (m[1] === 'slime') return t('ref.slimeInClass', { line })
    return t('ref.notDefined', { ident: m[1]!, line })
  }
  if (/not a function/.test(msg)) return t('ref.notFunction', { name: who, line })
  return t(load ? 'ref.loadError' : 'ref.error', { name: who, line, msg })
}

export function explainInvalidParts(species: Map<string, Species>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const sp of species.values()) for (const { part, value } of sp.invalid) {
    const key = `${part}:${String(value)}`
    if (seen.has(key)) continue // a subclass repeats its parent's mistake; say it once
    seen.add(key)
    out.push(t('ref.invalidPart', { part: t(`part.${part}`), value: String(value), options: OPTIONS[part].join(', ') }))
  }
  return out
}
