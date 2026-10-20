# Onboarding + game-style UI — implementation plan

> Executed natively in-session (user: "ทำเลย"). Checkboxes track progress.

**Goal:** starter pick + Ref-guided tutorial + full-screen game UI with a DNA-machine code drawer.
**Spec:** `docs/superpowers/specs/2026-10-18-onboarding-game-ui-design.md`
**Stack:** existing (React, Pixi, Monaco, QuickJS, Vitest).

## Global constraints
- Desktop only; all UI text via `t()` keys in `content/i18n/{th,en}.json`; content in `content/*.json`.
- Tutorial text ≤ 2 lines per step. Player API stays high-level.
- localStorage access always wrapped in try/catch.

## Review focus
1. Pressing Tab inside Monaco must indent, not close the drawer; Esc inside Monaco closes it.
2. Reload after tutorial: no starter screen, same element + name, saved draft loads.
3. Player edits away the tutorial comment line before step 3 → step 3 still completes when `gatherNearest()` appears anywhere.
4. Save errors during tutorial don't advance step 4.
5. Clicking a creature that gets removed by a reload closes its card instead of crashing.

## Tasks

### 1. Element traits in sim
- [x] `content/elements.json` (speed / hunger / moveEnergy multipliers).
- [x] `World.traits: Record<string, Traits>`; `stepTowards`/`updateNeeds` take traits; `tick.step` looks them up by className (default all 1).
- [x] App sets `world.traits` on each successful save from species looks.
- [x] Tests: fire walks farther + hungrier than none; unknown class = defaults; determinism test still passes.

### 2. Quest 3 = subclass that changes element
- [x] `quests.json` goal `{ "type": "subclass", "changes": "element" }`; `ClassInfo` carries parent element via lookup.
- [x] Hint gets `{cls}`/`{element}` from the starter element (fire → Water, else Fire).
- [x] Tests: same element as parent doesn't count; different does.

### 3. Tutorial state machine
- [x] `content/tutorial.json` (5 steps), `src/ui/tutorial.ts`: `advance(stepIx, event) → stepIx`; events `clickCreature | openDna | typed:<text> | saved | closeDna`.
- [x] Tests: each step advances only on its event; `typed` needs `gatherNearest()`; end state.

### 4. Starter pick screen
- [x] `content/starters.json`; `src/ui/StarterPick.tsx` with canvases drawn by `compose()`; name field prefilled; skip link.
- [x] `src/ui/progress.ts`: load/save `{ starter: {element, name}, tutorialDone }` in localStorage.
- [x] Starter code generated from element (`starterCode(element)` in `src/editor/starter.ts`).

### 5. Game-style layout
- [x] Full-screen lab; HUD chips; quest card restyle; Ref portrait + bubble (latest 3) + log popover.
- [x] DNA drawer (always mounted, slide via CSS transform); Tab/Esc/handle; Monaco `Esc` command closes.
- [x] Creature click → card with live bars (Lab emits `onPick(id | null)`; card polls world each HUD tick).

### 6. Wire tutorial into App + Monaco line highlight
- [x] Tutorial arrow targets; editor decoration on the comment line during step 3; quests hidden until done.

### 7. Verify
- [x] `npm test`, `tsc`, `vite build`; browser run from clean localStorage through quest 1; reload check.
