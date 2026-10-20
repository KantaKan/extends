import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js'
import { compose, FRAME_MS, N } from './morph/compose'
import type { Looks, Species } from './morph/looks'
import { paint } from './morph/paint'
import type { Mood } from './mood'

const FEET_ROW = 29 // compose() puts the feet on this row
const MORPH_MS = 600
const FLASH = '#ffffff'
const LABEL_RES = 8 // text is drawn inside a 3× pixel world; render it sharp

/** Confused = its code threw; dizzy = its code looped until stopped. */
export type Status = 'confused' | 'dizzy'

/** One creature on screen: a 32×32 canvas texture redrawn from compose(), plus name and status. */
export class CreatureView {
  readonly root = new Container()
  private readonly sprite: Sprite
  private readonly label: Text
  private readonly mark: Text
  private readonly ctx: CanvasRenderingContext2D
  private readonly texture: Texture
  private lastDraw = -Infinity
  private species: Species | null = null
  private morphAt = -Infinity
  private status: Status | null = null
  private mood: Mood = { hungry: false, tired: false }
  private readonly want = wantBubble() // hungry: thinks of Essence
  private readonly zz: Text // worn out

  constructor(private readonly phase: number) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = N
    this.ctx = canvas.getContext('2d')!
    this.texture = Texture.from(canvas)
    this.sprite = new Sprite(this.texture)
    this.sprite.anchor.set(0.5, (FEET_ROW + 0.5) / N)
    this.label = new Text({ text: '', resolution: LABEL_RES, style: { fontFamily: 'Pixelify Sans', fontSize: 7, fill: 0xecedfb, stroke: { color: 0x13142a, width: 2 } } })
    this.label.anchor.set(0.5, 0)
    this.label.position.set(0, 2)
    this.mark = new Text({ text: '?', resolution: LABEL_RES, style: { fontFamily: 'Pixelify Sans', fontSize: 11, fontWeight: '700', fill: 0xffe066, stroke: { color: 0x13142a, width: 2 } } })
    this.mark.anchor.set(0.5, 1)
    this.mark.position.set(0, -FEET_ROW)
    this.mark.visible = false
    this.zz = new Text({ text: 'z', resolution: LABEL_RES, style: { fontFamily: 'Pixelify Sans', fontSize: 8, fontWeight: '700', fill: 0xb4b6d6, stroke: { color: 0x13142a, width: 2 } } })
    this.zz.visible = false
    this.want.visible = false
    this.root.addChild(this.sprite, this.label, this.want, this.zz, this.mark)
  }

  setName(name: string) {
    if (this.label.text !== name) this.label.text = name
  }

  setSpecies(sp: Species, now: number) {
    if (sp === this.species) return
    if (this.species && !sameLooks(this.species.looks, sp.looks)) this.morphAt = now // the morph moment
    this.species = sp
    this.lastDraw = -Infinity
  }

  /** Squash-and-stretch pop, e.g. right after hatching. */
  pop(now: number) {
    this.morphAt = now
  }

  setMood(m: Mood) {
    if (m.hungry === this.mood.hungry && m.tired === this.mood.tired) return
    this.mood = m
    this.want.visible = m.hungry && !this.status
    this.zz.visible = m.tired && !this.status
    this.lastDraw = -Infinity // sleepy eyes now
  }

  setStatus(s: Status | null) {
    this.status = s
    this.mark.visible = s !== null
    // A "?" (code problem) is the more important sign; hunger/sleep wait until it's gone.
    this.want.visible = this.mood.hungry && !s
    this.zz.visible = this.mood.tired && !s
  }

  draw(t: number) {
    const morphing = t - this.morphAt < MORPH_MS
    const k = morphing ? (t - this.morphAt) / MORPH_MS : 1
    // Squash-and-stretch pop while morphing; a wobble when dizzy.
    this.sprite.scale.set(morphing ? 1 + 0.25 * Math.sin(k * Math.PI) * (1 - k) * 2 : 1, morphing ? 1 - 0.15 * Math.sin(k * Math.PI * 2) * (1 - k) : 1)
    this.sprite.rotation = this.status === 'dizzy' ? Math.sin(t / 60) * 0.25 : 0
    this.mark.position.y = -FEET_ROW - 2 + Math.round(Math.sin(t / 200) * 1.5)
    this.want.position.set(9, -FEET_ROW + 2 + Math.round(Math.sin(t / 260) * 1.5))
    const zt = (t / 900) % 1
    this.zz.position.set(8 + Math.round(zt * 4), -FEET_ROW + 8 - Math.round(zt * 8))
    this.zz.alpha = 1 - zt

    if (!this.species || (!morphing && t - this.lastDraw < FRAME_MS)) return
    this.lastDraw = t
    const looks = this.mood.tired ? { ...this.species.looks, eyes: 'sleepy' as const } : this.species.looks
    const f = compose(looks, t, this.phase, this.species.glow)
    const flash = morphing && k < 0.5 && Math.floor(t / 70) % 2 === 0
    paint(this.ctx, f, flash ? FLASH : undefined)
    this.texture.source.update()
  }

  destroy() {
    this.root.destroy({ children: true })
    this.texture.destroy(true)
  }
}

const sameLooks = (a: Looks, b: Looks) => a.body === b.body && a.element === b.element && a.eyes === b.eyes && a.horns === b.horns

/** A little thought bubble with an Essence in it, drawn in world pixels. */
function wantBubble() {
  const g = new Graphics()
  g.rect(-5, -6, 11, 9).rect(-4, -7, 9, 11).fill(0xecedfb) // bubble
  g.rect(-6, 4, 2, 2).rect(-8, 6, 1, 1).fill(0xecedfb) // tail dots
  g.rect(-1, -5, 3, 7).rect(-2, -3, 5, 3).fill(0xffe066) // Essence
  return g
}
