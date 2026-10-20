import { useCallback, useRef, type RefObject } from 'react'
import type { Lab } from '../render/lab'
import type { Species } from '../render/morph/looks'
import { STAT_MAX } from '../sim/creature'
import type { World } from '../sim/world'
import { useFollow } from './follow'
import { t, type Key } from './i18n'

type Props = { world: World; id: number; species: Map<string, Species>; lab: RefObject<Lab | null> }

const STATS = ['hp', 'energy', 'hunger'] as const

/** Live stats of the clicked creature, floating next to it. */
export function CreatureCard({ world, id, species, lab }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const bars = useRef<Record<string, HTMLElement | null>>({})
  const c = world.creatures.find((k) => k.id === id)

  const update = useCallback(() => {
    const now = world.creatures.find((k) => k.id === id)
    if (!now) return
    for (const s of STATS) {
      const b = bars.current[s]
      if (b) b.style.transform = `scaleX(${(now[s] / STAT_MAX).toFixed(3)})`
    }
  }, [world, id])
  useFollow(el, lab, id, update)

  if (!c) return null
  const element = species.get(c.className)?.looks.element ?? 'none'
  return (
    <div className="card" ref={el}>
      <div className="card-head">
        <b>{c.name}</b>
        <span>{c.className} · {t(`element.${element}` as Key)}</span>
      </div>
      {STATS.map((s) => (
        <div key={s} className={`stat stat-${s}`}>
          <span>{t(`card.${s}` as Key)}</span>
          <i><em ref={(n) => { bars.current[s] = n }} /></i>
        </div>
      ))}
    </div>
  )
}
