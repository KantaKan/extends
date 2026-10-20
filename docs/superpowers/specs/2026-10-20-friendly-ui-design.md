# Friendlier UI, a lab with machines, an in-game notebook — design

Oct 20, 2026 · items 1–5 approved in chat (Oct 19) + "status on the eyes"

## Why

Feedback: text too small / hard to read, players don't know what to do next, the lab is empty, there is no in-game doc of the API, nobody knows what Essence / Mana / Crystal do, and you can't tell a hungry or worn-out slime by looking.

## 1. Readability
- Base 15→17px; HUD numbers 18px; Ref bubble 16px; tutorial instruction 18px; Thai body weight 500; muted text `#b4b6d6` (higher contrast).
- Quest card: bigger (title 18px), a progress bar instead of only `3/5`.

## 2. Always know what's next
- Banner in the middle of the screen for 2.2 s on "quest complete" (with pixel sparkles) and "new quest: …".
- Quest card has a button "เปิดเครื่อง DNA" (opens the drawer).
- Idle nudge: if the current quest hasn't moved for 30 s of play and the code hasn't been saved since, Ref says the quest's nudge line once (`quest.<key>.nudge`: direction, not the answer).

## 3. Lab machines (data: `content/lab.json`)
- **Hatchery** (back wall, left): `new` creatures hatch there (sim spawn point from the layout); queued creatures show as wobbling eggs in it; a crack burst when one hatches.
- **Essence well** (floor decal): new Essence appears within its radius (sim) with a sparkle, instead of anywhere in the room.
- **Generator** (back wall, right): dead and grey until quest "gather-5" lights the room, then spins and glows.
- **DNA terminal** (back wall, middle): clicking it opens the DNA machine; it blinks while the current quest needs code changes (always, outside the tutorial).
- Machines on the wall are outside the walkable floor; the well is a decal (walkable). Pixel patterns in `src/render/props.ts`.
- Sim stays pure: `createWorld(seed, layout)`; layout = hatchery + well positions/radius.

## 4. Professor Null's notebook (API doc in the game)
- A side panel inside the DNA machine (right of the editor, toggle). Data `content/notebook.json`, text in i18n.
- Page "Your slime" (script mode) / "Creature" (class mode): every property and method with a one-line Thai description and a tiny example.
- Page "Parts": `body`, `element`, `eyes`, `horns` with every valid value as a chip; clicking a chip shows a live preview creature (compose) — so players see options before typing them.
- Page "Resources": Essence / Mana explained.
- Lesson pages unlock when their quest is done: if/else, loops, functions, class + new, extends — written as the professor's notes ("why this exists").

## 5. Resources explained
- Hover/focus a HUD chip → small tooltip: what it is, where it comes from, what it's for.
- Mana chip flashes red on a tick that ran out of Mana; Ref says once "Mana หมด!…".
- Crystal hidden until research exists (phase 1).

## 6. Status on the face (GDD: eyes show state)
- Hungry (hunger > 70): a small food bubble above the head. Worn out (energy < 15): sleepy eyes + "z". Uses the existing eye patterns; overrides only the eyes, never the parts.

## Out of scope
Sound, second room, collisions with machines, saving the world state.

## Testing
- Vitest: layout spawn (hatch at hatchery, Essence within the well radius, deterministic); idle-nudge timer logic; notebook content keys all exist in th + en; status → eyes mapping.
- Browser: fresh start through the tutorial and quest 3 at normal size; check banner, nudge, machines, notebook chips preview, tooltips, Mana flash, hungry/tired faces.
