# System patterns

Status: a published static app implements RunSession commands, a plain CombatSimulation, IndexedDB profiles, a Canvas 2D camp, Phaser battle, and DOM overlays. [ARCHITECTURE.md](../ARCHITECTURE.md) still describes a fuller module split and mission resume; do not treat unbuilt pieces as present.

## Implemented

- One Vite SPA published to GitHub Pages. Camp and battle art are Canvas/Phaser; math, reward, loot, shop, and pause are semantic HTML.
- `RunSession` is the command coordinator. Views send commands and render after durable commit. Stable command IDs prevent duplicate settlement.
- `combat-rules.ts` owns serializable simulation. Phaser (`combat.ts`) renders and feeds input. Camp (`base-camp.ts`, `camp-world.ts`) is a separate 2D walkable hub.
- `indexeddb.ts` + `persistence.ts` store cadet profiles and practice history. Missions are disposable: portal entry always starts wave one; camp exit or reload drops the run. Pause still holds the live session.
- Correction follows the initial five answers and blocks reward until complete. Empty miss lists go to reward. Loot must be accepted or sold before shop/next wave; the final wave skips that intermission into victory.
- Offline: hashed manifest + service worker. Saved historical runs can pin a release; current play does not resume a mission after leaving camp. Offline install must not block arena entry.
- Touch and keyboard reach the same commands. Production hides QA (wave jump, skip quiz). Phones/tablets are landscape-only.
- Balance and catalogs live under `content/balance/`. Glossary terms come from [CONTEXT.md](../../CONTEXT.md).

## Remaining / exploratory

- Full ARCHITECTURE RunSession isolation of every catalog/learning module.
- Mission Save & Exit (explicitly superseded).
- V2 3D street-level town (proposal only; camera direction confirmed).
- Owner-managed Mars visual-style ticket and integrated-MVP ticket (#5, #23).

Regression tests cover combat, quiz grades, shop/ammo/forge, luck, camp/arena bounds, offline worker policy, profile transfer/leases, and audio wiring. Published HTTPS/device loops still need live checks. Historical `design_checks.py` formulas are not current tests.
