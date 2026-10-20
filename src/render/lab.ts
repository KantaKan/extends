import { Application, Container, Graphics, TextureStyle } from 'pixi.js'
import type { World } from '../sim/world'
import { CreatureView, type Status } from './creatureView'
import { DEFAULT_LOOKS, type Species } from './morph/looks'
import { moodOf } from './mood'
import { LabProps } from './props'
import type { Machine } from '../sim/upgrades'

TextureStyle.defaultOptions.scaleMode = 'nearest'

export const TILE = 32

const FLOOR_LIT = [0x2a2e5c, 0x30356a]
const FLOOR_DARK = [0x16172c, 0x191a31] // power is out until the first quest
const WALL_LIT = [0x3a3f78, 0x4b5194] // back wall + its trim
const WALL_DARK = [0x1b1c35, 0x22243f]
const WALL_ROWS = 1 // tiles of back wall above the floor (decor, outside sim space)
const HUD_TOP = 64 // CSS px kept clear for the HUD
const DRAWER_BOTTOM = 56 // CSS px kept clear for the closed DNA drawer handle
const WALL = 0x1c1e37
const ESSENCE = 0xffe066
const ESSENCE_GLOW = 0xfff7c2
const GOLDEN = 0xffa62b
const GOLDEN_FADE_TICKS = 30 // blinks in its last 3 s
const SMOOTH = 0.25 // per-frame easing towards the 10 Hz sim position
const PAN_EASE = 0.12 // per-frame easing of the camera pan

const UNKNOWN: Species = { looks: DEFAULT_LOOKS, glow: new Set(), invalid: [], locked: [] }

/** The lab view: one room drawn in world pixels, scaled by whole numbers to fit its host. */
export class Lab {
  /** Called with a creature id when one is clicked, or null for empty floor. */
  onPick: (id: number | null) => void = () => {}
  /** Called when the DNA terminal on the wall is clicked. */
  onTerminal: () => void = () => {}
  /** Called when an upgradable machine is clicked (once the lab has power). */
  onMachine: (m: Machine) => void = () => {}
  readonly app = new Application()
  private readonly world = new Container({ sortableChildren: true })
  private readonly essence = new Graphics()
  private readonly views = new Map<number, CreatureView>()
  private species = new Map<string, Species>()
  private status = new Map<number, Status>()
  private readonly floor = new Graphics()
  private lit = false
  private baseY = 0 // room position with nothing covering it
  private panY = 0 // current upward pan, eased
  private coverBottom = 0 // CSS px of the window covered from below (the open DNA machine)
  private focusId: number | null = null
  private props: LabProps | null = null
  private beckon = false
  private frames = 0 // creatures appearing after the first frame hatched: give them a pop

  async mount(host: HTMLElement, sim: World) {
    await this.app.init({ resizeTo: host, background: WALL, antialias: false, autoDensity: true, resolution: devicePixelRatio })
    host.appendChild(this.app.canvas)
    this.essence.zIndex = -1
    this.floor.zIndex = -2
    drawRoom(this.floor, sim.width, sim.height, this.lit)
    this.props = new LabProps(sim)
    this.props.onTerminal = () => this.onTerminal()
    this.props.onMachine = (m) => this.onMachine(m)
    this.props.floor.zIndex = -1.5
    this.props.back.zIndex = -1.2
    this.world.addChild(this.floor, this.props.floor, this.props.back, this.essence)
    this.app.stage.addChild(this.world)
    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen
    this.app.stage.on('pointertap', () => this.onPick(null))
    this.app.renderer.on('resize', () => this.fit(sim))
    this.app.ticker.add(() => this.draw(sim))
    this.fit(sim)
  }

  setSpecies(species: Map<string, Species>) {
    this.species = species
  }

  setStatus(status: Map<number, Status>) {
    this.status = status
  }

  /** Part of the window covered from below; the room pans up to keep `focusId` in sight, at the same pixel scale. */
  setCover(bottomPx: number, focusId: number | null) {
    this.coverBottom = bottomPx
    this.focusId = focusId
  }

  /** The wall terminal blinks to say "your code goes here". */
  setBeckon(on: boolean) {
    this.beckon = on
  }

  setLit(lit: boolean, sim: World) {
    if (lit === this.lit) return
    this.lit = lit
    drawRoom(this.floor, sim.width, sim.height, lit)
  }

