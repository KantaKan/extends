# Progression: a lab worth growing — design

Oct 20, 2026 · approved in chat ("จัดไป"). Goes beyond the GDD phase-0 checklist on purpose: playtest showed the lab has no goals once quests settle ("slimes just fight over small food, nothing to upgrade").

## The loop

Creatures gather **Essence** → spent on hatching, eating and **machine upgrades**. **Orders** on the wall pay **Crystal** → spent on **research** (new body parts) → new looks → **species codex**. Rare **golden Essence** adds bursts of urgency.

Built in rounds: **R1 = save + orders**, R2 = research, R3 = machine upgrades, R4 = golden Essence, R5 = codex.

## R1a. Saving the lab
- Everything the player builds survives a reload: world (creatures, Essence, resources, pending, stats), quest index + its baselines (`since`, meals at start), lights, orders, Crystal, unlocks, progress (starter, tutorial).
- IndexedDB (CLAUDE.md: save = IndexedDB on web), one record `"lab"`; written every 5 s of play, on quest/order change and on `pagehide`. Wrapped so a blocked/failed IndexedDB just means "no save" (game still plays).
- On start the game shows the lab only after the save has loaded (a short "loading the lab…" screen).
- A version number in the record; an unknown/old version starts fresh (phase 0: no migrations).
- "Start over" button in the Ref log panel (with a confirm), clears save + draft + progress.

## R1b. Orders board
- A board machine on the back wall, powered by the generator: appears when the lights come on (quest gather-5).
- Up to 2 active orders. Each has a goal, a time limit and a Crystal reward. Done in time → Crystal + banner; expired → it fades, a new one comes after a short break.
- Templates in `content/orders.json`, each with `minQuest` (unlocks with progress) and a difficulty:
  - `gather`: gather N Essence within T s
  - `feed`: N different creatures eat within T s
  - `herd`: have N creatures at once (within T s)
  - `element`: have N creatures of element E (within T s)
- Next template = deterministic cycle through the unlocked ones (no RNG), so a save replays the same.
- Pure logic `src/sim/orders.ts` (like quests: world + context in, progress out) with tests; UI `OrdersCard` under the quest card (title, progress bar, time bar, reward).
- Crystal comes back to the HUD once the board exists, tooltip: "from orders; used for research (soon)".

## R2–R5 (next rounds, summary)
- **R2 research:** Crystal unlocks parts (bodies, eyes, horns, elements air/void). Locked values in code → Ref says so, default part drawn. Notebook parts page shows lock + price.
- **R3 upgrades:** Essence buys 3 levels each: well (faster/more Essence), generator (Mana 20→30→45), hatchery (cheaper hatching). Machines look bigger per level.
- **R4 golden Essence:** rare, worth 5, vanishes after 15 s; `nearest("golden")`.
- **R5 codex:** discovering a new parts combo names a species (morph-lab nickname) with a banner; codex page with silhouettes of the undiscovered.

## Testing (R1)
- Vitest: save round-trip (world + quest state) through the serializer; version mismatch → fresh; orders: each goal type, expiry, reward once, deterministic next order, `minQuest` filter.
- Browser: play to the lights, see the board, finish an order (Crystal goes up), reload → same lab, same quest, same orders.
