import { useCallback, useEffect, useRef, useState } from 'react'
import QUESTS from '../../content/quests.json'
import { clearDraft, Editor } from '../editor/Editor'
import { starterCode } from '../editor/starter'
import { codeFeatures, type CodeFeatures } from '../editor/features'
import type { Transpiled } from '../editor/transpile'
import { startLoop } from '../loop'
import type { Status } from '../render/creatureView'
import type { Lab } from '../render/lab'
import { buildSpecies, type RawSpecies, type Species } from '../render/morph/looks'
import { isLocked, research, researchCost } from '../sim/research'
import { SandboxClient } from '../sandbox/client'
import { done, progress as questProgressOf, type ClassInfo, type Progress, type Quest } from '../sim/quests'
import { reconcile } from '../sim/roster'
import { machineStats, upgrade, type Machine } from '../sim/upgrades'
import { codexKey, discover, nickname } from '../sim/codex'
import type { TickEvent } from '../sim/tick'
import { traitsFor } from '../sim/traits'
import { createWorld, spawnCreature, type World } from '../sim/world'
import { CreatureCard } from './CreatureCard'
import { MachineCard } from './MachineCard'
import { DnaDrawer } from './DnaDrawer'
import { t, type Key } from './i18n'
import { LabView } from './LabView'
import { Pointer } from './Pointer'
import { clearProgress, loadProgress, saveProgress, type Progress as SaveProgress } from './progress'
import { QuestCard, questText } from './QuestCard'
import { explainError, explainInvalidParts } from './ref'
import { RefBot } from './RefBot'
import { StarterPick, type StarterChoice } from './StarterPick'
import { TopBar, type Speed } from './TopBar'
import { advance, FIRST_LINE, TUTORIAL, TUTORIAL_DONE, type TutorialEvent } from './tutorial'
import { useRefLog } from './useRefLog'
import { Notebook } from './Notebook'
import ORDERS_JSON from '../../content/orders.json'
import { emptyOrders, updateOrders, type OrdersState, type OrderTemplate } from '../sim/orders'
import { toSave, type LabSave } from '../sim/save'
import { idbDelete, idbPut } from './idb'
import { OrdersCard } from './OrdersCard'
import NOTEBOOK from '../../content/notebook.json'
import { Banner, type BannerMsg } from './Banner'
import { shouldNudge } from './nudge'

const SEED = 20261018 // ponytail: fixed seed; becomes per-save once saves exist
const STARTER_CLASS = 'Slime'
const quests = QUESTS as Quest[]
const LESSONS = NOTEBOOK.lessons
const BANNER_MS = 2300
const ORDERS = ORDERS_JSON as OrderTemplate[]
const SAVE_KEY = 'lab'
const AUTOSAVE_TICKS = 50 // 5 s of lab time
const orderText = (o: OrderTemplate) => t(`order.${o.kind}` as Key, { count: o.count, element: o.element ? t(`element.${o.element}` as Key) : '' })

const hudOf = (w: World) => ({ essence: w.resources.essence, mana: w.manaLeft, manaMax: w.manaMax })
const sameStatus = (a: Map<number, Status>, b: Map<number, Status>) => a.size === b.size && [...a].every(([k, v]) => b.get(k) === v)

function spawnStarter(w: World, starter: { name: string }) {
  if (!w.creatures.length) spawnCreature(w, starter.name, STARTER_CLASS)
}

/** Quest 3 asks for a subclass with a *different* element than the starter. */
const newElementHint = (starter: string | undefined) => (starter === 'fire' ? { cls: 'WaterSlime', element: 'water' } : { cls: 'FireSlime', element: 'fire' })

/** Height of the open DNA machine; matches `--dna-h` in app.css. */
const dnaHeight = () => window.innerHeight * 0.46

const inEditor = (el: Element | null) => !!el?.closest('.monaco-editor')
const inField = (el: Element | null) => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement

