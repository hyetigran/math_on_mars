# Progress

Snapshot: September 18, 2026. Personal MVP on `main`, published at https://hyetigran.github.io/math_on_mars/.

## Complete

- Planning docs, glossary, WizardGenie prompt pack, and agent-skills setup (`AGENTS.md`, `docs/agents/`).
- Vite/TypeScript/Phaser 4.2.1 app with pnpm 12.4.1; GitHub Pages deploy workflow.
- Walkable camp hub, splash, portal grade/mission setup, landscape-only production phones.
- Arena combat: Drifter/Spitter/Charger/Splitter/Overmind, wave timers, loot chests, luck, pause, med-gel, desktop keyboard and mobile touch.
- Between-wave quiz (K–5), 30-second shared countdown, correction-before-reward, loot decisions, shop/inventory/merge/forge.
- IndexedDB profiles, practice history, export/import, tab leases, backup recovery. Missions themselves are not resumable after leaving camp.
- Offline service worker and pinned historical packs; install does not block arena entry.
- Installed game art under `src/assets/` (camp v3, 4K arena, marine, enemies, items, UI, music/SFX).
- Camp/battle/boss music and combat/quiz/interface SFX (see [AUDIO_AUDIT.md](../AUDIO_AUDIT.md)).

Draft tickets 1–15 and 17–19 shipped as PRs #1–#3 and #24–#35, #37–#39. Issues #4 and #6–#22 are closed.

## Not implemented / owner-held

- Ticket 16 / issue #5 / draft PR #36 (Mars visual style remaining owner work).
- Ticket 20 / issue #23 (integrated personal MVP extras; depends on art ticket).
- Quiz/shop music beds.
- Spoken question/equipment packs (removed by CONTEXT; text/visual only).
- V2 town builder (proposal; street-level camera confirmed, no runtime).
- Grade 6 track (retired).

## Verification status

`pnpm test` covers 30 test files (combat, grades, shop/ammo/forge, luck, camp/arena bounds, offline worker, profiles, audio). `pnpm build` and Prettier run in deploy CI. Local production-preview scripts exist for arena entry and production UI.

Not verified on a connected physical device in this bank: published HTTPS first-install, multi-tab lease, audible autoplay unlock, and a complete Standard ten-wave run on a phone. Historical Python calculations do not verify current rules.

## Open implementation details

- White reward magnitude and other `content/balance/` tunings stay provisional.
- CONTEXT supersedes GAME_PLAN on hub, mission resume, correction order, Grade 6, caches, and speech.
- Remaining Pulse Blaster inventory-icon derivative and any owner art punch-list items live in [ART_ASSET_CHECKLIST.md](../ART_ASSET_CHECKLIST.md).
