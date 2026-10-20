import { describe, expect, it } from 'vitest'
import en from '../../content/i18n/en.json'
import th from '../../content/i18n/th.json'
import NOTEBOOK from '../../content/notebook.json'
import QUESTS from '../../content/quests.json'

const keys = [
  ...NOTEBOOK.api.script.map((e) => e.key),
  ...NOTEBOOK.api.class.map((e) => e.key),
  ...NOTEBOOK.lessons.flatMap((l) => [`nb.lesson.${l.id}.title`, `nb.lesson.${l.id}.body`]),
  ...QUESTS.flatMap((q) => [`quest.${q.textKey}.title`, `quest.${q.textKey}.hint`, `quest.${q.textKey}.nudge`]),
]

describe('content text', () => {
  it('every notebook and quest key exists in Thai and English', () => {
    for (const k of keys) {
      expect(th, `th: ${k}`).toHaveProperty([k])
      expect(en, `en: ${k}`).toHaveProperty([k])
    }
  })
  it('Thai and English have exactly the same keys', () => {
    expect(Object.keys(th).sort()).toEqual(Object.keys(en).sort())
  })
  it('every lesson unlocks with a real quest', () => {
    const ids = new Set(QUESTS.map((q) => q.id))
    for (const l of NOTEBOOK.lessons) expect(ids.has(l.unlock), l.unlock).toBe(true)
  })
})
