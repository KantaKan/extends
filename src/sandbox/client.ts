import type { TickEvent } from '../sim/tick'
import type { World } from '../sim/world'
import type { LoadResult, TickInput, TickOutput } from './vm'
import SandboxWorker from './worker?worker'

export type { CodeError, LoadResult, TickOutput } from './vm'

/** Main-thread handle to the sandbox Worker. */
export class SandboxClient {
  private readonly worker = new SandboxWorker()
  private readonly pending = new Map<number, (r: unknown) => void>()
  private nextId = 0

  constructor() {
    this.worker.onmessage = (e: MessageEvent<{ id: number; result: unknown }>) => {
      this.pending.get(e.data.id)?.(e.data.result)
      this.pending.delete(e.data.id)
    }
  }

  private call<T>(op: 'load' | 'tick', arg: unknown): Promise<T> {
    const id = this.nextId++
    return new Promise((resolve) => {
      this.pending.set(id, resolve as (r: unknown) => void)
      this.worker.postMessage({ id, op, arg })
    })
  }

  load = (js: string, w: World) => this.call<LoadResult>('load', { js, world: snapshot(w, []) })
  tick = (w: World, lastEvents: TickEvent[]) => this.call<TickOutput>('tick', snapshot(w, lastEvents))
  dispose = () => this.worker.terminate()
}

function snapshot(w: World, events: TickEvent[]): TickInput {
  return { tick: w.tick, width: w.width, height: w.height, events, seed: w.rng, manaMax: w.manaMax, resources: w.resources, essence: w.essence, creatures: w.creatures }
}
