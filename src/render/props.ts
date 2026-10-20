import { Container, Graphics } from 'pixi.js'
import { machineStats, maxLevel, type Machine } from '../sim/upgrades'
import type { World } from '../sim/world'

// The lab's machines, drawn in world pixels (1 tile = 32). Positions come from content/lab.json
// via the world's layout. Wall machines sit on the back wall, above the walkable floor (y < 0).

const T = 32
const C = {
  metal: 0x4b5194, metalDark: 0x2a2e5c, metalLight: 0x6b72c4, glass: 0x8fd8ff, glassDim: 0x3a5a7a,
  egg: 0xfff3dc, eggShade: 0xe8d2b0, glow: 0xffe9a8, dead: 0x3a3c5a, pink: 0xff86a3, ink: 0x13142a, well: 0x1d2046,
}
const MAX_EGGS = 3

export class LabProps {
  readonly back = new Container() // wall machines
  readonly floor = new Graphics() // the well decal, under everything
  /** Clicked the DNA terminal. */
  onTerminal: () => void = () => {}
  /** Clicked an upgradable machine (only once the lab has power). */
  onMachine: (m: Machine) => void = () => {}
  private readonly hatchery = new Graphics()
  private readonly eggs = new Graphics()
  private readonly generator = new Graphics()
  private readonly terminal = new Graphics()
  private readonly board = new Graphics()
  private readonly pips = new Graphics() // level lights under each upgradable machine
  private drawnLevels = ''

  constructor(private readonly sim: World) {
    this.terminal.eventMode = 'static'
    this.terminal.cursor = 'pointer'
    this.terminal.on('pointertap', (e) => { e.stopPropagation(); this.onTerminal() })
    const machines: [Graphics, Machine][] = [[this.hatchery, 'hatchery'], [this.generator, 'generator'], [this.floor, 'well']]
    for (const [g, m] of machines) g.on('pointertap', (e) => { e.stopPropagation(); this.onMachine(m) })
    this.back.addChild(this.hatchery, this.eggs, this.generator, this.terminal, this.board, this.pips)
    this.drawHatchery()
  }

  /** Per frame: eggs waiting in the hatchery, generator spinning once powered, terminal blinking. */
  update(t: number, lit: boolean, beckon: boolean) {
    this.drawEggs(t)
    this.drawGenerator(t, lit)
    this.drawTerminal(t, beckon)
    this.drawBoard(lit)
    this.drawLevels(lit)
  }

  private wallX = (x: number) => Math.round(x * T)

  private drawHatchery() {
    const x = this.wallX(this.sim.layout.hatchery.x), g = this.hatchery
    g.clear()
    g.rect(x - 14, -30, 28, 26).fill(C.metalDark) // body
    g.rect(x - 12, -28, 24, 16).fill(C.glassDim) // glass
    g.rect(x - 12, -28, 3, 16).fill(C.glass) // glint
    g.rect(x - 16, -6, 32, 6).fill(C.metal) // base
    g.rect(x - 4, -2, 8, 2).fill(C.pink) // hatch light
  }

  private drawEggs(t: number) {
    const n = Math.min(MAX_EGGS, this.sim.pending.length)
    const x = this.wallX(this.sim.layout.hatchery.x), g = this.eggs
    g.clear()
    for (let i = 0; i < n; i++) {
      const ex = x - 7 + i * 7, wob = Math.round(Math.sin(t / 120 + i * 2) * 1)
      g.rect(ex - 2 + wob, -22, 5, 8).rect(ex - 3 + wob, -20, 7, 5).fill(C.egg)
      g.rect(ex + 2 + wob, -19, 1, 4).fill(C.eggShade)
    }
  }

  private drawGenerator(t: number, lit: boolean) {
    const x = this.wallX(this.sim.layout.generator.x), g = this.generator
    g.clear()
    g.rect(x - 14, -30, 28, 28).fill(lit ? C.metal : C.dead)
    g.rect(x - 10, -26, 20, 20).fill(C.ink)
    const blade = lit ? C.glow : C.metalDark
    const k = lit ? Math.floor(t / 90) % 2 : 0 // two-frame spin
    if (k === 0) g.rect(x - 8, -17, 16, 2).rect(x - 1, -24, 2, 16).fill(blade)
    else g.rect(x - 6, -22, 3, 3).rect(x + 3, -13, 3, 3).rect(x + 3, -22, 3, 3).rect(x - 6, -13, 3, 3).rect(x - 2, -18, 4, 4).fill(blade)
    g.rect(x - 14, -4, 28, 2).fill(lit ? C.glow : C.metalDark) // power strip
  }

  private drawTerminal(t: number, beckon: boolean) {
    const x = this.wallX(this.sim.layout.terminal.x), g = this.terminal
    const on = !beckon || Math.floor(t / 400) % 2 === 0
    g.clear()
    g.rect(x - 15, -31, 30, 24).fill(C.metalDark)
    g.rect(x - 12, -28, 24, 17).fill(on ? 0x0f101f : 0x1d1f34)
    for (let i = 0; i < 4; i++) { // a tiny helix on the screen
      g.rect(x - 7 + i * 4, -24 + (i % 2) * 6, 2, 2).fill(C.pink)
      g.rect(x - 7 + i * 4, -18 - (i % 2) * 6, 2, 2).fill(C.glass)
    }
    g.rect(x - 6, -7, 12, 4).fill(C.metal) // stand
    if (beckon && on) g.rect(x - 15, -33, 30, 2).fill(C.glow) // "click me"
  }

  /** The orders board: dark until the generator powers it. */
  private drawBoard(lit: boolean) {
    const x = this.wallX(this.sim.layout.board.x), g = this.board
    g.clear()
    g.visible = lit
    if (!lit) return
    g.rect(x - 13, -30, 26, 22).fill(0x6b4f2a) // cork frame
    g.rect(x - 11, -28, 22, 18).fill(0xc9a46a)
    g.rect(x - 9, -26, 8, 7).rect(x + 1, -24, 8, 8).fill(0xfff3dc) // notes
    g.rect(x - 6, -27, 2, 2).fill(C.pink).rect(x + 4, -25, 2, 2).fill(C.glass) // pins
  }

  /** Upgrades: machines turn clickable with power, show a light per level, and the well widens. */
  private drawLevels(lit: boolean) {
    const key = `${lit}:${this.sim.levels.well}:${this.sim.levels.generator}:${this.sim.levels.hatchery}`
    if (key === this.drawnLevels) return
    this.drawnLevels = key
    for (const g of [this.hatchery, this.generator, this.floor]) {
      g.eventMode = lit ? 'static' : 'auto'
      g.cursor = lit ? 'pointer' : 'default'
    }
    const g = this.pips
    g.clear()
    if (lit) for (const m of ['hatchery', 'generator'] as const) {
      const x = this.wallX(this.sim.layout[m].x), n = maxLevel(m) + 1
      for (let i = 0; i < n; i++) g.rect(x - n * 3 + i * 6 + 1, 1, 4, 3).fill(i <= this.sim.levels[m] ? C.glow : C.metalDark)
    }
    this.drawWell()
  }

  private drawWell() {
    const { x, y } = this.sim.layout.well, g = this.floor
    const cx = Math.round(x * T), cy = Math.round(y * T), grow = Math.round(machineStats(this.sim.levels).extraRadius * 6)
    g.clear()
    g.circle(cx, cy, 20 + grow).fill(C.well)
    g.circle(cx, cy, 13 + grow).fill(0x262a5c)
    g.circle(cx, cy, 5 + grow / 2).fill({ color: C.glow, alpha: 0.35 + this.sim.levels.well * 0.15 })
  }
}
