# Act 1 script mode — implementation plan

> Executed natively in-session (user: "k go"). Spec: `docs/superpowers/specs/2026-10-19-act1-script-mode-design.md`

## Review focus
1. Save while the program is waiting on an action → old program stops cleanly, new one starts (no "already suspended" crash, no leak).
2. `while (true) { slime.gather(nearest("essence")) }` on an empty field → each call returns false instantly → must hit the interrupt, not hang the worker.
3. `slime.hunger` read right after an action returns must be the fresh value, not the one from program start.
4. Switching the same file from script → class mode keeps the starter (same id, stats) as the first `new Slime()`.
5. An action that can never finish (target vanished, too tired) must resolve `false`, never wait forever.

## Tasks
- [x] 1. Sim: `rename` command + `stats.renamed`; tests.
- [x] 2. Sandbox on the asyncify module (class mode unchanged); existing tests green.
- [x] 3. `ScriptRunner` + script prelude; loop passes last events; worker picks mode per load; tests (spec list).
- [x] 4. Quests 1–7 content + goals + `functionReuse`; tutorial/starter code/starter screen (no name field); i18n.
- [x] 5. App wiring (mode, looks/traits from starter in script mode, Ref "program finished").
- [x] 6. Browser run: tutorial → quests in script mode → class mode → morph. CLAUDE.md + GDD roadmap note.
