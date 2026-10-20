import { shouldInterruptAfterDeadline, type QuickJSAsyncContext, type QuickJSAsyncRuntime, type QuickJSAsyncWASMModule, type QuickJSHandle } from 'quickjs-emscripten-core'
import type { Creature } from '../sim/creature'
import PRELUDE from './script-prelude.js?raw'
import { loadQuickJS, toError, type CodeError, type LoadResult, type TickInput, type TickOutput } from './vm'

export const SCRIPT_MS = 20 // how long the program may run between two actions, per tick
const MEMORY_LIMIT = 32 * 1024 * 1024
const STACK_LIMIT = 256 * 1024
const MAX_STEPS_PER_TICK = 50 // actions that finish instantly, chained in one tick
const ARRIVED = 1e-6

type Request = { type: 'gather'; target: number } | { type: 'move'; x: number; y: number } | { type: 'eat' }
type Pending = { req: Request; issued: boolean; resolve: (v: object) => void }
type Verdict = { done: false } | { done: true; result: boolean }

/**
 * Script mode: the player's file is a program that drives the starter `slime`. Each action call
 * pauses the program (QuickJS asyncify) until the simulation shows it finished.
 */
export class ScriptRunner {
  private pending: Pending | null = null
  private finished = false
  private finishReported = false
  private startedActing = false
  private wake: (() => void) | null = null
  private outbox: unknown[] = []
  private logs: TickOutput['logs'] = []
  private errors: CodeError[] = []
  private done: Promise<void> = Promise.resolve()

  private constructor(
    private readonly qjs: QuickJSAsyncWASMModule,
    private readonly rt: QuickJSAsyncRuntime,
    private readonly ctx: QuickJSAsyncContext,
    private readonly slimeId: number,
  ) {}

  /** Start a program. If it fails before its first action (typo on line 1…), the load fails. */
  static async start(js: string, input: TickInput): Promise<{ runner: ScriptRunner | null; result: LoadResult }> {
    const slime = input.creatures[0]
    const qjs = await loadQuickJS()
    const rt = qjs.newRuntime()
    rt.setMemoryLimit(MEMORY_LIMIT)
    rt.setMaxStackSize(STACK_LIMIT)
    const ctx = rt.newContext()
    const r = new ScriptRunner(qjs, rt, ctx, slime?.id ?? -1)
    r.install(input)

    const pre = ctx.evalCode(PRELUDE, 'prelude.js')
    if (pre.error) { pre.error.dispose(); r.destroy(); return { runner: null, result: { ok: false, error: { id: null, kind: 'error', message: 'prelude failed' } } } }
    pre.value.dispose()

    r.deadline()
    r.done = ctx.evalCodeAsync(js, 'lab.js').then((res) => {
      if (res.error) {
        const e = toError(ctx, res.error, r.startedActing ? r.slimeId : null)
        if (e.message !== 'Stop: stopped') r.errors.push(e)
      } else res.value.dispose()
      r.finished = true
      r.wake?.()
    })
    await r.settle()
    if (!r.startedActing && r.errors.length) {
      const error = r.errors[0]!
      await r.dispose()
      return { runner: null, result: { ok: false, error } }
    }
    return { runner: r, result: { ok: true, mode: 'script', classes: [], species: {}, roster: [] } }
  }

  async tick(input: TickInput): Promise<TickOutput> {
    let events = input.events
    for (let i = 0; i < MAX_STEPS_PER_TICK && this.pending; i++) {
      const v = this.judge(this.pending, input, events)
      if (!v.done) break
      const p = this.pending
      this.pending = null
      this.deadline()
      p.resolve({ result: v.result, world: this.view(input) })
      await this.settle()
      events = [] // a new action starts fresh: last tick's events were about the old one
    }

    const commands = this.outbox
    this.outbox = []
    if (this.pending) { commands.push(this.command(this.pending.req)); this.pending.issued = true }
    const out: TickOutput = { commands, logs: this.logs, errors: this.errors }
    this.logs = []
    this.errors = []
    // "Done every line" only means something once the program actually did something.
    if (this.finished && !this.finishReported && this.startedActing) { out.finished = true; this.finishReported = true }
    return out
  }

