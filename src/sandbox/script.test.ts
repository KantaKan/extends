import { describe, expect, it } from 'vitest'
import { step, type TickEvent } from '../sim/tick'
import { createWorld, spawnCreature, type World } from '../sim/world'
import { ScriptRunner } from './script'
import type { TickInput, TickOutput } from './vm'

function input(w: World, events: TickEvent[]): TickInput {
  return { tick: w.tick, width: w.width, height: w.height, events, seed: w.rng, manaMax: w.manaMax, resources: w.resources, essence: w.essence, creatures: w.creatures }
}

/** A lab with one slime, driven by a script for up to `ticks` ticks. */
async function run(js: string, ticks: number, setup?: (w: World) => void) {
  const w = createWorld(1)
  const slime = spawnCreature(w, 'Mochi', 'Slime', 4.5, 3)
  setup?.(w)
  let events: TickEvent[] = []
  const { runner, result } = await ScriptRunner.start(js, input(w, events))
  const outs: TickOutput[] = []
  if (runner) {
    for (let i = 0; i < ticks; i++) {
      const out = await runner.tick(input(w, events))
      outs.push(out)
      events = step(w, out.commands)
    }
  }
  const logs = outs.flatMap((o) => o.logs.map((l) => l.text))
  const errors = outs.flatMap((o) => o.errors)
  return { w, slime, runner, result, outs, logs, errors, finished: outs.some((o) => o.finished) }
}

describe('script mode (act 1)', () => {
  it('nearest("golden") finds only golden Essence; nearest("essence") finds any', async () => {
    const r = await run('console.log(nearest("golden").id, nearest("essence").golden)\nconsole.log(slime.gather(nearest("golden")))', 60, (w) => {
      w.essence = [{ id: 1, x: 4.5, y: 3 }, { id: 2, x: 1.5, y: 1.5, golden: true, until: 100 }]
    })
    expect(r.logs).toEqual(['2 false', 'true'])
    expect(r.w.resources.essence).toBe(5)
  })

  it('each action waits until the slime has done it, then the next line runs', async () => {
    const r = await run('console.log(slime.gather(nearest("essence")))\nconsole.log(slime.gather(nearest("essence")))\nconsole.log("done")', 300)
    expect(r.result).toMatchObject({ ok: true, mode: 'script' })
    expect(r.w.stats.gathered).toBe(2)
    expect(r.logs).toEqual(['true', 'true', 'done'])
    expect(r.finished).toBe(true)
    await r.runner!.dispose()
  })

  it('loops and variables work like a beginner expects', async () => {
    const r = await run('let trips = 3\nfor (let i = 0; i < trips; i++) {\n  slime.gatherNearest()\n}\nconsole.log("got", 3)', 400)
    expect(r.w.stats.gathered).toBe(3)
    expect(r.logs).toEqual(['got 3'])
    await r.runner!.dispose()
  })

  it('functions can be reused', async () => {
    const r = await run('function twice() {\n  slime.gatherNearest()\n  slime.gatherNearest()\n}\ntwice()\ntwice()', 600)
    expect(r.w.stats.gathered).toBe(4)
    await r.runner!.dispose()
  })

  it('reads live values after each action (if on slime.hunger)', async () => {
    const r = await run('while (slime.hunger <= 50) slime.move(slime.x === 1 ? 7 : 1, 3)\nif (slime.hunger > 50) {\n  console.log("hungry", slime.hunger > 50)\n  slime.eat()\n}', 4000, (w) => { w.resources.essence = 5 })
    expect(r.logs).toEqual(['hungry true'])
    expect(r.w.stats.ate).toBe(1)
    await r.runner!.dispose()
  })

  it('renames the slime at once', async () => {
    const r = await run('slime.name = "Bubu"\nconsole.log(slime.name)', 3)
    expect(r.slime.name).toBe('Bubu')
    expect(r.logs).toEqual(['Bubu'])
    expect(r.w.stats.renamed).toBe(1)
  })

  it('an action that can never finish returns false instead of waiting forever', async () => {
    const r = await run('console.log(slime.gather(nearest("essence")))', 50, (w) => { w.creatures[0]!.energy = 0; w.essence = [{ id: 999, x: 0.5, y: 0.5 }] })
    expect(r.logs).toEqual(['false'])
  })

  it('a typo before the first action fails the load (old program keeps running)', async () => {
    const r = await run('slime.gaher(nearest("essence"))', 1)
    expect(r.result).toMatchObject({ ok: false, error: { kind: 'error', line: 1 } })
  })

  it('an error after actions stops the program and is reported with its line', async () => {
    const r = await run('slime.gatherNearest()\nnope()', 200)
    expect(r.errors).toEqual([expect.objectContaining({ kind: 'error', line: 2 })])
    expect(r.finished).toBe(false) // it crashed: Ref explains the error instead of "done every line"
  })

  it('a runaway loop with no actions in it is stopped', async () => {
    const t0 = Date.now()
    const r = await run('slime.gatherNearest()\nwhile (true) {}', 200)
    expect(Date.now() - t0).toBeLessThan(3000)
    expect(r.errors[0]).toMatchObject({ kind: 'timeout' })
    expect(r.finished).toBe(false) // stopped, not "done every line"
  })

  it('looping on an empty field (every call returns false at once) is stopped too', async () => {
    const r = await run('slime.gatherNearest()\nwhile (true) slime.gather(nearest("essence"))', 100, (w) => { w.essence = w.essence.slice(0, 1) })
    expect(r.errors.some((e) => e.kind === 'timeout')).toBe(true)
  })

  it('a new save stops the paused program cleanly', async () => {
    const w = createWorld(1)
    spawnCreature(w, 'Mochi', 'Slime')
    const a = await ScriptRunner.start('while (true) slime.move(1, 1)', input(w, []))
    await a.runner!.tick(input(w, []))
    await a.runner!.dispose() // paused inside move(): must not hang or throw
    const b = await ScriptRunner.start('slime.move(2, 2)', input(w, []))
    expect(b.result).toMatchObject({ ok: true })
    await b.runner!.dispose()
  })
})
