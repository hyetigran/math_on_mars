# V2 town builder: discussion proposal

Status: exploratory recommendations, except the user-confirmed requirement for a true behind-character street-level camera. September 17, 2026. This does not supersede CONTEXT.md or change the current game.

## Product direction

Build a compact, walkable Martian settlement whose construction and farming continue between visits. Math practice accelerates projects that the learner chooses. The emotional goal is returning to a place the player has helped grow, then walking through it.

Treat three design questions separately: the town economy, the layout/building system, and the camera/asset system. Idle timers do not require 3D. A genuine street-level camera strongly favors a 3D town.

## Current implementation evidence

- `src/base-camp.ts` draws the camp background and directional marine sprites using Canvas 2D, separately from combat.
- `src/camp-world.ts` defines a fixed artwork-sized world, camera transforms, and polygon-based movement constraints.
- `package.json` includes Phaser for gameplay and Three.js as a development dependency. `scripts/sprite-baker/render.html` already loads GLTF models and renders with an orthographic camera; this is asset tooling, not an existing 3D game runtime.
- `src/types.ts` has per-cadet profiles and practice history, but no town state. Town persistence must be introduced deliberately and kept independent from disposable mission progress.
- CONTEXT.md takes precedence over older planning text about mission restoration or the absence of a hub.

## Camera decision

The user confirmed a true behind-character street-level camera during this discussion. Option 2 below is therefore the recommended prototype direction; option 1 describes the tradeoff only.

1. Fixed elevated view, including close-up character walking: Phaser with layered sprites is a viable route. Drawn assets or sprites baked from 3D models can both work. Zoom cannot reveal building surfaces absent from a sprite.
2. Elevated building view plus a true behind-character street view: use a shared 3D town with an orthographic overview camera and a perspective walking camera. Prototype Three.js or Babylon.js for the town while retaining Phaser combat and HTML math screens.
3. A wholesale engine migration is a separate decision. Evaluate only if a dedicated editor and expanded 3D ambitions justify the migration cost.

See [engine research](research/v2-town-builder-engine-research.md) for official sources and limitations. No engine choice is final before testing the narrow-street prototype on target devices.

## Town character and placement

Choose a specific architectural reference before commissioning art. Proposed starting direction: a Mediterranean hill town inside a pressurized habitat, with Martian stone, warm plaster, attached houses, lanes, courtyards, greenhouse gardens, and restrained utility infrastructure. The habitat is a fiction choice that explains exposed greenery and unsealed streets.

Start with authored lanes and buildable lots. Let players choose building use, facade, upgrades, gardens, and decorations. This gives strong composition without requiring a freeform road editor immediately. Keep building placement data separate from presentation so later editable streets remain possible, but do not assume that upgrade is trivial.

If freeform placement becomes a requirement, include building footprints, street-facing entrances, reachable paths, corner pieces, and attached-wall rules. Large detached square buildings with mandatory gaps will work against the intended town form.

Prototype roof hiding/fading in the overhead view and camera collision in street view. Both must work in the same narrow alley. Test touch controls and readable building selection.

## Practice and idle economy

Proposed loop: choose a project → begin construction → complete a short practice set → apply an earned time reduction → see construction progress → use the completed building → select another project.

- Construction advances without practice; learning creates a meaningful acceleration.
- Use fixed earned time reductions initially, rather than stacking speed multipliers.
- Illustrative tuning only: a 30-minute greenhouse, five minutes of natural progress, then a 10-minute practice credit leaves 15 minutes. Test these numbers with actual sessions before adopting them.
- Credit completion including corrections. Keep first-attempt accuracy in learning history, but avoid using the battle quiz's speed ranking as the default town reward rule.
- Award each qualifying completion once. Do not pay extra for repeated retries of the same occurrence. Choose how difficulty-appropriate practice is selected before opening unlimited credit farming.
- Let earned credit wait for a chosen project if nothing is building; define any cap and excess-credit behavior clearly.
- Begin with one builder, one crop, and one simple resource chain. Keep planting and harvesting enjoyable and avoid crop death during absence in the initial design.
- Keep town resources distinct from mission salvage until permanent versus run-scoped rewards are deliberately specified.
- Start with generated in-game practice. Real homework import, answer evaluation, assignments, and completion verification are a separate product scope.

## Persistence and simulation

Store town layout, building states, crop states, construction deadlines, resources, and claimed practice reward IDs per cadet. Keep rules independent of the rendering engine. Both cameras read one town state.

Use saved completion timestamps and reconcile on return. Do not depend on a continuously running browser timer: browsers throttle timers and usually suspend animation callbacks in hidden tabs ([MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)). Store reward issuance and town effects together so a reload or retry cannot duplicate a benefit.

For the current personal-use offline game, local saving and device time are a reasonable starting policy. Specify backward clock changes, large forward jumps, and maximum offline production. Device time is not tamper-proof. Shared worlds, authoritative timing, verified assignments, or cross-device synchronization would require a separate backend design.

## Asset scope

For true street level, use stylized 3D building exteriors, terrain, props, and an animated character. A reusable kit should include straight/corner houses, roofs, doors/windows, paving, stairs, planters, a greenhouse, and construction scaffolding. Standardize dimensions, ground pivots, door locations, collision footprints, and materials.

Model visible backs and sides. Do not commission fully furnished interiors initially. Use simple construction stages rather than bespoke assembly animation for every building. Existing marine models are candidates for reuse, subject to rig, animation, style, and runtime performance inspection.

## Staged validation

1. **Camera and place:** one small plaza, one narrow alley, three placeholder buildings, and the marine. Compare overview and intended walking view. Gate: movement, camera occlusion, selection, and touch controls feel good on a target phone/tablet.
2. **Learning loop:** one greenhouse with persistent construction and a practice credit. Gate: credit is understandable and satisfying; reload/backgrounding produces correct progress with no duplicate grant.
3. **Art proof:** finish one street corner in the intended style. Gate: it reads well from both cameras and establishes a repeatable asset pipeline before a large art order.
4. **Small playable neighborhood:** a handful of lots, one crop cycle, basic decoration, saved layout, and the existing mission portal. Gate: returning, practicing, building, and walking form a coherent repeatable experience.
5. **Expansion after evidence:** additional districts, editable streets, NPC schedules, more crops, production chains, or interiors individually, rather than all at once.

The true street-level camera is confirmed. Remaining decisions: authored lots versus free placement; in-game practice versus actual imported homework; personal cadet towns versus a shared town. These are proposals, not implementation commitments.
