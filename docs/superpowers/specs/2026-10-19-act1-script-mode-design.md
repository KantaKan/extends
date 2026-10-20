# Act 1: plain JavaScript first (script mode) — design

Oct 19, 2026 · approved in chat with Fiafia

## Why

The designer wants the game to start from JavaScript basics (method calls, properties, variables, if, loops, functions) before classes — for beginners and for people who know a little JS. The GDD curriculum already orders it this way (act 1 → act 2 class → act 3 extends); phase 0 had jumped straight to classes. Players must write each concept themselves (see memory: player API rules).

## A. Two ways code runs

Chosen by the code itself on every save:

- **Script mode** — the file has no `class`. There is one global `slime` (the starter creature). The file runs top to bottom like a program: action calls **wait until the slime has finished** in the world, then the next line runs. So variables, `if`, loops and functions mean exactly what a beginner expects.
- **Class mode** — the file declares a class. Works as today: top-level `new X()` = the lab's creatures, `update()` runs every tick.

### Script mode API

| | Behaviour | Returns |
| --- | --- | --- |
| `slime.gather(target)` | walks to the Essence and picks it up; waits until collected, or until it's gone | `true` if it got it |
| `slime.gatherNearest()` | `gather(nearest("essence"))` | same |
| `slime.move(x, y)` | walks there; waits until arrived | `true`, or `false` if too tired to move |
| `slime.eat()` | eats 1 Essence from the lab (one tick) | `true` if it ate |
| `slime.name = "…"` | renames it at once (new sim command `rename`, ≤ 16 chars) | — |
| `slime.hp / energy / hunger / x / y / name` | live values, refreshed every tick | — |
| `nearest("essence")` | as today; `null` when the field is empty | — |
| `console.log(...)` | Ref's log | — |

- When the program reaches the end: the slime idles and Ref says once that the program finished.
- Save again → the old program stops, the new one starts from line 1; hp/energy/hunger/position stay (they live in the world).
- A runaway loop with no actions in it is stopped by the interrupt handler (budget per tick) → timeout error, program stops, slime dizzy, Ref explains. Runtime errors stop the program the same way.
- Every action call costs Mana each tick it is in progress (it re-issues its command until done), like class mode.

### Engine

- Switch the sandbox to the QuickJS **asyncify** build (`@jitl/quickjs-wasmfile-release-asyncify`, replacing the sync build; class mode keeps using synchronous calls on the same module). Spike on 2026-10-19 confirmed: an asyncified host function can suspend the program across ticks, resume when the host resolves it, and the interrupt handler still stops `while (true) {}`. Disposal order needs care (the spike threw when freeing context before runtime).
- `src/sandbox/script.ts`: `ScriptRunner` — `start(js)`, `tick(input) → TickOutput`. Per tick: if the current action is done (judged from the snapshot + last tick's events), resolve it and let the program run to its next action (deadline-bounded); then emit the current action's command.
- The loop passes last tick's events to the brain (`Brain = (w, lastEvents) => …`) so the runner can see `gathered` / `ate` / `rejected`.
- Sim: `rename` command (validated: string, trimmed, 1–16 chars); `stats.renamed` count.
- Looks/traits in script mode come from the starter's element (no class to read them from).

## B. Act 1 quests (content/quests.json, in order)

| # | id | Goal (passes when…) | Teaches |
| --- | --- | --- | --- |
| — | tutorial | `slime.gather(nearest("essence"))` once (tutorial step "type") | method call |
| 1 | name-slime | a `rename` happened after the quest started | property |
| 2 | gather-5 | 5 gathered since start → lights on | statements in order |
| 3 | eat-when-hungry | ate ≥ 1 since start, code has `if` | variables + if |
| 4 | clear-field | the field reached 0 Essence since start, code has a loop | loops |
| 5 | gather-function | gathered ≥ 6 since start, code declares a function and calls it ≥ 2 times | functions |
| 6 | herd-10 | 10 creatures with unique names, code has a loop (class mode) | class + `new` + loop |
| 7 | new-element | subclass with a different element than its parent | extends (+ the morph moment) |

- Starter screen: drop the name field — naming is quest 1 in code, the GDD's "name appears above its head" moment. Starter gets a default name from `content/names.json`.
- Starter code (script mode):
  ```js
  // สั่ง slime ได้ที่นี่: โค้ดทำงานจากบนลงล่าง ทีละบรรทัด
  // พิมพ์ slime.gather(nearest("essence")) แล้วกด Ctrl+S
  ```
- Tutorial step "type" waits for `slime.gather(` or `slime.gatherNearest(` in code (comments ignored).
- Code features (`src/editor/features.ts`): add `functionReuse` (a declared function — `function f`, `const f = (…) =>` — whose name is called ≥ 2 times).
- Quest 6 hint introduces class mode: a class with `update()` and a loop of `new`. Ref explains the switch once: "ตอนนี้แต่ละตัวคิดเองทุก tick ด้วย update()".
- Update CLAUDE.md + GDD roadmap: phase 0 now covers act 1 → act 3 in one room; the morph moment is quest 7.

## Out of scope (next: the approved UI spec items 1–5 + status on the eyes)

Readability pass, banners/next-step, lab machines, notebook (API docs + lesson pages), resource explanations, hungry/tired faces.

## Testing

- Vitest (real QuickJS): script waits per action across ticks (3 gathers = 3 completions in order); loop of actions; function reuse; `if` on live `slime.hunger`; rename; error and runaway loop stop the program; save restarts from line 1 keeping stats; program end reported once.
- Vitest: new quest goals + features (`functionReuse` incl. arrow functions; comments ignored).
- Browser: fresh start → tutorial → quests 1–5 in script mode → quest 6 switches to class mode → quest 7 morph.
