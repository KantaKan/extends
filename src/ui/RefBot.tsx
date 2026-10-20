import { useEffect, useRef, useState } from 'react'
import { t } from './i18n'
import type { RefLine } from './RefConsole'
import { RefConsole } from './RefConsole'

// Ref: a little floating lab robot. Pixel pattern in the same style as reference/morph-lab.html.
const BOT = [
  '......aa......',
  '.......a......',
  '...########...',
  '..#bbbbbbbb#..',
  '.#bssssssssb#.',
  '.#bsessssesb#.',
  '.#bsessssesb#.',
  '.#bsssmmsssb#.',
  '.#bssssssssb#.',
  '..#bbbbbbbb#..',
  '...########...',
  '....#.##.#....',
]
const BOT_BLINK = BOT.map((r, i) => (i === 5 ? r.replace(/e/g, 's') : r))
const COLORS: Record<string, string> = { '#': '#2a2e5c', b: '#dfe3f5', s: '#1d1f34', e: '#8fd8ff', m: '#ff86a3', a: '#ff86a3' }
const SCALE = 5

function drawBot(ctx: CanvasRenderingContext2D, rows: string[]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = COLORS[ch]
    if (c) { ctx.fillStyle = c; ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE) }
  }))
}

type Props = {
  /** Tutorial instruction, shown big and kept until the step is done. */
  instruction: string | null
  lines: RefLine[]
  /** Wipe the lab and start over (asks twice). */
  onReset: () => void
}

export function RefBot({ instruction, lines, onReset }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [sure, setSure] = useState(false) // two clicks, no browser dialog

  useEffect(() => {
    const ctx = canvas.current!.getContext('2d')!
    let raf = 0
    const frame = (now: number) => {
      drawBot(ctx, now % 3200 < 140 ? BOT_BLINK : BOT)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const recent = lines.slice(-3)
  return (
    <div className="refbot">
      {logOpen && (
        <div className="reflog" role="dialog" aria-label={t('log.title')}>
          <h2>{t('log.title')}</h2>
          <RefConsole lines={lines} />
          <button type="button" className={`reset${sure ? ' sure' : ''}`} onClick={() => (sure ? onReset() : setSure(true))} onBlur={() => setSure(false)}>
            {sure ? t('log.resetConfirm') : t('log.reset')}
          </button>
        </div>
      )}
      <div className="bubble" aria-live="polite">
        {instruction ? <p className="instruction">{instruction}</p> : recent.map((l) => <p key={l.id} className={l.kind}>{l.text}</p>)}
      </div>
      <button type="button" className="bot" onClick={() => setLogOpen((o) => !o)} aria-expanded={logOpen} title={t('log.open')}>
        <canvas ref={canvas} width={BOT[0]!.length * SCALE} height={BOT.length * SCALE} />
      </button>
    </div>
  )
}
