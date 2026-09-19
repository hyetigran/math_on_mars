# Art assets still needed

Asset locations updated September 17, 2026: finalized masters and runtime files are grouped under `src/assets/`; historical art and references are in the sibling `../tmp_assets` archive. See [asset layout](../src/assets/README.md) and [relocation manifest](ASSET_RELOCATION.json). Historical generation notes below are retained.

Audited September 16, 2026 against retained art in `../tmp_assets/`, animation sources in `assets/`, installed art in `public/game/camp/`, the current renderer, and the item catalog. Unchecked entries have no dedicated finished asset identified in those locations. This is a production checklist, not a claim that every entry requires image generation: simple UI shapes and effects can be drawn in code.

## 1. Items, tools, and pickups — first generation batch

Finalization: all 18 item source images are owner-approved and have been moved to `src/assets/items/` with stable filenames. [Final asset manifest](../src/assets/items/manifest.json) and [URL exports](../src/assets/index.ts) are authoritative. The historical generation paths below now retain prompts and galleries, whose image links point to the final files. Runtime wiring is complete: see `src/game-art.ts`, `src/game-art.css`, and `src/combat.ts`.

Tools/trinkets update: all seven utility/module source icons generated in `../tmp_assets/06_items/trinkets/` using the owner-approved ammo v002 style and subsequently approved by the owner. See [gallery and 48 px previews](../../tmp_assets/06_items/trinkets/review-v001.html). The seven corresponding rows below now describe generated sources; runtime integration is complete.

Healing/loot update: med-gel, med-kit, salvage bundle, and closed/open supply chest sources generated in `../tmp_assets/06_items/healing_loot/`. See [gallery and 48 px previews](../../tmp_assets/06_items/healing_loot/review-v001.html). All 18 static images in this first batch now have source artwork. Optimized runtime exports and integration are complete. The derived blaster inventory icon remains pending.

Update: all six ammo source icons generated September 16, 2026 in `../tmp_assets/06_items/ammo/`. Exact prompts and provenance are in `generation.json`. Runtime integration is complete; the six ammo rows below now describe generated sources.

Revision 2: all six icons now also have `_v002.png` versions with simplified shading, heavier outlines, and fewer casing details. See [comparison previews](../../tmp_assets/06_items/ammo/review-v002.html) and [revision prompts](../../tmp_assets/06_items/ammo/generation-v002.json). Original versions are retained.

| Asset | Deliverable / notes |
|---|---|
| Piercing ammo | One cartridge icon; pointed penetrator silhouette |
| Multi Shot ammo | One cartridge icon; fanned tips |
| Electric Chain ammo | One cartridge icon; linked conductor motif |
| Frost ammo | One cartridge icon; ice crystal motif |
| Fiery ammo | One cartridge icon; flame core |
| Legendary Omni ammo | Distinct fused cartridge combining five motifs; gold crest |
| Ammo Expander | Feed adapter with four sockets; utility item, no rarity ladder |
| Overclock Chip | Processor / circuit icon |
| Shield Capacitor | Shield-shaped canister icon; represents a passive module, not a separate shield resource |
| Thruster Coupler | Paired thruster icon |
| Med-service Module | Medical equipment icon; visually distinct from consumable healing |
| Targeting Module | Sensor / reticle icon |
| Salvage Module | Collection magnet icon |
| Health potion / med-gel | Science-fiction healing canister master and inventory/pickup export |
| Med-kit | Distinct medical pack master and quick-use/shop icon |
| Salvage | Scrap/currency bundle master and small HUD icon |
| Supply chest / cache | Matching closed and open views; optional opening animation later |
| Pulse Blaster inventory icon | Derive from the retained Twin Rail v002 master; regenerate only if it does not read clearly at icon size |

The first batch is **18 new static images**: six ammo, seven module/utility icons, two healing items, salvage, and two chest states. The blaster icon is an additional derivative export.

Use the six module-family icons across the 18 authored stat variants. Use one base image per normal ammo type, with runtime White/Green/Blue/Purple labels and pips; no need to generate twenty cartridge pictures. Reuse item masters for world pickups and inventory where the view remains readable.

The current implementation calls its med-kit quick-use button “MED-GEL”; it does not establish two separate healing mechanics. Med-gel is used in the shop; the medical pack marks the same healing consumable in the combat quick-use control. No separate wrench, mining tool, or tool inventory is specified; such tools would be optional additions.

## 2. UI kit — integrated

All 14 UI masters and 19 SVG glyphs are finalized under `src/assets/ui/`. Trimmed WebP exports live in the corresponding item/UI `runtime/` folders. The game uses CSS border slicing for frames, inline SVG glyphs and live text/controls. [UI gallery](../../tmp_assets/07_ui/review-v001.html) and [runtime mapping](../src/assets/README.md).

