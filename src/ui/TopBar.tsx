import { t } from './i18n'

export const SPEEDS = [0, 1, 4, 16] as const
export type Speed = (typeof SPEEDS)[number]

type Props = {
  essence: number
  /** null until the orders board exists (nothing to earn or spend it on before that). */
  crystal: number | null
  mana: number
  manaMax: number
  /** The last tick ran out of Mana: the chip flashes. Changes value each time so the flash replays. */
  manaOut: number
  speed: Speed
  /** Fastest speed the generator allows (src/sim/upgrades.ts); faster buttons show a lock. */
  maxSpeed: number
  onSpeed: (s: Speed) => void
}

export function TopBar({ essence, crystal, mana, manaMax, manaOut, speed, maxSpeed, onSpeed }: Props) {
  return (
    <header className="topbar">
      <span className="logo">Extends</span>
      <span className="tip" tabIndex={0} data-tip={t('tip.essence')}>
        <span className="res res-essence"><i aria-hidden="true">✦</i><b>{essence}</b> {t('res.essence')}</span>
      </span>
      {crystal !== null && (
        <span className="tip" tabIndex={0} data-tip={t('tip.crystal')}>
          <span className="res res-crystal"><i aria-hidden="true">◆</i><b>{crystal}</b> {t('res.crystal')}</span>
        </span>
      )}
      <span key={manaOut} className={`tip${manaOut ? ' flash' : ''}`} tabIndex={0} data-tip={t('tip.mana', { max: manaMax })}>
        <span className="res res-mana"><i aria-hidden="true">⚡</i><b>{mana}/{manaMax}</b> {t('res.mana')}</span>
      </span>
      <div className="speeds" role="group">
        {SPEEDS.map((s) => s > maxSpeed ? (
          <span key={s} title={t('tip.speedLocked')}>
            <button type="button" disabled aria-label={t('tip.speedLocked')}>🔒{s}x</button>
          </span>
        ) : (
          <button key={s} type="button" aria-pressed={s === speed} onClick={() => onSpeed(s)}>
            {s === 0 ? t('time.pause') : `${s}x`}
          </button>
        ))}
      </div>
    </header>
  )
}
