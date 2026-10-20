import UPGRADES from '../../content/upgrades.json'
import type { World } from './world'

// Machine upgrades: Essence buys levels (content/upgrades.json). Level 0 is what every lab starts with.

export const MACHINES = ['well', 'generator', 'hatchery'] as const
export type Machine = (typeof MACHINES)[number]
export type Levels = Record<Machine, number>

export const START_LEVELS: Levels = { well: 0, generator: 0, hatchery: 0 }
export const maxLevel = (m: Machine) => UPGRADES[m].length - 1

/**
 * Ticks between new Essence: the well's level, sped up by the herd working it (more creatures, more
 * Essence, up to `herd.cap`). Without this one slime harvests everything and a herd only costs food.
 */
export function respawnInterval(levels: Levels, creatures: number): number {
  const { bonusPerCreature, cap } = UPGRADES.herd
  const helpers = Math.max(0, Math.min(creatures, cap) - 1)
  return Math.max(1, Math.round(machineStats(levels).respawnTicks / (1 + bonusPerCreature * helpers)))
}

/** What the lab's machines do at these levels. */
export function machineStats(levels: Levels) {
  const row = <T>(rows: T[], i: number) => rows[Math.min(i, rows.length - 1)]!
  const w = row(UPGRADES.well, levels.well), g = row(UPGRADES.generator, levels.generator), h = row(UPGRADES.hatchery, levels.hatchery)
  return { respawnTicks: w.respawnTicks, essenceMax: w.essenceMax, extraRadius: w.extraRadius, goldenChance: w.goldenChance, mana: g.mana, maxSpeed: g.maxSpeed, hatchCost: h.hatchCost }
}
export type MachineStats = ReturnType<typeof machineStats>
export const BASE = machineStats(START_LEVELS)

/** Essence price of the next level, or null at max. */
export const upgradeCost = (levels: Levels, m: Machine): number | null => UPGRADES[m][levels[m] + 1]?.cost ?? null

/** Spend Essence on the next level. Returns false (and changes nothing) at max level or when it's unaffordable. */
export function upgrade(w: World, m: Machine): boolean {
  const cost = upgradeCost(w.levels, m)
  if (cost === null || w.resources.essence < cost) return false
  w.resources.essence -= cost
  w.levels[m]++
  w.manaMax = machineStats(w.levels).mana
  return true
}
