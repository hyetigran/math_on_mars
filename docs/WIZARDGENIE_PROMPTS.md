# Math on Mars — WizardGenie prompt pack

Companion to [GAME_PLAN.md](/Users/tig/Desktop/tigran/mathonmars/docs/GAME_PLAN.md). Revised September 13 for mobile launch support and the `docs/` directory. These are ready-to-adapt prompts, not completed generations. Confirmed launch requirements: desktop and phone/tablet play, speed-based upgrades, no relaxed mode, reviewed practice tracks for every grade K–6, one weapon slot, five upgradeable ammo types, the five-purple legendary recipe, and shop-trinket ammo capacity from one to four. Final title, remaining scope choices, art references, and a generation budget remain provisional.

Design-review update: use the revised exposure timer, actual-input targets, full-range reward strength, wrong-answer tier drop, help-rate support window, authored variants, supply milestones and compact combat rules. See [DESIGN_VALIDATION.md](/Users/tig/Desktop/tigran/mathonmars/docs/DESIGN_VALIDATION.md) for arithmetic and the live audio estimate. Keep the PRD's pending choice labels for streak/Short recommendation/wrong-retry counting; do not present them as approved.

**How to use this pack**

All paths inside the copyable prompts are relative to the repository root. Planning files live in `docs/`; preserved screenshots remain under `references/`. Apply the PRD's mobile launch requirements to every implementation prompt, including early prototypes.

For implementation and asset integration, also read [ARCHITECTURE.md](/Users/tig/Desktop/tigran/mathonmars/docs/ARCHITECTURE.md) for state ownership, save contracts, and installed asset/content manifests. GAME_PLAN.md continues to govern gameplay and launch scope.

Use the PRD's implementation policy record: default to the speed-only reward route while the accuracy streak is unapproved, identify prototype retry/set/mission rules, and retain the proposed status of the early blue-pair acquisition schedule and Omni stabilizer. Verify the complete module-headroom and cache-settlement contracts in the architecture before using the implementation prompts below.

Use one asset or one milestone per request. Start with the shared brief and a small set of candidates: marine, Drifter, Martian terrain, and a sample UI panel. Assemble them into the Math on Mars reference sheet with a gameplay-size view and obtain approval before batch asset generation or animation. Once approved, attach that sheet as the primary visual authority along with the selected character/object master when identity must be preserved; describe only the required change. The reference sheet is a planned deliverable and has not yet been created or approved.

The reference sheet must include desktop, phone portrait, and phone landscape compositions with readable characters, telegraphs, HUD, thumb zones, and a sample math keypad. Use those views to judge scale and safe margins before generating more assets. Decorative panels must support reflow; text and controls stay in the runtime UI.

Follow the reference roles in GAME_PLAN.md: Backwoods screenshots guide arena/future-hub composition, character scale, enemy readability, environmental detail, and combat HUD placement; Goblin Gutter guides smooth chibi rendering, outlines, shading, view, and animation conventions; Quizcaster guides the educational UI and expansion menus. Resolve visual conflicts using the approved Math on Mars sheet. Gameplay and launch scope continue to come from GAME_PLAN.md.

For UI work, read [QUIZCASTER_REFERENCES.md](/Users/tig/Desktop/tigran/mathonmars/docs/QUIZCASTER_REFERENCES.md) and inspect the three preserved images under `references/quizcaster`. They guide layout and hierarchy; GAME_PLAN.md controls scoring, reward pools, ammo capacity, and the forge-only legendary. Use the question image for Prompt 8A, upgrade image for Prompt 8B, and study-menu image for Prompt 8C. Their artwork and pictured future features are not instructions to change our art style or launch scope.

