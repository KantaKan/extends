import RELEASE_ASYNC from '@jitl/quickjs-wasmfile-release-asyncify'
import { newQuickJSAsyncWASMModuleFromVariant, shouldInterruptAfterDeadline, type QuickJSAsyncWASMModule, type QuickJSContext, type QuickJSHandle } from 'quickjs-emscripten-core'
import type { RawSpecies } from '../render/morph/looks'
import type { RosterEntry } from '../sim/roster'
import type { Creature } from '../sim/creature'
import type { TickEvent } from '../sim/tick'
import type { Essence } from '../sim/world'
import PRELUDE from './prelude.js?raw'

export const UPDATE_MS = 5 // per creature per tick
export const LOAD_MS = 50 // running the top level of the player's file
const MEMORY_LIMIT = 32 * 1024 * 1024
const STACK_LIMIT = 256 * 1024
const FILE = 'lab.js'

export type TickInput = {
  tick: number
  width: number
  height: number
  /** What happened in the previous tick (script mode uses it to tell when an action finished). */
  events: TickEvent[]
  seed: number
  manaMax: number
  resources: { essence: number; crystal: number }
  essence: Essence[]
  creatures: Creature[]
}

export type CodeError = {
  id: number | null // creature, or null for load-time errors
  kind: 'syntax' | 'error' | 'timeout' | 'mana' | 'no-class'
  message: string
  line?: number
}

export type TickOutput = {
  commands: unknown[]
  logs: { id: number | null; text: string }[]
  errors: CodeError[]
  /** Script mode: the program just reached its last line (reported once). */
  finished?: boolean
}

export type LoadResult =
  | { ok: true; mode: 'class' | 'script'; classes: string[]; species: RawSpecies; roster: RosterEntry[] }
  | { ok: false; error: CodeError }

// One wasm module for both modes: class mode calls it synchronously, script mode needs asyncify to pause.
let quickjs: Promise<QuickJSAsyncWASMModule> | null = null
export const loadQuickJS = () => (quickjs ??= newQuickJSAsyncWASMModuleFromVariant(RELEASE_ASYNC))

/** One QuickJS VM running all creatures. A failed load keeps the previous (last good) code running. */
export class Sandbox {
  private ctx: QuickJSContext | null = null

  static async create() {
    return new Sandbox(await loadQuickJS())
  }

  private constructor(private readonly qjs: QuickJSAsyncWASMModule) {}

  load(js: string): LoadResult {
    const rt = this.qjs.newRuntime()
    rt.setMemoryLimit(MEMORY_LIMIT)
    rt.setMaxStackSize(STACK_LIMIT)
    const ctx = rt.newContext()
    const fail = (error: CodeError): LoadResult => { ctx.dispose(); rt.dispose(); return { ok: false, error } }

    if (!evalOk(ctx, PRELUDE, 'prelude.js')) return fail({ id: null, kind: 'error', message: 'prelude failed' })
    rt.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + LOAD_MS))
    const res = ctx.evalCode(js, FILE)
    if (res.error) return fail(toError(ctx, res.error, null))
    res.value.dispose()

    // Top-level `class X` bindings are global lexical names, visible to a second script.
    const classes = classNames(js)
    const reg = `__setClasses({${classes.map((n) => `${n}: typeof ${n} === 'function' ? ${n} : undefined`).join(',')}})`
    if (!evalOk(ctx, reg, 'classes.js')) return fail({ id: null, kind: 'error', message: 'class registry failed' })
    const roster = evalJson<RosterEntry[]>(ctx, '__roster()')
    const species = evalJson<RawSpecies>(ctx, '__describe()')
    if (!roster || !species) return fail({ id: null, kind: 'error', message: 'describe failed' })

    const carried = this.ctx && evalJson<unknown>(this.ctx, '__exportState()')
    if (carried) ctx.setProp(ctx.global, '__carried', ctx.newString(JSON.stringify(carried)))
    if (carried) evalOk(ctx, '__importState(__carried); delete globalThis.__carried', 'carry.js')

    this.dispose()
    this.ctx = ctx
    return { ok: true, mode: 'class', classes, species, roster }
  }

  tick(input: TickInput): TickOutput {
    const ctx = this.ctx
    if (!ctx) return { commands: [], logs: [], errors: [] }
    const hostErrors: CodeError[] = []
    const call = (name: string, ...args: QuickJSHandle[]) => {
      const fn = ctx.getProp(ctx.global, name)
      try { return ctx.callFunction(fn, ctx.undefined, ...args) } finally { fn.dispose(); args.forEach((a) => a.dispose()) }
    }

    ctx.runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + LOAD_MS))
    call('__begin', ctx.newString(JSON.stringify(input))).dispose()
    for (const c of input.creatures) {
      ctx.runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + UPDATE_MS))
      const r = call('__update', ctx.newNumber(c.id))
      if (r.error) hostErrors.push(toError(ctx, r.error, c.id))
      else r.value.dispose()
    }
    ctx.runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + LOAD_MS))
    const end = call('__end')
    const out = JSON.parse(ctx.getString(ctx.unwrapResult(end))) as TickOutput
    out.errors.push(...hostErrors)
    return out
  }

  dispose() {
    if (!this.ctx) return
    const rt = this.ctx.runtime
    this.ctx.dispose()
    rt.dispose()
    this.ctx = null
  }
}

/** Top-level-ish class names in the emitted JS. ponytail: regex scan; switch to the TS AST when feature locks land. */
export function classNames(js: string): string[] {
  return [...new Set([...js.matchAll(/^\s*class\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]!))]
}

function evalJson<T>(ctx: QuickJSContext, code: string): T | null {
  const r = ctx.evalCode(code, 'host.js')
  if (r.error) { r.error.dispose(); return null }
  const v = JSON.parse(ctx.getString(r.value)) as T
  r.value.dispose()
  return v
}

function evalOk(ctx: QuickJSContext, code: string, file: string) {
  const r = ctx.evalCode(code, file)
  if (r.error) { r.error.dispose(); return false }
  r.value.dispose()
  return true
}

export function toError(ctx: QuickJSContext, handle: QuickJSHandle, id: number | null): CodeError {
  const e = ctx.dump(handle) as { name?: string; message?: string; stack?: string } | string
  handle.dispose()
  if (typeof e !== 'object' || e === null) return { id, kind: 'error', message: String(e) }
  const m = e.stack?.match(/lab\.js:(\d+)/)
  const line = m ? Number(m[1]) : undefined
  const kind: CodeError['kind'] =
    e.name === 'SyntaxError' ? 'syntax'
    : e.name === 'ManaError' ? 'mana'
    : e.name === 'InternalError' && /interrupted/i.test(e.message ?? '') ? 'timeout'
    : 'error'
  return { id, kind, message: `${e.name ?? 'Error'}: ${e.message ?? ''}`, line }
}
