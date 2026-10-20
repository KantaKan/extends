# Extends

Free coding game that teaches JavaScript/TypeScript OOP. The player writes `class` code; creatures in a lab are built from that code (looks + behaviour) and then run on their own. Full design: `docs/GDD.md` (Thai). Art prototype: `reference/morph-lab.html`.

## Current phase: 0 — Prototype

Goal: prove the "morph moment" is fun. Type `class FireSlime extends Slime`, press save, and watch the creature change live. Do not build anything outside the phase-0 checklist in `docs/GDD.md` (Roadmap section) without asking.

Phase 0 starts from plain JavaScript (decided Oct 19, 2026): act 1 is **script mode** — no class in the file, one global `slime`, the file runs top to bottom and each action waits until it's done (QuickJS asyncify, `src/sandbox/script.ts`). Quests teach method call → property → order → if → loop → function, then class + `new` (class mode, `update()` per tick) and extends (the morph moment). Players write every concept themselves: never add a helper that does a lesson for them. Specs: `docs/superpowers/specs/`.

Pass condition: a tester keeps playing on their own for 15+ minutes.

## Platform

- Desktop only (keyboard required). Web browser first, Steam (Electron) later. **No mobile** — don't add touch UI or responsive mobile layouts.

## Stack (decided)

| Layer | Choice |
| --- | --- |
| Language / build | TypeScript (strict) + Vite |
| Game world | PixiJS (WebGL 2D), pixel art 32×32, nearest-neighbour scaling |
| Editor | Monaco + TS language service; per-phase `.d.ts` hides locked APIs |
| Player-code sandbox | QuickJS (wasm) inside a Web Worker |
| TS → JS | `ts.transpileModule` (or esbuild-wasm) on every save |
| Feature locks | TypeScript Compiler API walks the AST; locked syntax = error with line number |
| UI panels | React |
| Simulation | Fixed tick 10/s, seeded RNG — must be deterministic |
| Save | IndexedDB (web); Steam Cloud later |
| Desktop (later) | Electron + steamworks.js |

## Architecture rules

- **Player code never touches world state directly.** Each tick: simulation sends creature snapshots into the Worker → QuickJS calls every creature's `update()` → returns a list of commands (`move`, `eat`, `gather`, …) → simulation validates and applies them → Pixi draws.
- Infinite loops are stopped by a QuickJS interrupt handler; each command costs Mana (per-tick budget).
- The simulation is pure and deterministic (same seed + same code = same result) so runs can be replayed.
- **Content is data, not code:** quests, parts, species recipes, fusion table and Ref's lines live in JSON under `content/`. UI text is keyed and lives in `content/i18n/th.json` and `en.json`.
- Auto-save player code 2 s after typing stops; keep the last 20 versions per class.

## Art system (see GDD "Art system" + `reference/morph-lab.html`)

- A creature = body + parts. Each **body** declares anchors (head centre / inner / outer, eye line, back, rear, feet) and its shape. Each **part** declares only its slot and draw layer. Adding a body or a part must work with every existing part/body with no special cases.
- Parts take colours from the body's palette roles (base / light / shade / outline), never fixed colours — except accessories.
- Cuteness rules: one item per head slot; head budget 3 points; nothing draws over the eyes; every part must read at 1× (32px).
- `reference/morph-lab.html` is a working prototype of this system (canvas, pattern strings). Port its logic and look; in the real game, parts become PNG sprite sheets (Aseprite) + JSON metadata.
- Element fusion: two elements make a new element with its own palette + effect (table in GDD). Order must not matter (`Fire+Water` = `Water+Fire`).

## Code style

- Small modules, no god classes (the game's villain is literally a 5,000-line class).
- Keep engine (`src/sim`), sandbox (`src/sandbox`), rendering (`src/render`), editor (`src/editor`) and UI (`src/ui`) separate.
- Unit-test the simulation and the fusion/recipe lookup with Vitest.

## Language

The designer (Fiafia) writes in Thai. Reply in Thai unless asked otherwise; code, identifiers and comments in English.
