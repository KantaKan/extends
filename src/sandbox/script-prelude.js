// Script mode (act 1, no classes yet): runs inside QuickJS before the player's program.
// `slime` is the starter creature. Action calls (gather/move/eat) PAUSE the program until the
// slime has finished in the world, so loops, ifs and variables behave like a beginner expects.
;(() => {
  const hostAct = globalThis.__act // asyncified: request JSON -> { result, world } JSON (or { stop })
  const hostCmd = globalThis.__cmd // instant command (rename)
  const hostLog = globalThis.__log
  let world = JSON.parse(globalThis.__initWorld)
  delete globalThis.__act; delete globalThis.__cmd; delete globalThis.__log; delete globalThis.__initWorld

  class Stop extends Error { constructor() { super('stopped'); this.name = 'Stop' } }

  const me = () => world.creatures.find((c) => c.id === world.slimeId)
  function act(req) {
    const res = JSON.parse(hostAct(JSON.stringify(req)))
    if (res.stop) throw new Stop() // a new save replaced this program
    world = res.world
    return res.result
  }

  function nearest(kind) {
    if (kind !== 'essence' && kind !== 'golden') return null
    const m = me()
    let best = null, bestD = Infinity
    for (const e of world.essence) {
      if (kind === 'golden' && !e.golden) continue
      const d = m ? Math.hypot(e.x - m.x, e.y - m.y) : 0
      if (d < bestD) { best = e; bestD = d }
    }
    return best && { kind: 'essence', id: best.id, x: best.x, y: best.y, golden: !!best.golden }
  }

  const stat = (k) => { const m = me(); return m ? m[k] : undefined }
  const slime = {
    get hp() { return stat('hp') },
    get energy() { return stat('energy') },
    get hunger() { return stat('hunger') },
    get x() { return stat('x') },
    get y() { return stat('y') },
    get name() { return stat('name') },
    set name(v) {
      if (typeof v !== 'string' || !v.trim()) throw new TypeError('slime.name needs some text, like slime.name = "Mochi"')
      hostCmd(JSON.stringify({ type: 'rename', name: v }))
      const m = me()
      if (m) m.name = v.trim().slice(0, 16)
    },
    gather(target) {
      if (target == null) return false // nothing there (nearest() found nothing)
      return act({ type: 'gather', target: typeof target === 'object' ? target.id : target })
    },
    gatherNearest() { return this.gather(nearest('essence')) },
    move(x, y) {
      if (x && typeof x === 'object') { y = x.y; x = x.x }
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new TypeError('slime.move(x, y) needs two numbers')
      return act({ type: 'move', x, y })
    },
    eat() { return act({ type: 'eat' }) },
  }

  // Determinism: randomness and clock come from the simulation.
  let rng = world.seed
  Math.random = () => {
    rng = (rng + 0x6d2b79f5) | 0
    let t = Math.imul(rng ^ (rng >>> 15), 1 | rng)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  Date.now = () => world.tick * 100

  const show = (v) => (typeof v === 'string' ? v : (() => { try { return JSON.stringify(v) } catch { return String(v) } })())
  globalThis.console = { log: (...a) => hostLog(a.map(show).join(' ')) }
  globalThis.slime = slime
  globalThis.nearest = nearest
})()
