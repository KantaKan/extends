import ELEMENTS from '../../content/elements.json'
import { NO_TRAITS, type Traits } from './creature'

const TABLE: Record<string, Traits> = ELEMENTS

/** className → personality, from each class's element. Unknown elements get the defaults. */
export function traitsFor(elementOf: ReadonlyMap<string, string>): Record<string, Traits> {
  return Object.fromEntries([...elementOf].map(([cls, el]) => [cls, TABLE[el] ?? NO_TRAITS]))
}
