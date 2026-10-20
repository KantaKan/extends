import th from '../../content/i18n/th.json'
import en from '../../content/i18n/en.json'

export type Key = keyof typeof th
const dicts: Record<'th' | 'en', Record<Key, string>> = { th, en }
let lang: 'th' | 'en' = 'th'

export const setLang = (l: 'th' | 'en') => { lang = l }

/** Look up a UI string; `{name}` placeholders are filled from `vars`. */
export function t(key: Key, vars: Record<string, string | number> = {}): string {
  return dicts[lang][key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`))
}
