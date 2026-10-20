import { useEffect, useRef, useState } from 'react'
import NOTEBOOK from '../../content/notebook.json'
import { BODY_NAMES } from '../render/morph/bodies'
import { compose } from '../render/morph/compose'
import { DEFAULT_LOOKS, type Looks, type Part } from '../render/morph/looks'
import { paint } from '../render/morph/paint'
import { ELEMENTS } from '../render/morph/palette'
import { EYE_NAMES } from '../render/morph/parts'
import type { Quest } from '../sim/quests'
import { codexKey, nickname } from '../sim/codex'
import { isLocked, researchCost } from '../sim/research'
import { t, type Key } from './i18n'
import { questText } from './QuestCard'

type Tab = 'api' | 'parts' | 'codex' | 'resources' | 'lessons'
const TABS: Tab[] = ['api', 'parts', 'codex', 'resources', 'lessons']

export const PART_OPTIONS: Record<Part, readonly string[]> = { body: BODY_NAMES, element: ELEMENTS, eyes: EYE_NAMES, horns: ['none', 'small', 'big'] }

type Props = {
  mode: 'script' | 'class'
  /** Quests started so far (ids): a lesson page opens when its quest begins, to learn while doing it. */
  unlocked: ReadonlySet<string>
  quests: Quest[]
  /** Crystal (null before the orders board exists), researched parts, and the buy action. */
  research: Research
  /** Discovered species (`body:element`); `count` re-renders on a new find. */
  codex: { found: ReadonlySet<string>; count: number }
}

export type Research = { crystal: number | null; owned: ReadonlySet<string>; count: number; buy: (part: Part, value: string) => void }

/** Professor Null's notebook: the in-game reference, next to the editor. */
export function Notebook({ mode, unlocked, quests, research, codex }: Props) {
  const [tab, setTab] = useState<Tab>('api')
  return (
    <aside className="notebook" aria-label={t('nb.title')}>
      <h2>{t('nb.title')}</h2>
      <div className="nb-tabs" role="tablist">
        {TABS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{t(`nb.tab.${k}` as Key)}</button>
        ))}
      </div>
      <div className="nb-page" role="tabpanel">
        {tab === 'api' && (
          <dl className="nb-api">
            {NOTEBOOK.api[mode].map((e) => (
              <div key={e.code}><dt><code>{e.code}</code></dt><dd>{t(e.key as Key)}</dd></div>
            ))}
          </dl>
        )}
        {tab === 'parts' && <PartsPage research={research} />}
        {tab === 'codex' && <CodexPage found={codex.found} />}
        {tab === 'resources' && <p className="nb-text">{t('nb.resources.body')}</p>}
        {tab === 'lessons' && NOTEBOOK.lessons.map((l) => {
          const open = unlocked.has(l.unlock)
          const q = quests.find((k) => k.id === l.unlock)
          return (
            <section key={l.id} className={`nb-lesson${open ? '' : ' locked'}`}>
              <h3>{t(`nb.lesson.${l.id}.title` as Key)}</h3>
              <p className="nb-text">{open ? t(`nb.lesson.${l.id}.body` as Key) : t('nb.locked', { quest: q ? questText(q, 'title') : l.unlock })}</p>
            </section>
          )
        })}
      </div>
    </aside>
  )
}

/** Every valid value of every part, as chips; the picked one is previewed live. */
function PartsPage({ research }: { research: Research }) {
  const [pick, setPick] = useState<{ part: Part; value: string }>({ part: 'body', value: 'blob' })
  const looks: Looks = { ...DEFAULT_LOOKS, [pick.part]: pick.value }
  return (
    <div className="nb-parts">
      <p className="nb-text">{t('nb.parts.intro')}</p>
      <div className="nb-preview">
        <Preview looks={looks} />
        <div>
          <code>{pick.part} = "{pick.value}"</code>
          {isLocked(research.owned, pick.part, pick.value) && (
            <ResearchButton cost={researchCost(pick.part, pick.value)} crystal={research.crystal} onBuy={() => research.buy(pick.part, pick.value)} />
          )}
        </div>
      </div>
      {(Object.keys(PART_OPTIONS) as Part[]).map((part) => (
        <div key={part} className="nb-chips">
          <b>{part}</b>
          {PART_OPTIONS[part].map((value) => {
            const locked = isLocked(research.owned, part, value)
            return (
              <button key={value} type="button" className={locked ? 'locked' : ''} aria-pressed={pick.part === part && pick.value === value} onClick={() => setPick({ part, value })}>
                {locked && <span aria-label={t('nb.lockedChip')}>🔒</span>}{value}{locked && <small>◆{researchCost(part, value)}</small>}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function Preview({ looks }: { looks: Looks }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const latest = useRef(looks)
  latest.current = looks
  useEffect(() => {
    const ctx = canvas.current!.getContext('2d')!
    let raf = 0
    const frame = (now: number) => { paint(ctx, compose(latest.current, now)); raf = requestAnimationFrame(frame) }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf) // no loop left behind when the page closes
  }, [])
  return <canvas ref={canvas} width={32} height={32} />
}

/** Every body × element: found ones drawn with their nickname, the rest as silhouettes (the shape is the hint). */
function CodexPage({ found }: { found: ReadonlySet<string> }) {
  const total = BODY_NAMES.length * ELEMENTS.length
  return (
    <div>
      <p className="nb-text">{t('nb.codex.intro', { n: found.size, total })}</p>
      <div className="nb-codex">
        {BODY_NAMES.flatMap((body) => ELEMENTS.map((element) => {
          const known = found.has(codexKey(body, element))
          return (
            <figure key={`${body}:${element}`} className={known ? '' : 'unknown'} title={known ? `body = "${body}" · element = "${element}"` : t('nb.codex.unknown')}>
              <Still looks={{ ...DEFAULT_LOOKS, body, element }} silhouette={!known} />
              <figcaption>{known ? nickname(body, element) : '???'}</figcaption>
            </figure>
          )
        }))}
      </div>
    </div>
  )
}

/** One still frame: 36 of these would be 36 animation loops. */
function Still({ looks, silhouette }: { looks: Looks; silhouette: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const key = JSON.stringify(looks) // a fresh object each render; repaint only when the parts change
  useEffect(() => { paint(canvas.current!.getContext('2d')!, compose(JSON.parse(key) as Looks, 0), silhouette ? '#2a2e5c' : undefined) }, [key, silhouette])
  return <canvas ref={canvas} width={32} height={32} />
}

function ResearchButton({ cost, crystal, onBuy }: { cost: number; crystal: number | null; onBuy: () => void }) {
  if (crystal === null) return <p className="nb-research-note">{t('nb.researchLater')}</p>
  return (
    <button type="button" className="nb-research" disabled={crystal < cost} onClick={onBuy}>
      {t('nb.research', { cost })}{crystal < cost && <small>{t('nb.needCrystal', { n: cost - crystal })}</small>}
    </button>
  )
}