The current [Sorceress API guide](https://sorceress.games/account/api-keys) describes AutoSprite V3 as character look → animation → Corridor Key sheet. Live tools in this session expose image generation, character registration, animation, keying, sound effects, and music. Use current tool schemas and prices at execution time; the earlier Goblin Gutter guide's AutoSprite v2 references should not dictate new API calls.

**Prompt 0 — shared project brief**

```text
We are making Math on Mars, a working-title browser game for desktop, phones, and tablets inspired by my Goblin Gutter project. Read docs/GAME_PLAN.md for scope and docs/ARCHITECTURE.md for implementation boundaries. Preserve its smooth illustrated chibi visual language, slight overhead camera, readable combat, automatic firing, and wave-to-upgrade rhythm. The setting is a Martian research outpost defended by a space marine against alien slimes. Launch must include reviewed practice tracks for all seven grades K–6 and spoken support for K–1. Keep speed-based upgrades and omit relaxed mode. Grade-limited prototypes are internal milestones, not public releases. Apply the owner's wrong-answer rule to the current quiz's final reward tier, with green as floor and no loss of prior equipment. Follow the PRD's exact candidate/downgrade order, full-range strength, and pending retry detail. Use configured three- or five-item sets with fixed-denominator normalization; preserve the proposed status of the K–1 Short default and accuracy streak.

Mobile is launch scope: support portrait and landscape, a floating virtual movement stick, auto-aim/fire, reachable med-kit/pause buttons, and a mirrored handedness setting. Support moving and using med-kit with separate fingers. Reflow the HUD, math keypad, cards, shop, and inventory without shrinking controls or hiding choices. Use the PRD's safe-area, text, touch-target, interruption, and real-device acceptance requirements. Keep physics and reward rules independent of screen size. Do not require fullscreen, an orientation lock, hover, right-click, or drag-only inventory interaction.

Combat uses exactly one Pulse Blaster in one weapon slot. Ammo types are Piercing, Multi Shot, Electric Chain, Frost, and Fiery, each progressing White T1 to Green T2 to Blue T3 to Purple T4 through matching-pair merges. One purple of each type forges Legendary Omni Ammo with all five purple effects. The gun starts with one active ammo slot; the shop's Ammo Expander adds one per purchase, capped at four. Reserve storage is separate from active capacity, so five legendary ingredients never require five active slots. Use docs/GAME_PLAN.md's working defaults of reusable run-long cartridges, combined effects per shot, and legendary occupying one slot.

Reference roles: use Backwoods for world composition, scale, readability, environmental detail, and combat HUD placement; Goblin Gutter for smooth chibi rendering and animation continuity; Quizcaster for math questions, reward selection, progress indicators, and future subject menus. Before batch production, create and obtain approval for a Math on Mars reference sheet containing the marine, a slime, Martian terrain, and a sample UI panel, with a gameplay-size comparison. Once approved, use that sheet as the primary visual reference for every asset request and use individual approved masters to preserve identity. Reference images do not alter the gameplay rules or add a hub or future subjects to launch scope.

Shared style clause: smooth stylized chibi science-fiction game illustration, strong clean dark silhouette outlines, polished cel shading with two to four value groups per material, compact readable shapes, restrained surface detail.

Shared view clause: fixed slight three-quarter overhead view for a top-down 2D game, consistent camera elevation and orthographic-like perspective, full subject visible, facing screen-right for the canonical character view.

Marine: compact 2–2.5-head proportions, off-white and navy exploration suit, broad helmet, horizontal cyan visor, orange shoulder patch, empty hands. The suit is the fixed base appearance for this release. The one gun is a separate sprite on a single shoulder-side mount; ammo changes the shot's appearance, never the number of guns.

World: muted rusty Martian soil, charcoal equipment, sparse off-white outpost structures. Keep ground contrast lower than characters. Slimes have different silhouettes as well as different colors. Hostile warnings use orange-red with distinct ring, line, or cone geometry. Item quality uses text and one/two/three pips in the runtime interface, never color alone. Enemy bodies do not carry rarity frames.

Use smooth illustration throughout. Exclude pixel grids, dithering, photorealism, human gore, logos, watermarks, and tiny decorative text. Equations, numbers, labels, fractions, and answer controls are rendered by the game, not generated into artwork.

Create the requested asset only. Preserve chosen reference images and save new candidates separately. Read the project's current WizardGenie runtime rules before integration; use its built-in Play/LAUNCH preview when applicable. Discover current generation tools and exact costs before a paid batch; stay within any budget already authorized by the user.
```

**Prompt 1 — marine master**

```text
Create one canonical marine master for Math on Mars.

Smooth stylized chibi science-fiction game illustration, strong clean dark silhouette outlines, polished cel shading with two to four value groups per material, compact readable shapes, restrained surface detail.

Fixed slight three-quarter overhead view for a top-down 2D game, consistent camera elevation and orthographic-like perspective, full subject visible, facing screen-right for the canonical character view.

A compact heroic space explorer, 2–2.5 heads tall, wearing a rounded off-white pressure suit with navy joints, a large closed helmet, a broad horizontal cyan visor, one orange shoulder patch, chunky boots, and a compact backpack. The silhouette is friendly and determined. Neutral standing pose, arms slightly separated from the torso, empty hands, feet clearly separated. No weapon or floating equipment in this master.

Single centered character, generous clear margin around the whole silhouette, flat solid bright green background, no background gradient, floor, cast shadow, scene, text, or watermark. Keep green out of the character design. Produce a high-resolution square source image and retain the original generation URL and asset identifier.
```

Attach an approved Goblin Gutter image only as a proportion/rendering reference, never as authority for medieval clothing. After selecting this marine, use the marine itself as the identity reference for every animation.

**Prompt 2 — Drifter Slime master**

```text
Create one canonical Drifter Slime master for Math on Mars, matching the attached marine reference's outline weight, cel shading, camera elevation, and detail density.

A squat lime-green alien blob, round asymmetrical dome, one pale-yellow glowing core and two small dark eyes, a wide squashed contact base, and a playful but hostile expression. About two-thirds the marine's height in the game. A few broad painted jelly highlights communicate softness; the body is mostly opaque rather than see-through. Facing screen-right, neutral idle pose, full body visible, centered with ample margin.

Smooth stylized chibi science-fiction game illustration, strong clean dark silhouette outlines, polished cel shading with two to four value groups per material, compact readable shapes, restrained surface detail.

Fixed slight three-quarter overhead view for a top-down 2D game, consistent camera elevation and orthographic-like perspective.

Flat uniform saturated blue chroma-key background. Keep blue and cyan out of the slime itself. No floor, cast shadow, setting, text, watermark, green background, or transparent jelly window through the body. Make one character, not a roster or sprite sheet.
```

**Prompt 3 — enemy variants**

Run this template separately for each enemy, with the chosen Drifter reference attached. Replace the bracketed text with one row from the table.

```text
Create one new Math on Mars enemy master matching the attached approved Drifter's illustration style, outline weight, lighting, overhead camera, and jelly material treatment. Preserve the shared style and view clauses from Prompt 0.

Enemy: [NAME]. Distinct silhouette and visual features: [DESCRIPTION]. Neutral pose, facing screen-right, whole body visible, centered, generous margin. Mostly opaque body with painted gelatinous highlights. Use a flat saturated blue key background, no blue/cyan colors in the subject, no floor or cast shadow, no scenery, no labels. Do not include other enemy types or multiple views.
```

| Name | Description |
|---|---|
| Spitter Slime | Tall pear-shaped yellow-green blob, upright neck, small nozzle-like mouth, one pale-yellow core; recognizable from its height and mouth silhouette |
| Splitter Slime | Purple peanut-shaped body with two distinct rounded lobes connected by a narrow waist, one warm pink core in each lobe; visually suggests it will split into two bodies |
| Charger Slime | Low broad amber body with a forward wedge shape, three dark ochre shell ridges and a compressed rear lobe; suggests a spring-loaded rush |
| Slime Overmind | Huge magenta dome around a visibly contained cream-and-orange reactor core, four broad external lobes, warm white eyes; imposing cartoon boss with large readable shapes, no tiny machinery |

The launch enemy roster is Drifter, Spitter, Splitter, and Charger plus the boss. Mini-slimes reuse Drifter styling. Brood is a separate deferred summoner; do not generate it as part of this batch or rename Splitter to Brood.

Inspect purple/magenta subjects against the blue plate before animation; choose a different supported key plate if extraction damages their edges. Do not solve a color conflict by repeatedly erasing part of the character.

**Prompt 4 — animation production request**

```text
Use the selected master of [CHARACTER]. Register or reuse that exact image in AutoSprite V3; do not generate a new identity. Discover the current API schema before calling tools.

Animate only [ANIMATION] using the motion text below. Keep camera, facing direction, character scale, colors, proportions, silhouette details, and key-plate color stable. Full body remains visible. No camera movement, zoom, rotation, scene changes, new objects, or automatic turning toward the viewer. Locomotion loops in place without traveling across the image. Keep the contact baseline stable except for intentional hops.

After the animation completes, use Corridor Key through the supported tool with automatic plate detection initially. Retain the source asset/job IDs, video URL, keyed PNG, and returned metadata. Inspect the animation at gameplay size before installing it. Read actual returned grid and frame data; do not guess frame counts or declare the asset integrated merely because a generation job completed.
```

Use the following motion texts as individual clips. Loops and one-shot clips have different ending requirements.

| Character / clip | Motion text |
|---|---|
| Marine / idle | Subtle relaxed breathing loop with a tiny backpack bob, boots stay planted, empty hands, start and end in the same pose |
| Marine / run | Brisk in-place run cycle facing right, short confident strides, restrained arm swing, empty hands, consistent helmet and backpack, seamless return to the first pose |
| Marine / hurt | One short backward flinch followed by recovery to the standing pose, helmet and boots remain visible |
| Marine / downed | Kneel as the visor dims, then settle into a clear motionless powered-down pose; one-shot ending, no recovery, no injury detail |
| Drifter / idle | Gentle squish-and-stretch breathing loop, core bobs slightly, base stays fixed, seamless return to the first shape |
| Drifter / move | Repeating small elastic hops in place facing right, squash on landing and return to original body volume, no camera travel |
| Spitter / attack | Inflate the upper lobe, lean the nozzle-mouth forward, recoil once and return to idle; no projectile baked into the clip |
| Splitter / split | Two lobes stretch apart in one quick elastic motion, center pinches inward, ending with a brief breakup puff; game creates the two child enemies separately |
| Charger / windup | Compress rear lobe, lower the front, hold a readable braced pose; do not charge forward in this clip |
| Charger / rush | Low vibrating rush posture looping in place; game controls movement and collision |
| Slime / hurt | Quick squash on impact and recovery, keep the body color stable; hit flash is added in code |
| Slime / defeat | Pop into a few chunky colored droplets that shrink and disappear, no blood, no bones, one-shot ending with no body remaining |
| Overmind / slam windup | Dome rises and expands, outer lobes brace outward, core brightens, stop in a held anticipation pose |
| Overmind / slam | Dome compresses downward once, lobes spread and recoil, return to the original idle pose; ground ring and damage timing are controlled by the game |

Start with marine idle/run and Drifter idle/move. Reuse a selected slime's master for that slime's additional clips. A still plus a small runtime motion can support the initial playtest, but should be identified as temporary animation coverage.

**Prompt 5 — arena composition reference**

```text
Create a 16:9 visual concept for a Math on Mars combat arena, matching the attached approved marine and Drifter art references.

Slight three-quarter overhead view of a Martian research outpost clearing. Muted terracotta soil, broad charcoal landing-pad panels, a few subtle cracks, sparse rounded rocks, a damaged antenna and compact science equipment around the outer edge. Keep the central 70 percent open and low contrast for many moving enemies. Distant terrain appears as an overhead boundary, not a cinematic horizon. Lighting agrees with the selected character references.

Smooth illustrated surfaces, strong simple silhouettes on props, restrained cel shading, quiet ground texture. No characters, enemies, equations, interface, readable text, logos, or painted warning circles. This is a composition reference; do not present it as a seamless gameplay tile.
```

**Prompt 6 — ground tiles and individual props**

```text
Using the approved arena reference, create one square ground texture: muted rust-red compacted Martian regolith with sparse shallow cracks, small rounded stones, broad quiet color variation, smooth illustrated finish. Direct overhead surface view. It must repeat seamlessly on all four edges. No large landmarks, perspective horizon, shadows from off-image objects, text, characters, or machinery. Keep contrast below the approved characters. Inspect a repeated 3-by-3 grid for visible seams before accepting the tile.
```

Generate props separately with the shared style/view and transparent backgrounds where supported. Otherwise use a contrasting plate and the supported still-image keying tool.

```text
Create one [PROP] for Math on Mars using the attached approved arena and marine references. Fixed slight three-quarter overhead view, smooth stylized science-fiction illustration, strong dark silhouette outline, simple cel shading, minimal tiny surface detail. Entire object visible, centered with clear margin, consistent lighting. Transparent background if supported. No surrounding floor, baked cast shadow, characters, lettering, numbers, logos, or watermark.
```

Prop list: sealed supply cache; same cache opened; med-gel canister; salvage bundle; squat antenna; storage crate; broken solar panel; cluster of rounded Martian rocks. Ammo pickups use the cartridge assets from Prompt 7 with runtime tier/name cues. Keep decorative props nonblocking in the first arena; collision is a separate gameplay decision.

**Prompt 7A — the single weapon, ammo cartridges, and trinket icons**

```text
Create a single inventory icon for [ITEM] in Math on Mars. Match the approved marine reference's smooth illustration, clean dark outline, and simple science-fiction shapes. Large central silhouette readable at 48 by 48 pixels, minimal internal detail, consistent slight three-quarter overhead view, no hand or character, transparent background where supported. No text, digits, border, rarity glow, baked UI panel, logo, or watermark. The game adds tier borders and labels.

Item description: [DESCRIPTION].
```

| Item | Description |
|---|---|
| Pulse Blaster | The game's one compact off-white/navy gun, single broad cyan barrel aperture and orange vent, clean mounting point |
| Piercing Ammo | Slim silver cartridge with a long spear-shaped insert and two aligned punctured plates as a bold silhouette motif |
| Multi Shot Ammo | Broad cartridge with three visibly fanned cartridge tips, an immediately readable spread silhouette |
| Electric Chain Ammo | Rounded cartridge with a bold connected zigzag conductor spanning three raised contacts |
| Frost Ammo | Faceted pale-ice cartridge with one large six-point crystal motif, simple angular silhouette |
| Fiery Ammo | Rounded dark cartridge containing an orange flame-shaped core and broad heat fins |
| Legendary Omni Ammo | One substantial gold-and-ivory cartridge with a central star-shaped core and five large distinct inset motifs: spear, spread, linked bolt, ice crystal, and flame; one fused item, not five loose cartridges |
| Ammo Expander | A navy-and-ivory feed adapter with four distinct empty cartridge sockets, broad simple silhouette; no text or numbers |
| Overclock Chip | Orange processor chip with one bold lightning-shaped circuit motif |
| Shield Capacitor | Stout cyan-and-ivory energy canister with a recognizable shield-shaped casing |
| Thruster Coupler | Pair of compact orange thruster nozzles connected by a navy brace |
| Med-service Module | Compact off-white medical service case with a large orange gel droplet and broad handle |
| Targeting Module | Navy sensor pod with a bold cream concentric-ring reticle and one cyan lens |
| Salvage Module | Compact collection magnet with two broad cream prongs and a single orange metal scrap |

Generate one base icon for each normal ammo type. The game adds White/Green/Blue/Purple tier labels and one-to-four pips; do not generate four slightly different cartridge identities. Legendary has its own distinct source art and gold crest. Ammo Expander is a fixed +1-capacity utility trinket, not a cartridge or tiered gun. Keep stat-trinket modifier counts separate from ammo tier and active capacity.

The six family icons cover all 18 module variants; use runtime names and modifier rows to distinguish variants rather than requiring 18 separate generations. Verify each family has an installed icon before accepting the final asset manifest.

For the in-world Pulse Blaster, request one whole-object asset matching its icon, at the same view as the marine, with its muzzle clearly oriented screen-right. Its mount follows the marine and aims through the game renderer. Do not bake it into the character master or add more gun sprites for additional ammo types. Simple shots, arcs, danger rings, selection borders, and rarity colors are rendered in code.

**Prompt 7B — combined ammo effects and loadout presentation**

```text
Implement readable ammo feedback using the approved single Pulse Blaster and cartridge art. Follow the mechanical definitions and working combined-effects rule in docs/GAME_PLAN.md. There is one gun regardless of ammo capacity. Use bounded runtime effects rather than a separate fully generated animation for every possible ammo combination.

Piercing: a narrow elongated projectile and a brief through-hit streak. Multi Shot: a visible spread of distinct projectiles. Electric Chain: a short angular arc connecting actual chain-hit targets. Frost: a small crystal-shaped status mark and cool impact accent. Fiery: a small flame-shaped status mark and restrained warm burn pulses. Legendary: one distinct gold muzzle accent with the five functional effects, not five guns or five overlapping full-screen particle layers. Keep orange-red hostile warning geometry visible under all effects.

At fire time, snapshot equipped effects, total volley damage budget, piercing falloff, chain and funded-burn ledgers. Read the revised values from docs/GAME_PLAN.md: purple Multi Shot totals 1.6D before piercing, successive pierce damage halves, chain deals 0.20D per jump, and new burn damage shares a per-shot budget. A weak hit cannot refresh a strong burn for free. Boss Frost is half the ordinary tier value. Chain hits do not emit more shots; burn ticks do not trigger hit effects. Show actual resolved hits. The proposed post-forge +4% firing-rate stabilizer per purchased extra slot is explicit, once-only, and capped at +12%.

The loadout shows one weapon slot, an Active Ammo row with one to four available slots, and a grouped Ammo Reserve. Label every cartridge by type and T1–T4, or Legendary. Ammo Expander shows the current and next capacity, capped at four. The forge shows five distinct named purple ingredient checks sourced from owned reserve, including equipped copies, then previews which copies are consumed and where the legendary is equipped. Legendary uses one slot and shows All five effects. Mark redundant normal ammo effects when legendary already supplies them. On phones, wrap active slots and use scrollable reserve/ingredient rows with tap-to-select actions and an explicit Forge button; no drag-only interactions. Keep all five ingredient names and loadout changes available at readable size.

Check the display at desktop and phone gameplay sizes in both orientations and in grayscale/color-vision simulations, including Multi Shot + Piercing + Electric Chain + Fiery and the full legendary combination. Damage telegraphs, the marine, and remaining enemies must stay readable around thumb controls. Tier, capacity, and effect identity must not rely on color alone. Bound cosmetic particles and render resolution for mobile performance without changing hit effects or damage.
```

**Prompt 8A — math screen visual design / implementation**

```text
Design and implement the reactor recharge screen according to docs/GAME_PLAN.md. Use the selected game palette and frame it as a calm ship console.

Use references/quizcaster/02-math-question.png and docs/QUIZCASTER_REFERENCES.md for the layout. Center progress, question, answer field, and keypad in that order. Arrange the keypad as 7–8–9 / 4–5–6 / 1–2–3 / Backspace–0–Check, with real labels and accessible names. Use a vertical Reactor charge rail at the left on wide screens and a compact horizontal strip on narrow screens. Display our Standard/Advanced/Overcharged thresholds and settled charge; do not copy the reference's five-tier ladder or show a quiz-earned legendary. Earned charge does not drain while answering. Display the configured three- or five-item set and normalize its charge using planned N; early exit cannot shrink the denominator.

Prioritize a large central math question, clear visual aids when required, large answer controls, a Submit action, question progress out of the configured N, and a reactor-charge display. Show correctness charge separately from speed charge in feedback. Include Hint, Show me how, End recharge, Replay narration, and Save & Exit. Keep decorative machinery around the edges. Support the PRD's structured cadence observations, including three-question breaks, without claiming a controlled causal experiment.

Render every equation, number, fraction, label, input, and feedback message with real text and programmatic shapes. Counting groups, fraction bars, and number lines must be generated from the actual question data, with exactly the required quantities. Background artwork must contain no educational content. Combat stays paused until the intermission and shop are finished.

Support keyboard, mouse, and touch input, readable focus, and clear error feedback. Use at least 48×48 CSS-pixel hit areas and aim for 56-pixel K–1 keypad keys where possible. Use the full numeric keypad for constructed answers, with fraction fields and decimal entry where required. Default touch math entry to the built-in keypad without also opening an OS keyboard. Keep the question/visual aid, answer, and Check visible together: one column in portrait, question/keypad columns in short landscape layouts. Explanations may scroll. Account for safe areas and browser chrome; pause during rotation/major relayout and preserve draft input and elapsed time. Do not award correctness or speed charge for multiple-choice activities inside hints. Do not implement relaxed mode or put a countdown over the equation. Correctness and speed rewards, retries, skips, and tier/strength rules come from docs/GAME_PLAN.md; do not invent another scoring system.

For K–1, use the reviewed bundled narration manifest. Speak the question, hints, worked explanation, and onboarding instructions without requiring the learner to read. Start solve-exposure timing at first problem/diagram reveal or item-specific speech, whichever occurs first; initial submission waits until required narration ends, but that narration time counts. Item-specific Replay also counts as exposure while the visual may be hidden. Genuine pause conceals the problem and stops speech. Resume restores accumulated exposure and counts any repeated item narration. Never reveal the correct count in a counting prompt. Do not silently substitute text-only play when required audio fails.

Show Standard / Advanced / Overcharged with one / two / three pips and visible modifier rows. Use first-modifier strength 1 + 0.5 × normalizedCharge / 125 across green, blue and purple. Math variants need first-stat headroom for 1.50 times the base modifier and positive actual gains in every additional quality modifier; a merely nonzero capped gain is insufficient. Show wrong-answer tier drops separately from accumulated charge and preserve their count across resume. Render all labels and pips in code. Keep learning outcomes and active runs scoped to the selected local profile, and restore the exact current item/help/timer state after Save & Exit.
```

**Prompt 8B — after-quiz upgrade cards**

```text
Design and implement the Fabricator reward screen using references/quizcaster/01-upgrade-selection.png for visual hierarchy and docs/GAME_PLAN.md for behavior. Continue the reactor console frame and reward rail from the quiz screen, using our smooth science-fiction surfaces and readable type.

Show the earned quality, a compact outcome summary, and the answer-charge/speed-charge breakdown above three large cards. Use aligned columns on wide screens and readable stacked rows or a scrollable list on phones; keep all three offers and their complete gains available. For 115 charge, distinguish 4 fast plus 1 Hint-first correct (purple, no wrong) from 4 fast plus 1 wrong-then-correct (purple candidate drops to blue); both have 95 answer charge and 20 speed charge. The first-modifier factor is 1.46 in both, with final-tier modifier count after the drop. Derive real results from saved item outcomes rather than hardcoding this example.

Each selectable card contains an icon, module name, earned tier text/pips, exact gains, and before/after stats with caps applied. Label a new family New module, an unseen variant within an owned family New variant, and a repeated variant Add another. Show family/variant names and actual stat priorities. Choose three distinct useful variants from the 18-entry catalog, with at least two priorities and first-stat headroom; never serve an all-capped card. Show a visible selection/focus state and a clear Choose action. Preserve three legal offers at the earned quality across Save & Exit/Resume and settle only one. Wait for the answer-submission input to be released before accepting a reward selection. Scrolling, cancelled touches, and held answer taps must not select a card. Keep actions at least 48 CSS pixels in each dimension and clear of device edges/browser controls.

Apply the full first-stat headroom and positive-modifier eligibility contract from section 6 of docs/GAME_PLAN.md. Other stat-changing commands are unavailable until reward choice settles, so shopping cannot reroll these saved cards. Include reviewed replayable spoken descriptions of each choice's purpose and quality for K–1; dynamic exact stats remain readable/accessible text. Verify a pre-reader can choose and proceed into cache/shop without adult reading help.

This screen awards passive stat modules under the current reward contract. It does not consume an existing module, grant free ammo evolution, sell an Ammo Expander, or create legendary ammo. The ammo inventory/forge can reuse the card layout with its actual merge ingredients and capacity rules. Do not infer Quizcaster's internal scoring or reward distribution from card colors. Generate only decorative assets; all text, values, controls, and card state come from the game.
```

**Prompt 8C — Mission terminal and future content menu**

```text
Design the Math on Mars Mission terminal using references/quizcaster/03-study-menu.png for clear grouping and large selectable tiles. Read docs/QUIZCASTER_REFERENCES.md and docs/GAME_PLAN.md first. Retain the smooth science-fiction visual language.

Implement the launch scope: selected local profile, Math training, seven grade choices K–6, reviewed skill tracks for the selected grade, a mission summary, and a separate Resume action when that profile has an active run. Grade and skill selection must not silently discard a saved run. Keep combat difficulty visibly separate from learning level. A learner should be able to reach a reviewed skill without navigating through unavailable future subjects.

Document future menu groups for School subjects, Test preparation, and Custom practice. Future spelling, vocabulary, science, older grades, and user-created decks are expansion concepts, not buttons backed by fabricated content. Keep subject, grade, and skill/deck distinct in menu metadata. New subjects require reviewed content, an appropriate answer evaluator/input, pacing rules, a version, and separate profile progress. Do not implement custom imports, runtime AI question generation, accounts, or unreviewed subject packs as part of this UI task.

Use real rendered labels, visible keyboard focus, and generous touch controls. The reference's K–5 row becomes a responsive K–6 grid here, wrapping into fewer columns on phones without removing any grade. Keep Resume and mission actions reachable, allow normal vertical scrolling, and keep the profile-name field/action visible when the OS keyboard opens. Do not copy its parchment, pixel fonts, exact course counts, or assumption that every shown category is already available in this project.
```

**Prompt 9A — reviewed K–1 speech pipeline**

This is an educational-content milestone, before the final sound-effects/music pass. Use the first small narrated bank to verify the format; expand only from the reviewed item manifest. Generation alone does not count as educational review.

```text
Create the narrated K–1 sample required by docs/GAME_PLAN.md using deterministic question instances and the versioned content/audio manifest. For each item, provide the exact displayed task, spoken task, correct answer, hint, and worked explanation. Use counting or composition tasks with a constructed numeric response. Keep spoken task wording free of answer leakage.

Prepare the sample for the designated elementary-math reviewer's content check. Use only reviewed text for the production narration batch. Select one narrator from the live speech tool's available voices; keep voice, pronunciation, speaking rate, and recording level consistent. Follow the current tool's supported schema and exact cost quote, staying within an authorized budget.

Use the PRD's minimum bank counts (500 K–1 instances across six declared skills), exact-ID and operand-spacing policy, and reviewed generic prompt reuse. Produce a unique-text/character manifest and a current cost quote before any paid batch; docs/DESIGN_VALIDATION.md contains a dated planning estimate, not spending authorization. Generate a complete clip for each unique spoken string rather than concatenating arbitrary numeral fragments at runtime. Reuse identical clips across items. Save local audio files and a manifest linking content version, item ID, clip role, exact transcript, selected voice ID, source asset ID, and output path. The game must work offline with these bundled clips after asset loading.

Include initial-question speech, Replay, a specific hint, a worked explanation, and brief spoken onboarding for answer entry, Check, help, and exiting. Keep speech clear and neutral, with no music underneath the recordings. Avoid praising speed or calling a learner slow. Do not invent a correct answer, rewrite reviewed text during synthesis, or label generated audio as reviewed automatically.

Also inventory fixed spoken descriptions for reward priorities, ammo identity/tier, cache selection, buy/equip/merge/forge actions, Next wave and Save & Exit. These UI clips are additional to the report's math/onboarding subtotal; obtain their actual deduplicated text count and price. Do not generate a recording for every possible fractional stat total. Test the whole K–1 intermission and per-step repeat-spacing liveness before expanding the bank; a whole-skill count of 500 does not prove either.

Verify every manifest reference and review pronunciation against the displayed item and correct answer. Test a pre-reader using the full 0–9 keypad on a phone/tablet with initial narration, Replay, help, rotation, app-switch audio recovery, and pause/resume. Missing required clips must stop that item from entering a scored K–1 set. Produce a review report identifying any item that is not ready for the public grade pack.
```

Example counting item: the game renders five cells; the question audio says “How many energy cells are there? Enter the number, then press Check.” The question audio does not say “five.” A hint may encourage counting each cell once without naming the answer. The worked explanation may say the answer after the scored attempts end.

**Prompt 9B — sound effects**

Run one request per effect family. Confirm supported duration/output options with the live tool. These are sound design descriptions, not API arguments.

```text
Create a short original sound effect for a playful science-fiction wave-survival game. Effect: [DESCRIPTION]. Clean dry foreground sound, restrained loudness, quick onset, no speech, music bed, clipping, long reverb tail, or realistic injury sound. It should remain comfortable when repeated frequently. Create variants only within the authorized generation budget.
```

| Event | Description |
|---|---|
| Pulse shot | Soft punchy electronic pew with a short bright tail, about 0.2 seconds |
| Ammo pickup | Short soft cartridge click and bright pickup chirp, about 0.3 seconds |
| Ammo merge | Two small mechanical clicks resolving into one rising tone, about 0.6 seconds |
| Legendary forge | Five brief ascending energy accents resolve into one warm triumphant synthetic chord, about 1.5 seconds |
| Ammo capacity expanded | Clean magazine-latch click with a short positive electronic tone, about 0.5 seconds |
| Slime hit | Small rubbery squish-pop, about 0.2 seconds |
| Slime defeated | Light elastic splat dissolving into tiny bubble pops, about 0.5 seconds |
| Correct answer | Warm clear two-note digital chime, about 0.4 seconds |
| Try again | Gentle low two-note prompt, neutral and unobtrusive, about 0.3 seconds |
| Reactor charged | Rising energy swell resolving into a satisfying clean tone, about 1 second |
| Upgrade selected | Crisp mechanical click plus a small electronic lift, about 0.5 seconds |
| Boss warning | Distinct descending synthetic alert, about 1 second, no piercing alarm |

Generate two music tracks initially: combat and recharge/shop. Add a separate boss track after the main loop works.

```text
Create an original seamless-loop instrumental for Math on Mars combat. Energetic but playful science-fiction synth score, approximately 112 BPM, springy electronic bass, light percussion, bright spacious motifs, adventurous cartoon tone. Leave room for frequent short sound effects. No vocals, dramatic intro, abrupt ending, or recognizable melody from another work. Target 60–90 seconds if the selected tool supports it. Verify the loop boundary after export.
```

```text
Create an original seamless-loop instrumental for a children's math recharge screen in Math on Mars. Calm spacious science-fiction ambience, gentle soft synth pulses, approximately 75 BPM, very sparse percussion and melody, supportive and curious mood. No ticking clock, urgent build, vocals, startling transients, or recognizable melody from another work. Target 60–90 seconds if supported. It should sit quietly under mathematical thinking and feedback chimes.
```

**Prompt 10 — first playable implementation handoff**

```text
Build only the three-wave playable slice in docs/GAME_PLAN.md. Read the current WizardGenie project rules and supported engine setup first. Use the approved Math on Mars assets when available and clearly track temporary art coverage.

Build desktop and phone/tablet play into this slice. Add a floating touch movement stick, auto-aim/fire, simultaneous move/med-kit input, mirrored handedness, and reachable pause. Use the common command Interface from docs/ARCHITECTURE.md. Prove readable combat and responsive quiz/reward layouts in portrait and landscape at the PRD's baseline sizes. Clear gestures on cancellation/rotation/blur; pause major relayout without resetting question time or losing draft answers. No required orientation lock or fullscreen.

Include: one moving marine; one automatically firing Pulse Blaster in exactly one weapon slot; one active ammo slot with the white Piercing starter cartridge; ammo pickups entering a separate reserve; one Drifter enemy; three short escalating waves; HP presented as Suit Integrity, salvage, defeat and restart; two between-wave reactor recharge rounds with five grade-3 multiplication questions each; deterministic answer validation; exactly the revised first-attempt, assisted, skip, speed, and first-modifier-strength rules; and one free choice among three appropriately tiered stat modules after each round. Ammo and stat modules last until the run ends. End wave three with victory and a summary rather than another math round. Defeat at any wave ends the run while retaining already-submitted learning outcomes. If a stat module adds armor, use docs/GAME_PLAN.md's single mitigation formula; do not add a shield resource.

Verify charge 100 for five unassisted slow, 125 for five fast, 75 for five Hint-first correct, and 115 for four fast plus one assisted. Distinguish Hint-first from wrong-then-correct: the latter's wrong submission drops the final tier. Verify full-range strength, N=3 normalization, fixed denominator on early exit, and idempotent wrong-count/charge settlement. There is no relaxed mode. Actual edit provenance determines T; mixed editing uses the smallest applicable target. The live timing includes item-specific initial/replay narration. Keep proposed streak behavior behind the explicitly recorded product-policy choice, with a separate purple reason. Multiple-choice hint interactions earn no score.

Alongside the slice, prepare the small reviewed narrated K–1 sample from Prompt 9A so pre-reader usability is tested early. Keep prototype learning records under an explicit local profile ID so the subsequent profile-picker and resume milestone can preserve them. This internal slice is not the public K–6 release.

An ordinary wave ends after its finite spawn schedule, queued spawns and surviving enemies are exhausted; 30–45 seconds is a spawn-schedule target, not a forced despawn timer. Use the PRD's final-ordinary-clear exception for this boss-free internal slice. Keep provisional full-mission balance fixtures separate from its three playable waves.

Keep the full shop, Ammo Expander, remaining ammo effects/tiers, merges and legendary forge, cache inventory, other enemies, hub, and grade expansion for their later milestones. The public release still requires all five ammo types and the full legendary/capacity progression. Keep scoring and math generation independent of combat scenes so they can be verified directly. The selected math grade must never change enemy health or combat difficulty.

Verify a complete run, defeat and restart, all answer outcomes, scores at the tier boundaries, pause/background timing, and duplicate-submit/reward prevention. Include real iOS Safari and Android Chrome touch play, safe areas, rotation, sustained frame pacing, and readable controls; use a tablet in the launch matrix as well. Show which behavior was actually checked in the built-in preview versus on physical devices, and mark unavailable device checks as pending. Report the files changed, checks performed, remaining limitations, and the next milestone. Do not claim success solely because the project compiles or a desktop viewport was resized.
```

**Prompt 11 — profiles and resumable sessions**

```text
Implement the session-durability milestone in docs/GAME_PLAN.md after the three-wave educational slice is verified. Read its profile, defeat, adaptation, and save/restore rules before editing. Use local profiles with stable IDs, nicknames, avatars, isolated learning histories/settings, and one active run per profile. Do not require accounts or a cloud service.

Implement Save & Exit, Resume, profile switching, autosave, and explicit abandonment. Serialize all phase-relevant state, RNG, questions, accumulated timer values, first-attempt/help flags, offers, caches, pending rewards, and settlement IDs. Ammo state includes owned cartridges/tiers, active references/order, capacity purchases, legendary-forged flag, loose pickups, shot payloads, chain budgets/visited targets, and slow/burn durations. Add fields when their ammo milestone lands, with save-version migration. Resume must continue the same state rather than rerolling the wave or awarding the same learning event twice. Idle wall-clock time must not advance gameplay or question timers. Defeat retains learning outcomes but ends the run and its ammo/equipment/salvage, resetting active ammo capacity to one on a new run.

Commit answer outcomes with their charge and commit selected rewards with their consumed IDs as logical transactions. Detect unsupported/corrupt saves and storage failures, retain a last-valid backup, and report failures without claiming a save succeeded. Never merge siblings' records. For adaptation maintain both ten-item accuracy and presented-support windows for each profile/skill/step/version. Six support-needed items can offer help even with zero eligible first submissions; otherwise use 9–10 advance / 6–8 retain / 0–5 support. Emit at most one selected-skill suggestion, save both cooldown watermarks, and exclude unseen auto-skips from support counts. Save repeat spacing, normalized N, actual input history, exposure, wrong-count and any adopted streak. Suggestions apply only before a later run.

Separate interaction revision, simulation tick and database storage revision as defined in docs/ARCHITECTURE.md. A periodic save must not invalidate a current answer/card action. Check a matching command receipt before new-command phase/revision guards. Use stable content keys for spacing and occurrence IDs for evidence; unseen planned items do not enter presentation history, and repeat practice still enters the support window. Test the per-step path from a dismissed suggestion to five new eligible attempts.

Add iOS installation/persistence-status guidance and the adult notice that origin data may be removed automatically. Prepare an external profile export at run end/abandon; offer a gesture-backed Save backup with cancellation/failure state, and never count a generated Blob as a verified file. Verify restore after deleting all origin storage/caches, separately from actual inactivity-return checks, and test browser-to-installed-context transfer through export/import. Verify exit/reopen in combat, mid-question after a first error, during a reward choice, and in the shop once that phase exists. Verify profile switching, double submission, repeated resume, defeat on a nonfinal wave, a simulated failed write, a corrupt active-run snapshot, and learning retention after defeat. On mobile, cover screen lock/app switching, rotation, draft preservation, audio recovery, neutral movement on resume, and usable selected-profile export/import. Add shop/cache coverage when their milestone lands. Report the supported save version, cases tested, and any remaining release blockers.
```

**Prompt 12 — full ammo progression and legendary fusion**

```text
Implement the ammo-progression milestone from docs/GAME_PLAN.md after the three-wave educational slice and session-durability milestone. Preserve exactly one gun and one weapon slot. Add Piercing, Multi Shot, Electric Chain, Frost, and Fiery ammo in White T1, Green T2, Blue T3, and Purple T4, with reusable run-long cartridge ownership, grouped reserve, active equipment references, and the documented effect values.

Use the PRD's explicit supply milestone schedule: fixed pair-of-blue choices across all five types plus the ordinary-module alternative, with five distinct type choices furnishing forty white-equivalents in ten cartridges. Optional drops use a persisted five-type shuffle bag. Guarantee eight first-clear salvage and reserve the affordable first Expander offer. Combat pickups update memory and the next checkpoint; do not freeze/commit IndexedDB on every pickup. Add direct ammo pickups, cache contents, and ammo shop offers. Ammo capacity starts at one. The shop-only Ammo Expander grants +1 active slot per purchase to a hard maximum of four; it is not multiplied by rarity, math strength, or other stat scaling. Exclude invalid offers at the cap and reject a stale purchase without charging salvage. Keep the four-offer shop's existing auto-refill, reroll, and valid-lock behavior.

Milestone caches offer six mutually exclusive options: five blue pairs and one fixed green base-value module. A single choice accepts or sells one complete bundle and closes all alternatives atomically. Grant caches are a separate type with individually granted items; reject their commands against choice caches. A capped cache module keeps its fixed sell quote. Shop purchased slots stay empty until all four are bought, then refill once. Test choosing two different cache options, a failed write, retry and resume. The blue-pair schedule permits purple after wave one; compare it with staged-tier acquisition and record a product decision before locking release balance.

Normal merge consumes two copies of one type and one tier below purple to make the next tier. Legendary fusion consumes exactly one purple of every distinct type from the entire owned reserve, including equipped copies, to make one Legendary Omni Ammo instance. It must work at capacity one; never require all five ingredients equipped. Apply the documented loadout replacement/overflow rules and show the result before Forge.

Legendary occupies one active slot and applies all five purple effects. It is forge-only and once per run. Do not stack a normal ammo effect on top of the same legendary effect, allow recursive chain hits, or duplicate an equipped cartridge in storage. Merges, forging, and capacity purchases must commit ownership, equipped references, and settlement flags together and survive save/resume.

Before combat-content expansion, run docs/design_checks.py and an actual isolated-boss/sparse/dense combat harness. Record DPS, burn funding, overkill, control and time-to-clear at each ammo tier and passive cap; the 4.8D lifetime crowd bound is not single-target DPS. Verify the proposed post-forge capacity stabilizer and non-collector green-floor path. Use the plan's combined-effects-per-shot working default unless the user explicitly changes that decision. Passive math-earned stat modules remain the separate reward system. The free math choice does not produce Ammo Expanders or shortcut the legendary recipe.

Verify all four normal tiers for each type; capacity 1→2→3→4 and rejection of a fifth slot; automatic free-slot equip versus reserve-only pickup; duplicate-type equip rejection; merging with an equipped ingredient; missing/wrong-tier/duplicate-type legendary ingredients; successful forge from reserve at capacity one; occupied-slot replacement without losing unconsumed cartridges; repeated Forge clicks; no legendary overlap stacking; bounded chain behavior; and save/resume during projectiles, burning, and a pending forge. Check the normal economy separately: forty white-equivalents are required for the recipe, and seeded ten-wave acquisition paths should allow a deliberate collector to forge before the final boss.

Use the approved cartridge/icon art and bounded VFX from Prompts 7A and 7B. Verify touch shop scrolling without purchases, readable four-offer layouts, tap-based reserve/equip/merge controls, and the five-ingredient forge preview at capacity one on real phones in both orientations. Measure standard and compact rulesets on minimum mobile hardware. Lower cosmetics first, then use the explicit versioned caps/queued-admission policy or saved ruleset transition; never delete live enemies, pending hits or loot to hide overload, and do not treat repeated Resume stalls as acceptable degradation. Report actual verified behavior and remaining balance work. Do not mark the progression complete solely because a developer-filled inventory can craft legendary.
```

**Asset delivery requirements**

Request high-resolution masters but judge them at actual desktop and mobile gameplay scales in portrait and landscape. Proposed starting targets: marine and ordinary slimes use 96×96 final frames displayed around 72 pixels; boss frames use 192×192 displayed around 144 pixels; inventory icons display at 48 pixels. These are starting art targets, not a fixed phone-canvas scale. Adjust after the first responsive visual proof, keeping characters and telegraphs readable and collision dimensions independent of art.

- Preserve raw references and all source IDs/URLs. Store installed assets separately with stable names, such as `marine_run`, `slime_drifter_move`, `icon_pulse_blaster`, `ammo_piercing`, `ammo_multi_shot`, `ammo_electric_chain`, `ammo_frost`, `ammo_fiery`, `ammo_legendary_omni`, and `trinket_ammo_expander`.
- Each animation needs its transparent PNG sheet and verified metadata: frame dimensions, grid, count, intended playback rate, loop/one-shot behavior, origin, and any event frame. Retain the returned metadata before creating an engine-specific manifest.
- Keep each texture within the project's chosen compatibility budget, initially 4096 pixels per dimension. Split or pack sheets when required; never silently omit animation frames.
- Check for clipped feet, camera turns, drifting scale, detached features, mismatched first/last loop frames, leftover plate color, lost slime edges, and inconsistent views. Regenerate substantial motion/identity errors. Normalize uniform frame padding and baseline only when the underlying animation is sound.
- Test each keyed sprite over both light and dark backgrounds and the real Martian ground. Keep shadows as separate runtime elements.
- Check rarity labels/pips, item-versus-enemy distinction, and telegraph geometry in grayscale and common color-vision simulations, followed by a user check. Color alone cannot communicate rarity, danger, or selection.
- Track educational speech by content version and review status separately from cosmetic sound effects. Every K–1 production item requires a verified spoken prompt, hint, and explanation before the pack is available at launch.
- Record a status for each asset: candidate, selected master, animated, keyed, integrated, or verified in play. These stages are not interchangeable.
