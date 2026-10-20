import { useEffect, useRef, useState } from 'react'
import NAMES from '../../content/names.json'
import STARTERS from '../../content/starters.json'
import { compose } from '../render/morph/compose'
import { DEFAULT_LOOKS, type Looks } from '../render/morph/looks'
import type { Element } from '../render/morph/palette'
import { paint } from '../render/morph/paint'
import { t, type Key } from './i18n'

export type StarterChoice = { element: string; name: string; skipTutorial: boolean }

function Specimen({ element, selected }: { element: string; selected: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const sel = useRef(selected)
  sel.current = selected
  useEffect(() => {
    const ctx = canvas.current!.getContext('2d')!
    const looks: Looks = { ...DEFAULT_LOOKS, element: element as Element }
    let raf = 0
    const phase = element.length * 431
    const frame = (now: number) => {
      // The chosen one looks happy; the others keep their normal face.
      paint(ctx, compose(sel.current ? { ...looks, eyes: 'happy' } : looks, now, phase))
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [element])
  return <canvas ref={canvas} width={32} height={32} />
}

export function StarterPick({ onPick }: { onPick: (c: StarterChoice) => void }) {
  const [element, setElement] = useState<string | null>(null)
  const hatchBtn = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (element) hatchBtn.current?.focus() }, [element])

  // No name field: naming it is the player's first line of code (`slime.name = "..."`, quest 1).
  const hatch = (skipTutorial: boolean) => onPick({ element: element ?? STARTERS[0]!.element, name: NAMES[0]!, skipTutorial })

  return (
    <div className="starter" role="dialog" aria-labelledby="starter-title">
      <h1 id="starter-title">{t('starter.title')}</h1>
      <p className="starter-sub">{t('starter.sub')}</p>
      <div className="tanks" role="radiogroup" aria-label={t('starter.title')}>
        {STARTERS.map((s) => (
          <button
            key={s.element}
            type="button"
            role="radio"
            aria-checked={element === s.element}
            className={`tank el-${s.element}${element && element !== s.element ? ' dim' : ''}`}
            onClick={() => setElement(s.element)}
          >
            <Specimen element={s.element} selected={element === s.element} />
            <b>{t(`starter.${s.element}` as Key)}</b>
            <span>{t(`starter.${s.element}.blurb` as Key)}</span>
          </button>
        ))}
      </div>
      <div className={`naming${element ? '' : ' hidden'}`}>
        <button type="button" ref={hatchBtn} className="hatch" disabled={!element} onClick={() => hatch(false)}>{t('starter.hatch')}</button>
      </div>
      <button type="button" className="skip" onClick={() => hatch(true)}>{t('starter.skip')}</button>
    </div>
  )
}
