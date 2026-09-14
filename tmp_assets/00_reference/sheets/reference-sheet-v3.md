# Math on Mars reference sheet v3

Status: candidate; owner approval pending. Ticket 16 / issue #5 remains open.

## Direction

Use the marine v004 and twin-barrel Pulse Blaster candidates from the owner's art exploration. Preserve the off-white/navy body, flat cyan visor, orange shoulder accent, empty hands, and one separate shoulder weapon with a common receiver. Match the approximately 30-degree downward camera target across characters and terrain. Use simple broad shading, clean dark outlines, quiet rusty ground, charcoal machinery, and a round lime Drifter with one core.

The reference sheet covers the marine, Drifter, terrain, sample math/reward UI, and desktop/phone portrait/phone landscape compositions. It is a visual proposal, not a rendered runtime screenshot or device-verification result. Runtime text, numeric input, rarity labels/pips, and telegraphs remain code-rendered.

## Sources

- Owner checkout: `tmp_assets/ART_DECISIONS.md` (September 14, 2026).
- Owner checkout: `tmp_assets/03_characters/marine/marine_master_v004_source.png`.
- Owner checkout: `tmp_assets/04_weapons/pulse_blaster/pulse_blaster_twin_v001_source.png`.
- Earlier candidate: `references/mathonmars/candidates/reference-sheet-v1.png` (layout/environment only).

The newer art notes record a two-equipped-ammo direction, while the implemented plan currently allows four slots. This sheet proposes appearance only. Loadout capacity, Expander costs, combined-shot behavior, and Omni handling require reconciliation before implementing that mechanical change.

## Approval and remaining implementation

Issue #5 explicitly requires: “The owner approves one reference sheet covering marine, Drifter, terrain, and sample UI at gameplay scale.”

After the owner selects the direction, produce and integrate the marine/Drifter frames, separate weapon, arena and core UI assets. Keep the approved reference and prompt provenance. Review animation continuity, single-gun mounting, thumbnail readability, and both phone layouts. Only then complete ticket 16's code review and merge.

## Generation and inspection

Generated with the built-in `image_gen` tool. The exact initial prompt is in `reference-sheet-v2-prompt.txt`. The initial result adopted the newer marine silhouette but placed the weapon beside the helmet and used incorrect rarity pip counts; the v3 edit separates the ear disk from the backpack-mounted weapon and corrects the rarity pip counts. The exact edit prompt is in `reference-sheet-v3-prompt.txt`. Selected candidate: `reference-sheet-v3.png`. Weapon aiming and pivot placement must be finalized in production integration rather than inferred from this concept sheet. Source masters are preserved on this branch under `tmp_assets/`.

The portrait/landscape compositions are visual direction examples. They do not prove that the runtime preserves approach distance, touch hit areas, or device performance. Those checks remain part of integration.