  private draw(sim: World) {
    const t = performance.now()
    const g = this.essence.clear()
    for (const e of sim.essence) {
      const x = Math.round(e.x * TILE), y = Math.round(e.y * TILE)
      if (e.golden) {
        if (e.until !== undefined && e.until - sim.tick < GOLDEN_FADE_TICKS && Math.floor(t / 150) % 2) continue
        const s = Math.floor(t / 250) % 2 // twinkle
        g.rect(x - 3, y - 6, 6, 12).rect(x - 6, y - 3, 12, 6).fill(GOLDEN)
        g.rect(x - 2, y - 4, 4, 8).rect(x - 4, y - 2, 8, 4).fill(ESSENCE)
        g.rect(x - 1 + s, y - 2, 2, 2).fill(ESSENCE_GLOW)
        continue
      }
      g.rect(x - 2, y - 4, 4, 8).rect(x - 4, y - 2, 8, 4).fill(ESSENCE)
      g.rect(x - 1, y - 2, 2, 2).fill(ESSENCE_GLOW)
    }

    const alive = new Set<number>()
    for (const c of sim.creatures) {
      alive.add(c.id)
      let v = this.views.get(c.id)
      if (!v) {
        v = new CreatureView(c.id * 977)
        v.root.position.set(c.x * TILE, c.y * TILE)
        v.root.eventMode = 'static'
        v.root.cursor = 'pointer'
        const id = c.id
        v.root.on('pointertap', (e) => { e.stopPropagation(); this.onPick(id) })
        this.views.set(c.id, v)
        this.world.addChild(v.root)
        if (this.frames > 0) v.pop(t) // hatched just now
      }
      const s = v.root.position
      s.set(s.x + (c.x * TILE - s.x) * SMOOTH, s.y + (c.y * TILE - s.y) * SMOOTH)
      v.root.zIndex = s.y
      v.setName(c.name)
      v.setSpecies(this.species.get(c.className) ?? UNKNOWN, t)
      v.setStatus(this.status.get(c.id) ?? null)
      v.setMood(moodOf(c))
      v.draw(t)
    }
    for (const [id, v] of this.views) if (!alive.has(id)) { v.destroy(); this.views.delete(id) }
    this.props?.update(t, this.lit, this.beckon)
    this.frames++
    this.pan(sim)
  }

  private pan(sim: World) {
    let target = 0
    const focus = this.focusId === null ? undefined : this.views.get(this.focusId)
    if (this.coverBottom > 0 && focus) {
      const scale = this.world.scale.y
      const visibleBottom = this.app.screen.height - this.coverBottom
      const headY = this.baseY + (focus.root.position.y - TILE / 2) * scale
      const roomBottom = this.baseY + sim.height * TILE * scale
      // Centre the creature in what's still visible, but never lift the floor's bottom edge above it.
      target = Math.min(0, Math.max(visibleBottom - roomBottom, (HUD_TOP + visibleBottom) / 2 - headY))
    }
    this.panY += (target - this.panY) * PAN_EASE
    if (Math.abs(target - this.panY) < 0.5) this.panY = target
    this.world.position.y = Math.round(this.baseY + this.panY)
  }

  /** Where a creature's head is on screen (CSS px, relative to the canvas), for cards and arrows. */
  screenPos(id: number): { x: number; y: number } | null {
    const v = this.views.get(id)
    if (!v) return null
    const p = this.world.toGlobal({ x: v.root.position.x, y: v.root.position.y - TILE })
    return { x: p.x, y: p.y }
  }

  /** Where a machine is on screen (CSS px): just below it, for its upgrade card. */
  machinePos(m: Machine, sim: World): { x: number; y: number } {
    const { x, y } = m === 'well' ? { x: sim.layout.well.x, y: sim.layout.well.y + 0.8 } : { x: sim.layout[m].x, y: 0.2 }
    return this.world.toGlobal({ x: x * TILE, y: y * TILE })
  }

  private fit(sim: World) {
    const { width, height } = this.app.screen
    const w = sim.width * TILE, h = (sim.height + WALL_ROWS) * TILE
    const usable = height - HUD_TOP - DRAWER_BOTTOM
    const scale = Math.max(1, Math.floor(Math.min(width / w, usable / h)))
    this.world.scale.set(scale)
    this.baseY = HUD_TOP + Math.floor((usable - h * scale) / 2) + WALL_ROWS * TILE * scale
    this.world.position.set(Math.floor((width - w * scale) / 2), this.baseY + this.panY)
  }

  destroy() {
    for (const v of this.views.values()) v.destroy()
    this.app.destroy({ removeView: true }, { children: true })
  }
}

function drawRoom(g: Graphics, cols: number, rows: number, lit: boolean) {
  const [a, b] = lit ? FLOOR_LIT : FLOOR_DARK
  const [wall, trim] = lit ? WALL_LIT : WALL_DARK
  g.clear()
  g.rect(0, -WALL_ROWS * TILE, cols * TILE, WALL_ROWS * TILE).fill(wall!)
  g.rect(0, -3, cols * TILE, 3).fill(trim!)
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      g.rect(x * TILE, y * TILE, TILE, TILE).fill((x + y) % 2 ? a! : b!)
}
