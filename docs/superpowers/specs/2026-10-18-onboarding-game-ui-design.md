# Onboarding + game-style UI — design

Oct 18, 2026 · phase 0 add-on, approved in chat with Fiafia

## Why

Playtest feedback: there is no onboarding (a new player doesn't know what to do or how), and the screen reads as an IDE, not a game. Goal: a beginner opens the game, picks a starter, and is guided to their first working line of code in under 2 minutes, on a screen that looks like a game.

Constraints kept from CLAUDE.md / GDD: desktop only; content is data (`content/`); UI text keyed in `content/i18n/{th,en}.json`; no explanation longer than 2 lines in the first 5 minutes; player code stays high-level (see memory: high-level player API).

## 1. Starter pick (first visit only)

- Full-screen overlay over the dark lab. Three slimes bounce side by side, drawn with the existing `compose()` (canvas, 4×):
  - **fire** — fast, hungry quickly
  - **water** — slow, gets hungry slowly
  - **earth** — slow, spends little energy
- Click one → it is selected (bigger, others dim) → a name field appears, pre-filled with a name from `content/names.json`. Button "ฟัก!" hatches it in the middle of the room.
- Link "เขียนโค้ดเป็นแล้ว · ข้ามบทสอน" skips the tutorial (still picks a starter).
- The editor's starter code is generated from the pick:
  ```ts
  class Slime extends Creature {
    element = "water"
    update() {
      // พิมพ์ this.gatherNearest() แล้วกด Ctrl+S
    }
  }

  hatch(Slime)
  ```
  The name lives in the world (the starter creature is spawned with it; `hatch(Slime)` matches it by order, so the name survives).
- Starters are data: `content/starters.json` = `[{ element, nameKey, blurbKey }]`.

### Element personality (sim)

Every creature's element (from its class's looks) changes its numbers. Data in `content/elements.json`:

| element | speed × | hunger × | move energy × |
| --- | --- | --- | --- |
| none | 1 | 1 | 1 |
| fire | 1.4 | 1.6 | 1 |
| water | 0.75 | 0.6 | 1 |
| earth | 0.8 | 1 | 0.5 |
| air, void | 1 | 1 | 1 (phase 0) |

- Sim gets a `traits: Record<className, {speed, hunger, moveEnergy}>` on the world, set on every successful save (from species looks). Unknown class → all 1. Stays deterministic (data in world state).

## 2. Game-style main screen

- Pixi lab fills the window (room scales to the largest whole number that fits; target 4×).
- **HUD** (top bar, pixel-styled chips): Essence / Crystal / Mana, speed buttons (หยุด 1x 4x 16x).
- **Quest card**: top-left, over the room edge (already exists; restyle).
- **Ref**: small pixel robot portrait bottom-right with a speech bubble showing the latest 1–3 lines (errors in the error colour). Clicking the portrait toggles the full log panel (the current console, as a popover).
- **Creature card**: click a creature → small card next to it: name, class, element, live hp / energy / hunger bars. Click empty floor or Esc closes it.
- **DNA machine** (code drawer): slides up from the bottom, ~45% height; title bar "เครื่อง DNA · Ctrl+S ส่งโค้ด · Esc ปิด". Monaco inside, lab theme. The lab keeps running above it.
  - Open: Tab (when focus is not in the editor) or click the drawer handle. Close: Esc (works inside the editor), Tab outside the editor, or the handle.
- Monaco stays mounted while closed (keeps undo history and the model).

## 3. Tutorial: Ref walks you through

Steps are data in `content/tutorial.json`: `{ id, textKey, waitFor, pointAt }`. A pure state machine `src/ui/tutorial.ts` takes UI events and returns the next step; React renders the current step as Ref's bubble + a bouncing arrow at `pointAt`.

| # | Ref says (≤2 lines) | waitFor | pointAt |
| --- | --- | --- | --- |
| 1 | นี่คือ {name}! คลิกมันดูสิ | `clickCreature` | creature |
| 2 | มันยังไม่รู้จะทำอะไร เปิดเครื่อง DNA (Tab) | `openDna` | dna-handle |
| 3 | พิมพ์ `this.gatherNearest()` ตรงบรรทัดที่กระพริบ | `typed` (editor text contains `gatherNearest()`) | editor-line (Monaco decoration on the comment line) |
| 4 | กด Ctrl+S ส่งโค้ดเข้าตัวมัน | `saved` (a successful load) | none |
| 5 | ปิดเครื่อง (Esc) แล้วดูมันทำงาน | `closeDna` | dna-handle |

- After step 5 the tutorial ends and the quest card appears (quests are hidden during the tutorial).
- Errors during steps 3–4 are explained by Ref as usual; the step doesn't advance until a successful save.
- Progress (`starter picked`, `tutorial done`) is remembered in localStorage (wrapped in try/catch). On reload with a finished tutorial: skip the starter screen, spawn the remembered starter (element + name), load the saved draft.

## 4. Quest 3 change

"Make FireSlime" teaches nothing if the starter is already fire. New goal: **a creature whose class extends another player class and has a different element from its parent**.

- `content/quests.json`: `{ "type": "subclass", "changes": "element" }`.
- Hint names an element other than the starter's: starter fire → `WaterSlime` / `"water"`, otherwise `FireSlime` / `"fire"` (hint text gets `{cls}` and `{element}`).

## 5. Out of scope

Opening "glory days" cinematic, sound, professor's notebook pages, Ref's face emotions, saving world state.

## Testing

- Vitest: tutorial state machine (each event advances only the matching step; wrong events ignored); element traits in sim (fire walks farther per tick and gets hungry faster than none; unknown class = defaults; determinism); new quest 3 goal (same element as parent doesn't count).
- Browser: play from a clean localStorage through starter pick → tutorial → quest 1; reload and check the tutorial doesn't repeat.