- [x] Reusable panel frame: large console/modal and compact inset styles, with stretchable edges or nine-slice exports.
- [x] Reward/shop/cache card frame, with space for icon, name, modifiers, price, and action.
- [x] Item slot frame: empty, occupied, selected/equipped, and unavailable states.
- [x] Rarity treatments: white, green, blue, purple, and legendary crest. Keep labels and pips live in the UI.
- [x] Button skins: primary, secondary, and icon button; default, hover/focus, pressed, and disabled states.
- [x] Combat HUD frames: Suit Integrity health bar, salvage art, active ammo slots, and med-kit control. Existing wave text remains live; a dedicated boss HUD is not part of this asset integration.
- [x] Math console frame, answer-field treatment, keypad treatment, five-question progress, and countdown/rarity rail.
- [x] Shop/loadout panel treatments, ammo reserve slots, merge preview, and five-ingredient Omni forge layout.
- [x] Hint / item-details panel and dialog button treatment.
- [x] Small icon set: health, armor, damage, attack speed, projectile speed, movement, pickup radius, healing, pause, close, back, settings, confirm, reroll, equip, merge, forge, and lock.
- [x] Touch joystick base/knob and med-kit button treatment.
- [x] Mission/track selection dialog frame, victory badge, and defeat badge.

These are reusable components, not a request to generate a full flattened image of every screen. Generate decorative frame elements where helpful; draw simple glyphs, bars, pips, focus rings, and state colors in SVG/CSS. Keep all text and math outside generated art. Allow portrait and landscape layouts.

## 3. Character and enemy animation gaps

- [ ] Marine combat idle / ready pose with the approved weapon.
- [ ] Marine firing/recoil, hit reaction, and suit-power-down defeat.
- [ ] Audit existing armed run clips and v004/v005 walk/run sheets before requesting more locomotion. Source material exists; coverage and production readiness are not established by file presence.
- [ ] Drifter idle/move, hit, and droplet-burst defeat.
- [ ] Spitter idle/move, crest firing action, hit, and defeat.
- [ ] Charger idle/move, charge wind-up/dash, hit, and defeat.
- [ ] Summoner idle/move, summon action, hit, and defeat; spawned mini-slime treatment may reuse Drifter art.
- [ ] Overmind idle/move, attack wind-ups/actions, hit, and defeat.

Enemy masters already exist. Follow their single frontal gameplay orientation rather than commissioning eight directions for every enemy. `../tmp_assets/ART_DECISIONS.md` selects Summoner behavior instead of splitting on defeat; older gameplay documents/runtime still refer to Splitter. Align mechanics before commissioning that enemy's action animation.

## 4. Effects and optional environment additions

- [ ] Shared slime hit/burst sheet and marine healing effect, if code-drawn effects are insufficient.
- [ ] Weapon muzzle flash / impact treatment; normal, piercing, spread, electric, frost, fiery, and Omni feedback.
- [ ] Chest opening/reward reveal and merge/forge success treatment.
- [ ] Summoning effect and boss attack accents once the actions are settled.
- [ ] Optional standalone props: storage crate, antenna, broken solar panel, and Martian rock clusters.
- [ ] Optional terrain patches / decals if the retained arena needs extension or variation.

Simple bullets, electric arcs, warning rings/lines/cones, status tints, pickup glows, and selection borders are suitable for code rendering. They need visual design but are not automatically missing generated images. Camp props already baked into the background only need separate assets if they become movable or interactive.

## Already available — reuse or integrate

- Marine v004 master and approved two-handed weapon pose.
- Twin Rail v002 blaster master.
- Drifter, Spitter, Charger, Summoner, and Overmind selected masters.
- Mars arena v005, splash, title art, and typography reference sheets.
- Base camp v3 environment, installed splash, and installed unarmed eight-direction walking sprites.
- Additional marine animation and 3D sources, including v004/v005 directional walk/run sheets.

Existing source art does not imply runtime integration. The arena renderer still constructs placeholder scenery, marine, and loot with basic shapes. The typography sheets are visual references, not font files.

## Delivery conventions

Match the retained art decisions: ivory/navy equipment, cyan/orange accents, smooth illustration, bold outlines, and readable silhouettes. Export isolated item art with transparency, no baked text or rarity frame, and judge icons at 48 px. Provide consistent padding/origins; animation sheets also need verified frame dimensions, count, playback rate, and loop behavior. New generated artwork belongs in `../tmp_assets/`; keep source and runtime exports separate.

Sources: [retained art](../../tmp_assets/README.md), [current art decisions](../../tmp_assets/ART_DECISIONS.md), [current context](../CONTEXT.md), [item art descriptions](WIZARDGENIE_PROMPTS.md), and [game plan](GAME_PLAN.md). Current context supersedes older save/resume and audio requirements; audio generation is excluded.
