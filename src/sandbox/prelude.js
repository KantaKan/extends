// Runs inside QuickJS before the player's code. Defines the base class `Creature` and the
// host hooks (__begin / __update / __end). Player code can only *ask* for actions here:
// every method pushes a command; the simulation decides what actually happens.
;(() => {
  let classes = {}
  const instances = new Map() // creature id -> player object
  let world = null
  let out = []
  let logs = []
  let errors = []
  let mana = 0
  let current = null
  let rng = 0
  let loading = true // true while the player's top-level code runs
  const roster = [] // objects made with `new` at the top level = the creatures the lab should have
  let carried = {} // id -> player-made fields from the previous version of the code

  class ManaError extends Error {
    constructor() { super('out of mana'); this.name = 'ManaError' }
  }

  function send(self, cmd) {
    if (mana <= 0) throw new ManaError()
    mana--
    cmd.id = self.id
    out.push(cmd)
  }

  class Creature {
    constructor() {
      if (loading) roster.push(this)
    }
    move(x, y) {
      if (x && typeof x === 'object') { y = x.y; x = x.x }
      send(this, { type: 'move', x, y })
    }
    eat() { send(this, { type: 'eat' }) }
    gather(target) {
      if (target == null) return // nothing to gather: nearest() found nothing
      send(this, { type: 'gather', target: typeof target === 'object' ? target.id : target })
    }

    // Game plumbing only. Never add a helper that does a lesson's concept (if, loops, new…) for the player.
    gatherNearest() { this.gather(nearest('essence')) }
  }

  function nearest(kind) {
    if ((kind !== 'essence' && kind !== 'golden') || !world) return null
    const me = current
    let best = null, bestD = Infinity
    for (const e of world.essence) {
      if (kind === 'golden' && !e.golden) continue
      const d = me ? Math.hypot(e.x - me.x, e.y - me.y) : 0
      if (d < bestD) { best = e; bestD = d }
    }
    return best && { kind: 'essence', id: best.id, x: best.x, y: best.y, golden: !!best.golden }
  }

  // Determinism: the player's randomness and clock come from the simulation, not the machine.
  Math.random = () => {
    rng = (rng + 0x6d2b79f5) | 0
    let t = Math.imul(rng ^ (rng >>> 15), 1 | rng)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  Date.now = () => (world ? world.tick * 100 : 0)

  const show = (v) => (typeof v === 'string' ? v : (() => { try { return JSON.stringify(v) } catch { return String(v) } })())
  globalThis.console = { log: (...a) => { logs.push({ id: current ? current.id : null, text: a.map(show).join(' ') }) } }
  globalThis.Creature = Creature
  globalThis.nearest = nearest

  const lineOf = (e) => { const m = e && typeof e.stack === 'string' && e.stack.match(/lab\.js:(\d+)/); return m ? Number(m[1]) : undefined }
  const LOOKS = ['body', 'element', 'eyes', 'horns']
  const WORLD_OWNED = new Set(['id', 'name', 'className', 'x', 'y', 'hp', 'energy', 'hunger', 'meals', ...LOOKS])

  /** Fields the player's code made itself (this.count, this.home…), JSON-safe. Looks come from the class. */
  function ownState(obj) {
    const out = {}
    for (const k of Object.keys(obj)) {
      if (WORLD_OWNED.has(k)) continue
      try { const v = JSON.parse(JSON.stringify(obj[k])); if (v !== undefined) out[k] = v } catch { /* not portable */ }
    }
    return out
  }

  globalThis.__setClasses = (c) => { classes = c; loading = false }

  globalThis.__roster = () => JSON.stringify(roster.map((o) => ({
    className: o.constructor.name,
    name: typeof o.name === 'string' && o.name ? o.name : null,
  })))

  globalThis.__exportState = () => {
    const out = {}
    for (const [id, obj] of instances) out[id] = ownState(obj)
    return JSON.stringify(out)
  }
  globalThis.__importState = (json) => { carried = JSON.parse(json) }

  // Per class: the morph properties a fresh instance has, and which player class it extends.
  globalThis.__describe = () => {
    const out = {}
    for (const [name, Cls] of Object.entries(classes)) {
      if (typeof Cls !== 'function') continue
      const looks = {}
      try {
        const o = new Cls()
        for (const k of LOOKS) { const v = o[k]; if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) looks[k] = v }
      } catch { /* reported when a creature of this class spawns */ }
      const p = Object.getPrototypeOf(Cls)
      out[name] = { looks, parent: p && classes[p.name] === p ? p.name : null }
    }
    return JSON.stringify(out)
  }

  globalThis.__begin = (json) => {
    world = JSON.parse(json)
    out = []; logs = []; errors = []
    mana = world.manaMax
    rng = world.seed
    const alive = new Set()
    for (const s of world.creatures) {
      alive.add(s.id)
      let obj = instances.get(s.id)
      if (!obj || obj.constructor.name !== s.className) {
        const keep = obj ? ownState(obj) : carried[s.id]
        delete carried[s.id]
        const Cls = classes[s.className]
        if (typeof Cls !== 'function') { errors.push({ id: s.id, kind: 'no-class', message: s.className }); instances.delete(s.id); continue }
        try { obj = new Cls() } catch (e) {
          errors.push({ id: s.id, kind: 'error', message: `${e && e.name}: ${e && e.message}`, line: lineOf(e) })
          instances.delete(s.id)
          continue
        }
        if (keep) Object.assign(obj, keep) // hot reload: what it learned survives the new code
        instances.set(s.id, obj)
      }
      // World stats are the truth; the player's copy is refreshed every tick.
      obj.id = s.id; obj.name = s.name; obj.x = s.x; obj.y = s.y
      obj.hp = s.hp; obj.energy = s.energy; obj.hunger = s.hunger
    }
    for (const id of instances.keys()) if (!alive.has(id)) instances.delete(id)
  }

  globalThis.__update = (id) => {
    const obj = instances.get(id)
    if (!obj || typeof obj.update !== 'function') return
    current = obj
    try { obj.update() } finally { current = null }
  }

  globalThis.__end = () => JSON.stringify({ commands: out, logs, errors })
})()
