/// <reference lib="webworker" />
import { ScriptRunner } from './script'
import { classNames, Sandbox, type LoadResult, type TickInput, type TickOutput } from './vm'

// Two ways the player's file runs (decided per save): a file with classes = class mode (update()
// every tick), a file without = script mode (act 1: a program driving `slime`).
const sandbox = Sandbox.create()
let script: ScriptRunner | null = null
let lastGoodScript: string | null = null

type Msg = { id: number; op: 'load'; arg: { js: string; world: TickInput } } | { id: number; op: 'tick'; arg: TickInput }

async function load(js: string, world: TickInput): Promise<LoadResult> {
  const sb = await sandbox
  if (classNames(js).length) {
    const res = sb.load(js)
    if (res.ok && script) { await script.dispose(); script = null; lastGoodScript = null }
    return res
  }
  // Asyncify can only keep one program paused, so the old one must stop before the new one starts.
  await script?.dispose()
  script = null
  const { runner, result } = await ScriptRunner.start(js, world)
  if (runner) {
    script = runner
    lastGoodScript = js
    sb.dispose() // leave class mode
  } else if (lastGoodScript) {
    script = (await ScriptRunner.start(lastGoodScript, world)).runner // broken save: the last good program restarts
  }
  return result
}

async function tick(input: TickInput): Promise<TickOutput> {
  if (script) return script.tick(input)
  return (await sandbox).tick(input)
}

// One message at a time: a tick must never run while a load is halfway done.
let queue: Promise<unknown> = Promise.resolve()
self.onmessage = (e: MessageEvent<Msg>) => {
  const m = e.data
  queue = queue.then(async () => {
    const result = m.op === 'load' ? await load(m.arg.js, m.arg.world) : await tick(m.arg)
    postMessage({ id: m.id, result })
  })
}
