import type { RefObject } from 'react'
import type { Lab } from '../render/lab'
import { machineStats, maxLevel, upgradeCost, type Levels, type Machine } from '../sim/upgrades'
import type { World } from '../sim/world'
import { t, type Key } from './i18n'

type Props = { world: World; machine: Machine; lab: RefObject<Lab | null>; onUpgrade: (m: Machine) => void; onClose: () => void }

/** What a machine does, in words, at some levels. */
const effect = (m: Machine, levels: Levels) => {
  const s = machineStats(levels)
  return t(`up.${m}.effect` as Key, { sec: s.respawnTicks / 10, max: s.essenceMax, gold: Math.round(s.goldenChance * 100), mana: s.mana, speed: s.maxSpeed, cost: s.hatchCost })
}

/** Clicked machine: its level, what it does now, what the next level does, and the upgrade button. */
export function MachineCard({ world, machine, lab, onUpgrade, onClose }: Props) {
  const p = lab.current?.machinePos(machine, world)
  if (!p) return null
  const lv = world.levels[machine], cost = upgradeCost(world.levels, machine)
  const short = cost !== null && world.resources.essence < cost
  return (
    <div className="machine" style={{ transform: `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)` }} role="dialog" aria-label={t(`up.${machine}.name` as Key)}>
      <div className="machine-head">
        <b>{t(`up.${machine}.name` as Key)}</b>
        <span>{t('up.level', { n: lv + 1, max: maxLevel(machine) + 1 })}</span>
        <button type="button" className="machine-x" aria-label={t('up.close')} onClick={onClose}>×</button>
      </div>
      <p>{effect(machine, world.levels)}</p>
      {cost === null ? <p className="machine-max">{t('up.max')}</p> : (
        <>
          <p className="machine-next">{t('up.next', { what: effect(machine, { ...world.levels, [machine]: lv + 1 }) })}</p>
          <button type="button" className="machine-buy" disabled={short} onClick={() => onUpgrade(machine)}>
            {t('up.buy', { cost })}{short && <small>{t('up.short', { n: cost - world.resources.essence })}</small>}
          </button>
        </>
      )}
    </div>
  )
}
