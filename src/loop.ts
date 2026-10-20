import { MAX_TICKS_PER_FRAME, TICK_MS, ticksDue } from './sim/clock'
import { step, type TickEvent } from './sim/tick'
import type { World } from './sim/world'

/** Produces this tick's commands (the sandbox round trip, so it may be async). Gets the previous tick's events. */
export type Brain = (w: World, lastEvents: TickEvent[]) => Promise<unknown[]> | unknown[]

type Options = {
  speed: () => number
  brain: Brain
  onTicks: (events: TickEvent[]) => void
}

/** Drive the sim at a fixed 10 ticks/s from requestAnimationFrame. Returns stop(). */
export function startLoop(world: World, { speed, brain, onTicks }: Options): () => void {
  let acc = 0
  let last = performance.now()
  let busy = false
  let stopped = false
  let lastEvents: TickEvent[] = []

  async function run(n: number) {
    const events: TickEvent[] = []
    for (let i = 0; i < n && !stopped; i++) {
      const commands = await brain(world, lastEvents)
      if (stopped) return
      lastEvents = step(world, commands)
      events.push(...lastEvents)
    }
    onTicks(events)
  }

  let raf = requestAnimationFrame(function frame(now) {
    const dt = now - last
    last = now
    if (busy) acc = Math.min(acc + dt * speed(), MAX_TICKS_PER_FRAME * TICK_MS) // sandbox still thinking
    else {
      const due = ticksDue(acc, dt, speed())
      acc = due.accMs
      if (due.ticks) { busy = true; void run(due.ticks).finally(() => { busy = false }) }
    }
    raf = requestAnimationFrame(frame)
  })
  return () => { stopped = true; cancelAnimationFrame(raf) }
}