export function App({ saved }: { saved: LabSave | null }) {
  const [save, setSave] = useState<SaveProgress>(loadProgress)
  const [world] = useState(() => {
    if (saved && save.starter) return saved.world // the lab as the player left it
    const w = createWorld(SEED)
    if (save.starter) spawnStarter(w, save.starter)
    return w
  })
  const started = save.starter !== null

  const [hud, setHud] = useState(() => hudOf(world))
  const [speed, setSpeed] = useState<Speed>(1)
  const [species, setSpecies] = useState(() => new Map<string, Species>())
  const [status, setStatus] = useState(() => new Map<number, Status>())
  const [lit, setLit] = useState(saved?.lit ?? false)
  const [questIx, setQuestIx] = useState(saved?.questIx ?? 0)
  const orders = useRef<OrdersState>(saved?.orders ?? emptyOrders())
  const [questProgress, setQuestProgress] = useState<Progress | null>(null)
  const [tutIx, setTutIx] = useState(save.tutorialDone ? TUTORIAL_DONE : 0)
  const [dnaOpen, setDnaOpen] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [machine, setMachine] = useState<Machine | null>(null)
  const [banner, setBanner] = useState<BannerMsg | null>(null)
  const [manaOut, setManaOut] = useState(0)
  const [codeMode, setCodeMode] = useState<'script' | 'class'>('script')
  const { lines, say, sayOnce, forgetRepeats } = useRefLog(t(saved?.lit && !Object.values(saved.world.levels).some(Boolean) ? 'ref.upgrades' : 'ref.hello')) // labs lit before upgrades existed hear about them once
  const nudge = useRef({ lastProgressTick: 0, lastSaveTick: 0, lastHave: -1, nudged: new Set<string>() })

  const [ordersView, setOrdersView] = useState<OrdersState>(() => orders.current)
  const persistNow = useRef<() => void>(() => {})
  const unlocks = useRef(new Set<string>(saved?.unlocks ?? []))
  const [unlockCount, setUnlockCount] = useState(unlocks.current.size) // re-render the notebook after research
  const codex = useRef(new Set<string>(saved?.codex ?? []))
  const [codexCount, setCodexCount] = useState(codex.current.size)
  const speciesKeys = useRef(new Map<string, string>()) // class name → codex key
  const rawSpecies = useRef<RawSpecies>({})
  const inTutorial = started && tutIx < TUTORIAL_DONE
  const step = inTutorial ? TUTORIAL[tutIx] : undefined
  const labRef = useRef<Lab | null>(null)
  const sandbox = useRef<SandboxClient>(null)
  const jsLines = useRef<number[]>([]) // JS line → editor line for the code that is running
  const classInfo = useRef<ClassInfo>(new Map())
  const questSince = useRef<World['stats']>(saved?.questSince ?? { ...world.stats }) // world stats when the current quest started
  const features = useRef<CodeFeatures>({ loop: false, if: false, function: false, this: false }) // concepts the running code uses
  const mode = useRef<'class' | 'script' | null>(null) // how the saved code runs (see src/sandbox/worker.ts)
  const live = useRef({ speed, questIx, inTutorial, lit })
  live.current = { speed, questIx, inTutorial, lit }

  const fire = useCallback((e: TutorialEvent) => setTutIx((ix) => advance(ix, e)), [])

  const bannerSeq = useRef(0)
  /** "Quest complete" in the middle of the screen, then the next quest's name. */
  const showBanner = useCallback((kind: BannerMsg['kind'], title: string, next?: Quest) => {
    const label = (k: BannerMsg['kind']) => t(k === 'done' ? 'banner.done' : 'banner.new')
    setBanner({ id: ++bannerSeq.current, kind, label: label(kind), title })
    if (next) window.setTimeout(() => setBanner({ id: ++bannerSeq.current, kind: 'new', label: label('new'), title: questText(next, 'title') }), BANNER_MS)
  }, [])
  const mealsAtStart = useRef<Record<number, number>>(saved?.mealsAtStart ?? {})
  /** A quest begins: earlier work stops counting, and its notebook lesson (if any) opens. */
  const startQuest = useCallback((q: Quest | undefined) => {
    questSince.current = { ...world.stats }
    mealsAtStart.current = Object.fromEntries(world.creatures.map((c) => [c.id, c.meals]))
    const lesson = q && LESSONS.find((l) => l.unlock === q.id)
    if (lesson) say(t('nb.newPage', { title: t(`nb.lesson.${lesson.id}.title` as Key) }))
  }, [world, say])
  const nameOf = useCallback((id: number | null) => world.creatures.find((c) => c.id === id)?.name ?? null, [world])

  // The simulation loop + sandbox.
  useEffect(() => {
    if (import.meta.env.DEV) (globalThis as { lab?: World }).lab = world // poke at it from devtools
    const sb = (sandbox.current = new SandboxClient())
    let lastSaveTick = world.tick
    persistNow.current = persist
    let shown = new Map<number, Status>()
    const stop = startLoop(world, {
      speed: () => live.current.speed,
      brain: async (w, lastEvents) => {
        const out = await sb.tick(w, lastEvents)
        for (const l of out.logs) say(l.id === null ? l.text : t('ref.log', { name: nameOf(l.id) ?? '?', text: l.text }))
        if (out.finished) say(t('ref.finished', { name: nameOf(w.creatures[0]?.id ?? null) ?? '?' }))
        const next = new Map<number, Status>()
        for (const e of out.errors) {
          if (e.id !== null) next.set(e.id, e.kind === 'timeout' ? 'dizzy' : 'confused')
          const text = explainError(e, nameOf(e.id), jsLines.current)
          sayOnce(text, text, 'error') // keyed by text: the same typo in 10 slimes is one message
        }
        if (!sameStatus(next, shown)) setStatus((shown = next))
        return out.commands
      },
      onTicks: (events) => {
        setHud(hudOf(world))
        events.forEach(speak)
        if (events.some((e) => e.type === 'rejected' && e.reason === 'no-mana')) {
          setManaOut(world.tick)
          sayOnce('mana-out', t('ref.manaOut'))
        }
        findSpecies()
        if (!live.current.inTutorial) checkQuest()
        if (live.current.lit) runOrders()
        if (world.tick - lastSaveTick >= AUTOSAVE_TICKS) persist()
      },
    })
    return () => { stop(); sb.dispose() }

    function persist() {
      lastSaveTick = world.tick
      void idbPut(SAVE_KEY, toSave({
        world, questIx: live.current.questIx, questSince: questSince.current, mealsAtStart: mealsAtStart.current,
        lit: live.current.lit, orders: orders.current, unlocks: [...unlocks.current], codex: [...codex.current],
      }))
    }

    function runOrders() {
      const elementOf = (cls: string) => classInfo.current.get(cls)?.element
      for (const e of updateOrders(orders.current, world, ORDERS, live.current.questIx, elementOf)) {
        const tpl = ORDERS.find((o) => o.id === e.id)!
        if (e.type === 'new') say(t('ref.orderNew', { title: orderText(tpl), n: tpl.reward }))
        if (e.type === 'expired') say(t('ref.orderExpired', { title: orderText(tpl) }))
        if (e.type === 'done') {
          say(t('ref.orderDone', { n: tpl.reward }))
          setBanner({ id: ++bannerSeq.current, kind: 'done', label: t('banner.orderDone'), title: `${orderText(tpl)}  ◆+${tpl.reward}` })
          persist()
        }
      }
      setOrdersView({ ...orders.current, active: [...orders.current.active] })
    }

    function checkQuest() {
      const q = quests[live.current.questIx]
      if (!q) return
      const p = questProgressOf(q.goal, world, { classes: classInfo.current, since: questSince.current, mealsAtStart: mealsAtStart.current, code: features.current })
      setQuestProgress((old) => (old && old.have === p.have && old.need === p.need && old.missing === p.missing ? old : p))
      if (p.missing) sayOnce(`missing-${p.missing}`, t(`quest.needs.${p.missing}` as Key))
      const n = nudge.current
      if (p.have !== n.lastHave) { n.lastHave = p.have; n.lastProgressTick = world.tick }
      if (shouldNudge({ tick: world.tick, ...n, questActive: true, inTutorial: false, alreadyNudged: n.nudged.has(q.id) })) {
        n.nudged.add(q.id)
        say(questText(q, 'nudge'))
      }
      if (!done(p)) return
      say(t('quest.done', { title: questText(q, 'title') }))
      if (q.reward.lights) { setLit(true); live.current.lit = true; say(t('quest.lights')); say(t('ref.boardOn')); say(t('ref.upgrades')) }
      setQuestIx((live.current.questIx += 1))
      n.lastHave = -1
      const nextQ = quests[live.current.questIx]
      say(nextQ ? questText(nextQ, 'title') : t('quest.allDone'))
      startQuest(nextQ)
      showBanner('done', questText(q, 'title'), nextQ)
      persist()
    }

    function speak(e: TickEvent) {
      if (e.type === 'golden') sayOnce('golden', t('ref.golden'))
      if (e.type === 'hatched') say(t('ref.hatched', { name: nameOf(e.id) ?? '?', cost: machineStats(world.levels).hatchCost }))
      // Keyed by reason, not creature: a tired herd is one message, not ten.
      if (e.type === 'rejected' && e.reason === 'no-food') sayOnce('no-food', t('ref.noFood', { name: nameOf(e.id) ?? '?' }))
      if (e.type === 'rejected' && e.reason === 'tired') sayOnce('tired', t('ref.tired', { name: nameOf(e.id) ?? '?' }))
      if (e.type === 'rejected' && e.reason === 'busy') sayOnce('busy', t('ref.busy', { name: nameOf(e.id) ?? '?' }))
    }
  }, [world, say, sayOnce, nameOf, showBanner, startQuest])

  // Tutorial finished: remember it, and hand over to the quests.
  const wasInTutorial = useRef(inTutorial)
  useEffect(() => {
    if (wasInTutorial.current && !inTutorial && save.starter) {
      const next = { ...save, tutorialDone: true }
      saveProgress(next)
      setSave(next)
      startQuest(quests[0]) // what happened during the tutorial doesn't count
      nudge.current.lastProgressTick = world.tick
      say(questText(quests[0]!, 'title'))
      showBanner('new', questText(quests[0]!, 'title'))
    }
    wasInTutorial.current = inTutorial
  }, [inTutorial, save, say, showBanner, world, startQuest])

  const setDrawer = useCallback((open: boolean) => {
    setDnaOpen(open)
    fire({ type: open ? 'openDna' : 'closeDna' })
  }, [fire])

  // Tab opens/closes the DNA machine (Tab inside the editor still indents); Esc closes things.
  useEffect(() => {
    if (!started) return
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      if (e.key === 'Tab' && !inEditor(el) && !inField(el)) { e.preventDefault(); setDrawer(!dnaOpen) }
      if (e.key === 'Escape' && !inEditor(el)) { if (selected !== null || machine !== null) { setSelected(null); setMachine(null) } else if (dnaOpen) setDrawer(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [started, dnaOpen, selected, setDrawer])

  // Leaving the page: write the lab one last time.
  useEffect(() => {
    const flush = () => persistNow.current()
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  const startOver = async () => {
    persistNow.current = () => {} // don't write the old lab back on the way out
    await idbDelete(SAVE_KEY)
    clearDraft()
    clearProgress()
    location.reload()
  }

  const onPickCreature = useCallback((id: number | null) => {
    setSelected(id)
    setMachine(null)
    if (id !== null) fire({ type: 'clickCreature' })
  }, [fire])

  const onPickStarter = (c: StarterChoice) => {
    const next: SaveProgress = { starter: { element: c.element, name: c.name }, tutorialDone: c.skipTutorial }
    clearDraft()
    saveProgress(next)
    spawnStarter(world, next.starter!)
    setTutIx(c.skipTutorial ? TUTORIAL_DONE : 0)
    setSave(next)
  }

  /** Turn the classes' raw parts into looks (locked parts drawn as the default) and personalities. */
  const applySpecies = (raw: RawSpecies) => {
    rawSpecies.current = raw
    const sp = buildSpecies(raw, (part, value) => isLocked(unlocks.current, part, value))
    setSpecies(sp)
    classInfo.current = new Map([...sp].map(([name, x]) => [name, { element: x.looks.element, parent: raw[name]?.parent ?? null }]))
    speciesKeys.current = new Map([...sp].map(([name, x]) => [name, codexKey(x.looks.body, x.looks.element)]))
    world.traits = traitsFor(new Map([...sp].map(([name, x]) => [name, x.looks.element])))
    return sp
  }

  /** A creature of a new body × element lives in the lab: name the species (quietly during the tutorial). */
  function findSpecies() {
    const seen = world.creatures.map((c) => speciesKeys.current.get(c.className)).filter((k): k is string => !!k)
    const fresh = discover(codex.current, seen)
    if (!fresh.length) return
    setCodexCount(codex.current.size)
    if (live.current.inTutorial) return
    for (const k of fresh) {
      const [body, element] = k.split(':') as [string, string]
      const name = nickname(body, element)
      setBanner({ id: ++bannerSeq.current, kind: 'done', label: t('banner.species'), title: name })
      say(t('ref.species', { name, body, element }))
    }
    persistNow.current()
  }

  const onUpgrade = (m: Machine) => {
    if (!upgrade(world, m)) return
    say(t('ref.upgraded', { name: t(`up.${m}.name` as Key) }))
    setHud(hudOf(world))
    persistNow.current()
  }

  const onResearch = (part: string, value: string) => {
    if (!research(unlocks.current, world.resources, part, value)) return
    say(t('ref.researched', { part: t(`part.${part}` as Key), value }))
    applySpecies(rawSpecies.current) // creatures already asking for it morph right now
    setUnlockCount(unlocks.current.size)
    setHud(hudOf(world))
    persistNow.current()
  }

  const onSave = async (r: Transpiled) => {
    if (!r.ok) {
      say(t('ref.syntax', { line: r.line, msg: r.message }), 'error')
      return say(t('ref.keepOld'))
    }
    const res = await sandbox.current?.load(r.js, world)
    if (!res) return
    if (!res.ok) {
      say(explainError(res.error, null, r.lines), 'error')
      return say(t('ref.keepOld'))
    }
    jsLines.current = r.lines
    nudge.current.lastSaveTick = world.tick
    features.current = codeFeatures(r.source)
    forgetRepeats()
    // Script mode has no classes to read looks from: the starter keeps the element it was picked with.
    const sp = applySpecies(res.mode === 'script' ? { [STARTER_CLASS]: { looks: { element: save.starter?.element }, parent: null } } : res.species)
    if (res.mode === 'class' && mode.current === 'script') say(t('ref.classMode'))
    mode.current = res.mode
    setCodeMode(res.mode)
    reconcile(world, res.roster)
    fire({ type: 'saved' })
    say(res.mode === 'script' ? t('ref.savedScript', { name: nameOf(world.creatures[0]?.id ?? null) ?? '?' }) : t('ref.saved', { classes: res.classes.join(', ') }))
    for (const l of explainInvalidParts(sp)) say(l, 'error')
    for (const l of new Set([...sp.values()].flatMap((x) => x.locked.map((k) => `${k.part}:${k.value}`)))) {
      const [part, value] = l.split(':') as [string, string]
      say(t('ref.locked', { part: t(`part.${part}` as Key), value, cost: researchCost(part, value) }))
    }
    if (res.mode === 'class' && !res.roster.length) say(t('ref.noNew'), 'error')
    if (world.pending.length) say(t('ref.waiting', { n: world.pending.length, cost: machineStats(world.levels).hatchCost }))
  }

  const starterId = world.creatures[0]?.id
  const instruction = step ? t(step.textKey as Key, { name: save.starter?.name ?? '' }) : null

  return (
    <div className={`game${dnaOpen ? ' dna-open' : ''}`}>
      <LabView world={world} species={species} status={status} lit={lit} onPick={onPickCreature} onTerminal={() => setDrawer(true)} onMachine={(m) => { setSelected(null); setMachine(m) }} beckon={started && !inTutorial && !dnaOpen} cover={{ bottom: dnaOpen ? dnaHeight() : 0, focusId: selected ?? starterId ?? null }} labRef={labRef} />
      <TopBar essence={hud.essence} crystal={lit ? world.resources.crystal : null} mana={hud.mana} manaMax={hud.manaMax} manaOut={manaOut} speed={speed} maxSpeed={machineStats(world.levels).maxSpeed} onSpeed={setSpeed} />
      <Banner msg={banner} />
      <div className="side">
        {started && !inTutorial && <QuestCard quest={quests[questIx] ?? null} progress={questProgress} vars={{ ...newElementHint(save.starter?.element), mine: save.starter?.element ?? 'none' }} onOpenDna={() => setDrawer(true)} />}
        {started && !inTutorial && lit && <OrdersCard orders={ordersView} world={world} elementOf={(cls) => classInfo.current.get(cls)?.element} />}
      </div>
      {machine !== null && <MachineCard world={world} machine={machine} lab={labRef} onUpgrade={onUpgrade} onClose={() => setMachine(null)} />}
      {selected !== null && <CreatureCard world={world} id={selected} species={species} lab={labRef} />}
      {step?.pointAt === 'creature' && starterId !== undefined && <Pointer lab={labRef} id={starterId} />}
      {started && (
        <>
          <RefBot instruction={instruction} lines={lines} onReset={startOver} />
          <DnaDrawer
            open={dnaOpen}
            onToggle={() => setDrawer(!dnaOpen)}
            pointAtHandle={step?.pointAt === 'dna-handle'}
            notebook={<Notebook mode={codeMode} quests={quests} unlocked={new Set(quests.slice(0, questIx + 1).map((q) => q.id))} research={{ crystal: lit ? world.resources.crystal : null, owned: unlocks.current, count: unlockCount, buy: onResearch }} codex={{ found: codex.current, count: codexCount }} />}
          >
            <Editor
              starter={starterCode([t('code.intro'), t('code.firstLine')])}
              onSave={onSave}
              onChange={(text) => fire({ type: 'typed', text })}
              onEscape={() => setDrawer(false)}
              active={dnaOpen}
              highlight={step?.pointAt === 'editor-line' ? FIRST_LINE : null}
            />
          </DnaDrawer>
        </>
      )}
      {!started && <StarterPick onPick={onPickStarter} />}
    </div>
  )
}
