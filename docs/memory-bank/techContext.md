# Technical context

Observed September 18, 2026.

- Git remote: `https://github.com/hyetigran/math_on_mars.git`. Published site: https://hyetigran.github.io/math_on_mars/
- Stack: strict TypeScript, Vite `7.3.6`, Phaser `4.2.1`, pnpm `12.4.1`. Node 22 in CI. Three.js is **asset tooling** (sprite baker), not the game runtime.
- Commands: `pnpm dev`, `pnpm test` (`scripts/test.mjs`, 30 `tests/*.test.ts` files), `pnpm build` (version stamp + `tsc` + Vite + offline manifest), `pnpm preview`, `pnpm format` / `format:check`.
- Deploy: `.github/workflows/deploy-pages.yml` formats, tests, builds, and publishes `dist/` on `main`. Vite `base` is relative so the Pages subdirectory and service worker work. HTTPS is required for offline. See [DEPLOYMENT.md](../DEPLOYMENT.md) and [OFFLINE.md](../OFFLINE.md).
- Persistence: IndexedDB profile envelopes, one-time localStorage migration, leases for conflicting tabs, export/import. Fake-indexeddb is a test/dev dependency.
- Assets: finalized families under `src/assets/`. Historical generation lives in sibling `../tmp_assets`. Prepare scripts regenerate runtime WebP/MP3/sprites from in-repo masters.
- Fonts: Oxanium + Atkinson Hyperlegible Next, bundled and offline-packed.
- Production UI: landscape lock on phones/tablets; QA controls compile out. Arena-entry and production-ui browser scripts exist for local preview checks.

## Source map

- `src/main.ts`: screens and camp/arena chrome.
- `src/session.ts`: committed run commands.
- `src/combat.ts` / `src/combat-rules.ts`: Phaser view and plain simulation.
- `src/base-camp.ts` / `src/camp-world.ts`: walkable hub.
- `src/indexeddb.ts` / `src/persistence.ts`: profile I/O and validation.
- `src/questions.ts`, `src/shop.ts`, `src/ammo.ts`, `src/forge.ts`, `src/modules.ts`, `src/luck.ts`.
- `content/balance/`: live combat, ammo, enemies, missions, luck, status, chain.

## References

- [CONTEXT.md](../../CONTEXT.md): implemented vocabulary and presentation.
- [GAME_PLAN.md](../GAME_PLAN.md): original product rules (stale “unimplemented” / no-hub lines).
- [ARCHITECTURE.md](../ARCHITECTURE.md): planned contracts.
- [BALANCE.md](../BALANCE.md), [AUDIO_AUDIT.md](../AUDIO_AUDIT.md), [ART_ASSET_CHECKLIST.md](../ART_ASSET_CHECKLIST.md).
- [V2_TOWN_BUILDER_PLAN.md](../V2_TOWN_BUILDER_PLAN.md): exploratory town; street-level camera confirmed.
- Goblin Gutter: arena proportions, wave timers, shop/loot feel.
- WizardGenie: still the generation workflow for leftover art.

`QUIZCASTER_REFERENCES.md` and `DESIGN_VALIDATION.md` remain superseded for scoring. `docs/design_checks.py` is historical.
