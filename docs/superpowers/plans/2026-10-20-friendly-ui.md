# Friendly UI + lab machines + notebook — plan

> Native in-session (user: "k"). Spec: `docs/superpowers/specs/2026-10-20-friendly-ui-design.md`

## Review focus
1. Hatchery/well positions must stay inside the room for any layout in `content/lab.json`.
2. The idle nudge must not fire during the tutorial, after the last quest, or right after a save.
3. Tooltips must work by keyboard focus, not only hover.
4. Notebook chip previews must not leak canvases/RAF loops when the panel closes.
5. Clicking the DNA terminal must not also select/deselect a creature underneath.

## Tasks
- [x] 1. Sim layout: `createWorld(seed, layout)`, hatch at hatchery, Essence within well radius; tests.
- [x] 2. Readability CSS; quest card progress bar + "open DNA" button.
- [x] 3. Banner (quest done / new quest); idle nudge (pure helper + test).
- [x] 4. HUD tooltips; Mana flash + Ref line; hide Crystal.
- [x] 5. Status on the face (hungry bubble, sleepy eyes); test the mapping.
- [x] 6. Lab props: hatchery + eggs, well, generator, DNA terminal (click → drawer).
- [x] 7. Notebook panel: API pages per mode, parts chips with live preview, resources, lesson pages unlocked by quests; i18n keys test.
- [x] 8. Browser pass.