  /** Stop the program (a new save replaced it) and free the VM. */
  async dispose() {
    if (!this.finished) {
      this.deadline()
      if (this.pending) { const p = this.pending; this.pending = null; p.resolve({ stop: true }) }
      await this.done
    }
    this.destroy()
  }

  private destroy() {
    // quickjs-emscripten 0.32 bug: the asyncify module forgets a runtime's callbacks *before*
    // QTS_FreeRuntime, which then calls back to free our host functions and throws.
    // Keep the callbacks until the free has finished. (Sync module does it in the right order.)
    const cbs = (this.qjs as unknown as { callbacks: { deleteRuntime(rt: unknown): void } }).callbacks
    const forget = cbs.deleteRuntime
    cbs.deleteRuntime = (rt) => queueMicrotask(() => forget.call(cbs, rt))
    try {
      this.ctx.dispose()
      this.rt.dispose()
    } finally {
      cbs.deleteRuntime = forget
    }
  }

  private install(input: TickInput) {
    const { ctx } = this
    const act = ctx.newAsyncifiedFunction('__act', (h: QuickJSHandle) => {
      const req = JSON.parse(ctx.getString(h)) as Request
      this.startedActing = true
      return new Promise<QuickJSHandle>((resolve) => {
        this.pending = { req, issued: false, resolve: (v) => resolve(ctx.newString(JSON.stringify(v))) }
        this.wake?.()
      })
    })
    const cmd = ctx.newFunction('__cmd', (h) => {
      this.outbox.push({ ...(JSON.parse(ctx.getString(h)) as object), id: this.slimeId })
    })
    const log = ctx.newFunction('__log', (h) => { this.logs.push({ id: this.slimeId, text: ctx.getString(h) }) })
    for (const [name, fn] of [['__act', act], ['__cmd', cmd], ['__log', log]] as const) { ctx.setProp(ctx.global, name, fn); fn.dispose() }
    const init = ctx.newString(JSON.stringify(this.view(input)))
    ctx.setProp(ctx.global, '__initWorld', init)
    init.dispose()
  }

  /** Wait until the program is paused on an action, or has ended. */
  private settle() {
    return new Promise<void>((resolve) => {
      if (this.pending || this.finished) resolve()
      else this.wake = () => { this.wake = null; resolve() }
    })
  }

  private deadline() {
    this.rt.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + SCRIPT_MS))
  }

  private view(input: TickInput) {
    return { tick: input.tick, seed: input.seed, slimeId: this.slimeId, essence: input.essence, creatures: input.creatures, resources: input.resources }
  }

  private command(req: Request) {
    return { ...req, id: this.slimeId }
  }

  /** Has the slime finished this action, judging by the world now and what happened last tick? */
  private judge(p: Pending, input: TickInput, events: TickInput['events']): Verdict {
    const me = input.creatures.find((c) => c.id === this.slimeId)
    if (!me) return { done: true, result: false }
    const tired = p.issued && me.energy <= 0
    switch (p.req.type) {
      case 'gather': {
        const target = p.req.target
        if (events.some((e) => e.type === 'gathered' && e.id === me.id && e.essence === target)) return { done: true, result: true }
        if (!input.essence.some((e) => e.id === target)) return { done: true, result: false } // gone (someone else, or never existed)
        return tired ? { done: true, result: false } : { done: false }
      }
      case 'move': {
        const tx = clamp(p.req.x, 0, input.width), ty = clamp(p.req.y, 0, input.height)
        if (arrived(me, tx, ty)) return { done: true, result: true }
        return tired ? { done: true, result: false } : { done: false }
      }
      case 'eat':
        if (!p.issued) return { done: false }
        return { done: true, result: events.some((e) => e.type === 'ate' && e.id === me.id) }
    }
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const arrived = (c: Creature, x: number, y: number) => Math.hypot(c.x - x, c.y - y) < ARRIVED
