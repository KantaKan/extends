import { N, type Frame } from './compose'

const GROUND = 'rgba(0,0,0,.38)'

/** Paint a composed frame into a 32×32 canvas context. `flash` paints every pixel one colour (morph flash). */
export function paint(ctx: CanvasRenderingContext2D, f: Frame, flash?: string) {
  ctx.clearRect(0, 0, N, N)
  ctx.fillStyle = GROUND
  for (const i of f.ground) ctx.fillRect(i % N, Math.floor(i / N), 1, 1)
  f.px.forEach((c, i) => { if (c) { ctx.fillStyle = flash ?? c; ctx.fillRect(i % N, Math.floor(i / N), 1, 1) } })
}
