# Math on Mars — WizardGenie prompt pack

Updated September 13, 2026 for the personal-use MVP, confirmed countdown/correction rules, and proposed ticket breakdown. [GAME_PLAN.md](./GAME_PLAN.md) governs product behavior; [ARCHITECTURE.md](./ARCHITECTURE.md) governs implementation contracts. These prompts are instructions to adapt, not completed assets or implemented features.

## Draft ticket coverage

Ticket numbers below refer to the proposed 20-ticket breakdown, not published GitHub issues. Publication and final granularity remain pending owner approval. Each implementation request should complete only its named ticket, including its UI, state, persistence where available, and relevant checks.

| Draft ticket | Prompt coverage | Deliverable ownership |
| --- | --- | --- |
| 1 — Three combat waves | 0, 10 | Runnable touch/keyboard combat; temporary art allowed |
| 2 — Complete math loop | 8A, 8B, 8D, 10 | Five-question timer, reward, then mandatory corrections |
| 3 — Local profiles/intermission saves | 8C, 11 | Profile picker and durable quiz/reward/correction state |
| 4 — Combat resume | 11 | Combat snapshots and interruption recovery |
| 5 — Salvage shop | 7A, 12A | Four offers, passive catalog, purchases and refill |
| 6 — Ammo inventory/merges/Expanders | 7A, 7B, 12 | Reserve, caches, Piercing/Multi Shot and capacity |
| 7 — Electric Chain | 7A, 7B, 12 | Chain icon, actual-hit feedback, bounded combat effect |
| 8 — Frost/Fiery | 7A, 7B, 12 | Type icons, status feedback and saved effects |
| 9 — Legendary forge | 7A, 7B, 12 | Legendary icon, ingredient preview and combined effect |
| 10 — Narrated K–1 | 8A, 8C, 8D, 9A, 13 | Tasks, diagrams, narration, correction help |
| 11 — Grades 2–3 | 8A, 8C, 8D, 13 | Selected arithmetic tracks and history |
| 12 — Grade 4 | 8A, 8C, 8D, 13 | Larger multiplication and fraction entry |
| 13 — Grades 5–6 | 8A, 8C, 8D, 13 | Decimals, fractions, ratios and equations |
| 14 — Spitter/Charger | 3, 4, 14 | Behavior, masters, animations, telegraphs and restore |
| 15 — Splitter/Overmind missions | 3, 4, 14 | Enemy/boss assets, behavior, missions and victory |
| 16 — Mars visual style | 1, 2, 4, 5, 6, 8A, 8B | Reference sheet, marine/Drifter animations, arena and core UI |
| 17 — Spoken equipment guidance | 9A | Reward/cache/shop/loadout narration and recovery |
| 18 — Profile recovery/transfer | 11 | Export/import, backup recovery and conflicting writes |
| 19 — Offline play | 15 | Installed packs, readiness and safe version updates |
| 20 — Integrated personal MVP | 9B, 16 | Sound/music integration, final full-loop checks and distribution |

The draft's asset sequencing needs an explicit production gate: ticket 16 establishes the reference sheet before production batches in tickets 6–9 and 14–15. Their mechanics can proceed with temporary assets. Integrate each type/enemy's production assets in its owning ticket after the sheet is approved. Ticket 20 verifies completeness rather than owning every missing animation. Sound/music is an explicit work package under ticket 20; splitting it into a separate ticket remains a proposed granularity change, not an approved new issue.

**How to use this pack**

For a copyable project-conventions skill, optional memory seeds and session opener, use [WIZARDGENIE_SETUP.md](./WIZARDGENIE_SETUP.md). It points back to the current PRD, architecture and memory bank instead of duplicating their rules.

All paths inside the copyable prompts are relative to the repository root. Planning files live in `docs/`; preserved screenshots remain under `references/`. Apply the PRD's mobile launch requirements to every implementation prompt, including early prototypes.

For implementation and asset integration, also read [ARCHITECTURE.md](/Users/tig/Desktop/tigran/mathonmars/docs/ARCHITECTURE.md) for state ownership, save contracts, and installed asset/content manifests. GAME_PLAN.md continues to govern gameplay and launch scope.

Implement the confirmed five-question countdown and post-reward corrections. Keep white reward magnitude, mission lengths, supply schedules, and the Omni stabilizer labeled as prototype tuning. Check current positive-gain, cache-settlement, and persistence contracts before implementation.

Use one asset or one milestone per request. Start with the shared brief and a small set of candidates: marine, Drifter, Martian terrain, and a sample UI panel. Assemble them into the Math on Mars reference sheet with a gameplay-size view and obtain approval before batch asset generation or animation. Once approved, attach that sheet as the primary visual authority along with the selected character/object master when identity must be preserved; describe only the required change. The reference sheet is a planned deliverable and has not yet been created or approved.

The reference sheet must include desktop, phone portrait, and phone landscape compositions with readable characters, telegraphs, HUD, thumb zones, and a sample math keypad. Use those views to judge scale and safe margins before generating more assets. Decorative panels must support reflow; text and controls stay in the runtime UI.

Follow the reference roles in GAME_PLAN.md: Backwoods screenshots guide arena/future-hub composition, character scale, enemy readability, environmental detail, and combat HUD placement; Goblin Gutter guides smooth chibi rendering, outlines, shading, view, and animation conventions; Quizcaster guides the educational UI and expansion menus. Resolve visual conflicts using the approved Math on Mars sheet. Gameplay and launch scope continue to come from GAME_PLAN.md.

For UI work, read [QUIZCASTER_REFERENCES.md](/Users/tig/Desktop/tigran/mathonmars/docs/QUIZCASTER_REFERENCES.md) and inspect the three preserved images under `references/quizcaster`. They guide layout and hierarchy; GAME_PLAN.md controls scoring, reward pools, ammo capacity, and the forge-only legendary. Use the question image for Prompt 8A, upgrade image for Prompt 8B, and study-menu image for Prompt 8C. Their artwork and pictured future features are not instructions to change our art style or launch scope.

At execution time, inspect the actual WizardGenie project, available generation tools, supported animation/keying workflow, and current schemas and prices. Historical AutoSprite version names are not proof of live availability. Retain source IDs, installed outputs, and returned metadata.

**Prompt 0 — shared project brief**

```text
We are making Math on Mars, a personal-use browser MVP for desktop, phones, and tablets inspired by Goblin Gutter. Read docs/GAME_PLAN.md and docs/ARCHITECTURE.md. Build the home-use core run with local profiles and selected practice tracks for all seven grades K–6, including spoken K–1 support. Hub, accounts, classroom tools, and formal educator/learner-study gates are outside this MVP.

After each ordinary wave, ask exactly five mandatory questions with one shared 30-second countdown. At completion, more than 20 seconds remaining gives purple, more than 10 gives blue, more than zero gives green, and zero gives white. Each wrong initial answer lowers that candidate one tier, with white as floor. At zero, finish every unanswered question. Choose one of three rewards, then retry every missed question untimed until correct before caches/shop/next wave. Corrections never change the selected reward or original accuracy. No charge score, skipping, immediate retry, per-item timer, or streak applies.

Mobile is launch scope: support portrait and landscape, a floating virtual movement stick, auto-aim/fire, reachable med-kit/pause buttons, and a mirrored handedness setting. Support moving and using med-kit with separate fingers. Reflow the HUD, math keypad, cards, shop, and inventory without shrinking controls or hiding choices. Use the PRD's safe-area, text, touch-target, interruption, and real-device acceptance requirements. Keep physics and reward rules independent of screen size. Do not require fullscreen, an orientation lock, hover, right-click, or drag-only inventory interaction.

Combat uses exactly one Pulse Blaster in one weapon slot. Ammo types are Piercing, Multi Shot, Electric Chain, Frost, and Fiery, each progressing White T1 to Green T2 to Blue T3 to Purple T4 through matching-pair merges. One purple of each type forges Legendary Omni Ammo with all five purple effects. The gun starts with one active ammo slot; the shop's Ammo Expander adds one per purchase, capped at four. Reserve storage is separate from active capacity, so five legendary ingredients never require five active slots. Use the confirmed reusable ammo types, combined effects per shot, and legendary occupying one slot; projectiles are continuous rather than a finite bullet supply.

Reference roles: use Backwoods for world composition, scale, readability, environmental detail, and combat HUD placement; Goblin Gutter for smooth chibi rendering and animation continuity; Quizcaster for math questions, reward selection, progress indicators, and future subject menus. Before batch production, create and obtain approval for a Math on Mars reference sheet containing the marine, a slime, Martian terrain, and a sample UI panel, with a gameplay-size comparison. Once approved, use that sheet as the primary visual reference for every asset request and use individual approved masters to preserve identity. Reference images do not alter the gameplay rules or add a hub or future subjects to launch scope.

Shared style clause: smooth stylized chibi science-fiction game illustration, strong clean dark silhouette outlines, polished cel shading with two to four value groups per material, compact readable shapes, restrained surface detail.

Shared view clause: fixed slight three-quarter overhead view for a top-down 2D game, consistent camera elevation and orthographic-like perspective, full subject visible, facing screen-right for the canonical character view.

Marine: compact 2–2.5-head proportions, off-white and navy exploration suit, broad helmet, horizontal cyan visor, orange shoulder patch, empty hands. The suit is the fixed base appearance for this release. The one gun is a separate sprite on a single shoulder-side mount; ammo changes the shot's appearance, never the number of guns.

World: muted rusty Martian soil, charcoal equipment, sparse off-white outpost structures. Keep ground contrast lower than characters. Slimes have different silhouettes as well as different colors. Hostile warnings use orange-red with distinct ring, line, or cone geometry. Item quality uses text and one/two/three/four pips for white/green/blue/purple in the runtime interface, never color alone. Enemy bodies do not carry rarity frames.

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
Implement readable ammo feedback using the approved single Pulse Blaster and cartridge art. Follow the mechanical definitions and confirmed combined-effects rule in docs/GAME_PLAN.md. There is one gun regardless of ammo capacity. Use bounded runtime effects rather than a separate fully generated animation for every possible ammo combination.

Piercing: a narrow elongated projectile and a brief through-hit streak. Multi Shot: a visible spread of distinct projectiles. Electric Chain: a short angular arc connecting actual chain-hit targets. Frost: a small crystal-shaped status mark and cool impact accent. Fiery: a small flame-shaped status mark and restrained warm burn pulses. Legendary: one distinct gold muzzle accent with the five functional effects, not five guns or five overlapping full-screen particle layers. Keep orange-red hostile warning geometry visible under all effects.

At fire time, snapshot equipped effects, total volley damage budget, piercing falloff, chain and funded-burn ledgers. Read the revised values from docs/GAME_PLAN.md: purple Multi Shot totals 1.6D before piercing, successive pierce damage halves, chain deals 0.20D per jump, and new burn damage shares a per-shot budget. A weak hit cannot refresh a strong burn for free. Boss Frost is half the ordinary tier value. Chain hits do not emit more shots; burn ticks do not trigger hit effects. Show actual resolved hits. The proposed post-forge +4% firing-rate stabilizer per purchased extra slot is explicit, once-only, and capped at +12%.

The loadout shows one weapon slot, an Active Ammo row with one to four available slots, and a grouped Ammo Reserve. Label every cartridge by type and T1–T4, or Legendary. Ammo Expander shows the current and next capacity, capped at four. The forge shows five distinct named purple ingredient checks sourced from owned reserve, including equipped copies, then previews which copies are consumed and where the legendary is equipped. Legendary uses one slot and shows All five effects. Mark redundant normal ammo effects when legendary already supplies them. On phones, wrap active slots and use scrollable reserve/ingredient rows with tap-to-select actions and an explicit Forge button; no drag-only interactions. Keep all five ingredient names and loadout changes available at readable size.

Check the display at desktop and phone gameplay sizes in both orientations and in grayscale/color-vision simulations, including Multi Shot + Piercing + Electric Chain + Fiery and the full legendary combination. Damage telegraphs, the marine, and remaining enemies must stay readable around thumb controls. Tier, capacity, and effect identity must not rely on color alone. Bound cosmetic particles and render resolution for mobile performance without changing hit effects or damage.
```

**Prompt 8A — five-question countdown screen**

Draft tickets 2 and 10–13; visual integration in ticket 16.

```text
Implement the between-wave quiz from docs/GAME_PLAN.md and docs/ARCHITECTURE.md. Use the Quizcaster question reference for layout and the approved Mars style for decoration. Show Question 1 of 5, the actual question/diagram, answer, full 7–8–9 / 4–5–6 / 1–2–3 / Backspace–0–Check keypad, and one visible 30-second countdown with White/Green/Blue/Purple labels and one-to-four pips.

Five questions apply to every grade. Start the shared clock on first problem exposure or item-specific speech. Initial/replayed task speech consumes time; Check remains available during playback. A valid first submission settles the answer once and advances, queuing misses for later correction. Malformed/incomplete input is validation, not a wrong answer. At zero the timer stays zero and all unanswered questions remain mandatory. There is no Skip, End quiz, immediate retry, charge rail, per-item timer, or streak.

Use unrounded remaining time at the fifth initial answer for the candidate: over 20 seconds purple, over 10 blue, over zero green, zero white. Exact 20 is blue and exact 10 is green. Deduct one tier per wrong initial answer with white as floor. Save the original answers, wrong count, frozen time and correction queue. Proceed to reward selection, never directly to corrections or the next wave.

Render equations and diagrams from real data, with exact fraction/decimal evaluation. Support keyboard and touch, visible focus, 48-pixel minimum targets, large K–1 keys where practical, fraction fields and a decimal key. Keep task, answer, and Check visible in both orientations; normal menu scrolling must remain available. Countdown uses the same rules across devices and grades.

Provide Replay and Save & Exit; hint/worked-explanation controls belong to the later correction round. A genuine pause or major relayout conceals the task, stops speech and suspends time. Preserve draft and countdown through resume. Capture timing at command acceptance; storage latency cannot consume the budget. Ignore stale audio callbacks and duplicate input. Test boundaries, wrong answers, zero-time completion, validation, pause/rotation, and held input crossing into reward selection.
```


**Prompt 8B — reward choice before corrections**

Draft ticket 2; catalog expansion in ticket 5; visual integration in ticket 16.

```text
Implement three reward cards using the Quizcaster upgrade reference and current Mars visual style. Show completion time, starting rarity, wrong-answer drops, and final White/Green/Blue/Purple rarity with text and pips. For example, 24 seconds remaining with one wrong answer yields blue; finishing at zero yields white regardless of accuracy. Use saved outcomes rather than hardcoded examples. There is no charge breakdown or continuous strength multiplier.

Each card shows a family icon, variant name, exact gains, resulting stats and an explicit Choose action. Offer three distinct useful variants. Prototype tuning: white gives half the first base modifier, green the full first, blue adds the second, purple adds the third. Each promised modifier must provide positive actual gain after caps; identify this magnitude policy as tuning, not a newly confirmed owner requirement.

Keep all three cards readable on desktop and phones. Scrolling/cancelled gestures and held answer input cannot choose a card. Preserve offers through save/resume, award once, and prevent shopping from rerolling them. Commit selection and phase transition together. If misses exist, open the mandatory untimed correction round; otherwise continue to caches/shop. Choosing a reward never bypasses outstanding corrections.

Math rewards are passive modules, separate from ammo progression. They do not grant an Ammo Expander or legendary fusion. Add replayable fixed descriptions through the equipment-narration ticket; dynamic stat totals remain real accessible text.
```


**Prompt 8C — profile and mission terminal**

Draft tickets 3 and 10–15.

```text
Implement a responsive local-profile and mission terminal using the Quizcaster study-menu reference for grouping, with Mars styling. Show nickname/avatar, selected grade/skill, independent combat difficulty, mission preset, and Resume when an active run exists. New run must offer explicit abandonment rather than silently discard progress.

The finished MVP exposes all seven K–6 practice tracks. During incremental development, clearly distinguish implemented tracks from unavailable ones. Selecting a grade never changes the five-question count, 30-second timer, enemy health, or combat difficulty. Keep selected skill fixed for a run. Show simple original first-attempt practice history and separate correction completion, not game rarity as mastery.

Use real labels, keyboard focus, large touch targets, responsive grade tiles, scrolling, and a visible native profile-name field when the OS keyboard opens. Future subjects, permanent hub progression, accounts and classroom tools remain outside this task. Implement only the currently assigned ticket's menu and content paths.
```

**Prompt 8D — mandatory correction round**

Draft ticket 2; content expansion in tickets 10–13.

```text
After the reward is selected, present every incorrectly answered initial question in an untimed correction round. Reuse its saved problem, show helpful feedback, and provide hints/worked explanations and replayable narration where supported. The learner must enter the correct answer before that correction completes. A further wrong answer keeps it pending with no additional reward penalty. There is no Skip or direct Next wave action while corrections remain.

Keep original answers/accuracy and the already-chosen reward unchanged. Save correction attempts and queue progress separately and idempotently. Resume the same correction after reload, including draft and narration recovery. When the queue is empty, proceed to caches/shop; an initially empty queue needs no correction screen. Verify repeated misses, helped correct answers, duplicate submission, reload, and inability to bypass corrections.
```


**Prompt 9A — K–1 task and equipment narration**

Draft ticket 10 owns math/task speech; ticket 17 owns equipment-management speech.

```text
Prepare authored K–1 questions, displayed diagrams, computed answers, spoken tasks, correction hints and worked explanations using the current game plan. Check arithmetic and transcripts directly. This personal MVP does not require an educator assignment, recruited learner sessions, a fixed 500-item quota, or a review report.

Create a deduplicated exact-text manifest and inspect available voices, supported schema, output formats and current prices before paid generation. Stay within authorized scope/budget. Use one consistent narrator and complete clips for unique spoken strings; reuse identical clips. Retain content version, item/text ID, clip role, transcript, voice/source ID, local output, and file hash. Bundle installed audio for offline use after download.

Ticket 10 includes initial tasks, Replay, keypad/Check onboarding, and correction hints/explanations. The initial task must not reveal a counting answer. Worked explanations belong after reward selection, during corrections. Answer entry stays enabled during initial narration; the same shared countdown includes task speech and Replay. Pause stops speech and conceals the question, and resume preserves time. Missing required audio keeps an unready item out of the set; a playback failure pauses with recovery rather than skipping a question.

Ticket 17 adds fixed spoken descriptions of reward priorities and all four rarities, ammo identity/tier, cache choices, buying, equipping, merging, forging, Next wave and Save & Exit. Dynamic numerical totals remain accessible text; do not generate a clip for every possible stat combination. Inspect the complete quiz → reward → corrections → shop path using developer checks, including audio cancellation, rotation, app switching, and repeated playback. Each ticket owns its manifest entries and integration, not just generated files.
```

Example: five rendered cells use “How many energy cells are there? Enter the number, then press Check.” The task does not announce five. The correction explanation can state the answer, but the learner still enters it to complete the correction.


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
| Correction retry | Gentle low two-note prompt, neutral and unobtrusive, about 0.3 seconds |
| Reward ready | Rising energy swell resolving into a satisfying clean tone, about 1 second |
| Upgrade selected | Crisp mechanical click plus a small electronic lift, about 0.5 seconds |
| Boss warning | Distinct descending synthetic alert, about 1 second, no piercing alarm |

Draft ticket 20 owns integrating these effects, volume/mute controls, phase transitions, and two initial music tracks: combat and quiz/corrections/shop. If audio becomes a separate ticket, transfer this whole work package. Keep narration intelligible with music ducking. Test loop boundaries, repeated effects, user-gesture audio unlock, pause and app-switch recovery. Generate two music tracks initially: combat and quiz/shop. Add a separate boss track after the main loop works.

```text
Create an original seamless-loop instrumental for Math on Mars combat. Energetic but playful science-fiction synth score, approximately 112 BPM, springy electronic bass, light percussion, bright spacious motifs, adventurous cartoon tone. Leave room for frequent short sound effects. No vocals, dramatic intro, abrupt ending, or recognizable melody from another work. Target 60–90 seconds if the selected tool supports it. Verify the loop boundary after export.
```

```text
Create an original seamless-loop instrumental for the math quiz, correction and shop screens in Math on Mars. Calm spacious science-fiction ambience, gentle soft synth pulses, approximately 75 BPM, very sparse percussion and melody, supportive and curious mood. No ticking clock, urgent build, vocals, startling transients, or recognizable melody from another work. Target 60–90 seconds if supported. It should sit quietly under mathematical thinking and feedback chimes.
```

**Prompt 10 — playable combat and math slices**

Run draft ticket 1 first, then ticket 2 as a separate request.

```text
Read the actual project runtime and current game plan/architecture. Establish a runnable browser project with pinned compatible versions. Use temporary art until the reference sheet and production assets exist; record temporary coverage explicitly.

For ticket 1, deliver three escalating combat waves with a moving marine, one automatic Pulse Blaster, white Piercing, Drifters, Suit Integrity, med-kit, drops, pause, defeat/restart and final-wave victory. Use plain serializable simulation state and separate views. An ordinary wave clears only after scheduled/queued spawns and surviving enemies are exhausted. Support keyboard plus floating touch movement, simultaneous med-kit use, mirrored handedness, safe areas, and both phone orientations. Cancel held input on blur, pointer loss or phase change. Between waves a temporary Continue screen is sufficient before ticket 2.

For ticket 2, replace those breaks with two grade-3 five-question quizzes using Prompts 8A, 8B and 8D. One shared 30-second countdown determines purple/blue/green/white; each wrong first answer drops one tier. Timeout leaves unanswered items mandatory. Reward choice precedes untimed correct-until-complete corrections. Apply the chosen module to the next wave. End the final wave directly with a summary. Keep an explicit local profile identity so later saves can preserve original accuracy.

Verify each ticket's complete playable path, defeat/restart, keyboard/touch input and relevant rules. Ticket 2 checks exact 20/10/0 boundaries, zero-to-five misses, late completion, validation, pause and duplicate actions. Inspect available real devices and report untested limitations honestly. Keep full shop, additional ammo, enemy roster, and grade expansion with their owning tickets. No learner-study gate or historical charge calculation applies.
```


**Prompt 11 — durable profiles and recovery**

Use separately for draft tickets 3, 4, and 18. Each later feature extends its own saved state.

```text
Follow the current profile and transaction contracts. Ticket 3 provides isolated local profiles and Save & Exit/Resume for initial questions, reward selection and corrections. Persist five exact question instances, original answers, shared elapsed/countdown state, wrong count, fixed offers, selected reward and pending correction queue. Commit each answer once; commit reward and correction-phase entry together. Preserve original history after defeat or abandon. No charge, streak, promotion windows or fabricated timeout answers belong in saves.

Ticket 4 adds combat checkpoints and Save & Exit restoring enemies, projectiles, HP, pickups, RNG, cooldowns and existing effects. Hidden time never advances play. Each ammo/shop/enemy ticket subsequently adds and verifies its own state, including in-flight payloads and transaction receipts. Profile switching pauses/saves the old run and loads only the selected profile.

Use atomic local persistence, stable command IDs, serialized writes and separate interaction/simulation/storage revisions. Look up matching receipts before fresh-command phase guards. Pause on save failure with retry/recovery; never claim a save succeeded when it did not. Periodic combat saving must not invalidate an otherwise valid answer or card action.

Ticket 18 adds export/import of a selected profile, explicit replacement choice, last-valid-backup recovery, corrupt/unsupported-save handling and conflicting-tab protection. Preserve recoverable history when a run cannot resume. Verify actual export cancellation/failure and import/restore with developer checks; formal inactivity studies and external backup evidence gates are not required.

For the assigned ticket, check duplicate actions, interrupted/uncertain writes, reload in its phases, sibling isolation, app switching and rotation. Corrections cannot be lost or used to alter original accuracy; the countdown never restarts on resume.
```

**Prompt 12A — salvage shop and passive upgrades**

Draft ticket 5.

```text
Build the four-offer between-wave shop after mandatory corrections. Earn salvage in combat and buy passive modules or med-kits with explicit costs and resulting gains. Complete the six-family/18-variant catalog and four reward rarities from the game plan, with positive useful gains and configurable caps. White magnitude remains prototype tuning. Include armor/HP effects in actual combat rather than decorative stats.

Purchases settle once and survive resume. Purchased slots remain empty; buying all four triggers one free refill. Paid rerolls affect only eligible unpurchased slots; preserve valid locks if included. Replace newly capped/invalid offers without counting that as a purchase. Preserve math reward choices independently of the shop. Support readable touch scrolling without accidental purchases and keyboard focus. Add ammo/Expanders through ticket 6 rather than pretending unimplemented offers work.
```


**Prompt 12 — ammo progression and legendary fusion by ticket**

Draft tickets 6–9. Use one ticket per request: 6 owns reserve/caches/merges/Expanders and Piercing/Multi Shot; 7 owns Chain; 8 owns Frost/Fiery; 9 owns legendary. Each owns its type icons, effects, persistence and checks. Use temporary assets until the reference sheet is approved, then integrate production art in the owning ticket.

```text
Implement only the assigned ammo ticket from docs/GAME_PLAN.md after its declared blockers are complete. The remaining paragraphs describe the completed system: apply only contracts for types/features available in this ticket, and defer unavailable types, five-type collector choices and forge actions to their owning tickets. Never display a functioning offer for an unimplemented effect. Each later ticket extends the catalog, supply choices, manifests and saved state. Preserve exactly one gun and one weapon slot. Add Piercing, Multi Shot, Electric Chain, Frost, and Fiery ammo in White T1, Green T2, Blue T3, and Purple T4, with reusable run-long cartridge ownership, grouped reserve, active equipment references, and the documented effect values.

Use the PRD's explicit supply milestone schedule: fixed pair-of-blue choices across all five types plus the ordinary-module alternative, with five distinct type choices furnishing forty white-equivalents in ten cartridges. Optional drops use a persisted five-type shuffle bag. Guarantee eight first-clear salvage and reserve the affordable first Expander offer. Combat pickups update memory and the next checkpoint; do not freeze/commit IndexedDB on every pickup. Add direct ammo pickups, cache contents, and ammo shop offers. Ammo capacity starts at one. The shop-only Ammo Expander grants +1 active slot per purchase to a hard maximum of four; it is not multiplied by rarity, math strength, or other stat scaling. Exclude invalid offers at the cap and reject a stale purchase without charging salvage. Keep the four-offer shop's existing auto-refill, reroll, and valid-lock behavior.

Milestone caches offer six mutually exclusive options: five blue pairs and one fixed green base-value module. A single choice accepts or sells one complete bundle and closes all alternatives atomically. Grant caches are a separate type with individually granted items; reject their commands against choice caches. A capped cache module keeps its fixed sell quote. Shop purchased slots stay empty until all four are bought, then refill once. Test choosing two different cache options, a failed write, retry and resume. The blue-pair schedule permits purple after wave one; use it as adjustable prototype tuning and change its timing if it bypasses too much of the tier progression.

Normal merge consumes two copies of one type and one tier below purple to make the next tier. Legendary fusion consumes exactly one purple of every distinct type from the entire owned reserve, including equipped copies, to make one Legendary Omni Ammo instance. It must work at capacity one; never require all five ingredients equipped. Apply the documented loadout replacement/overflow rules and show the result before Forge.

Legendary occupies one active slot and applies all five purple effects. It is forge-only and once per run. Do not stack a normal ammo effect on top of the same legendary effect, allow recursive chain hits, or duplicate an equipped cartridge in storage. Merges, forging, and capacity purchases must commit ownership, equipped references, and settlement flags together and survive save/resume.

Run focused combat checks for the implemented types against a boss and crowds, including funded burns, control and bounded combined damage. The 4.8D lifetime crowd bound is not single-target DPS. Historical design_checks.py formulas do not validate the current quiz. Check white-floor and non-forge progression. Combined reusable effects and one-slot legendary are confirmed; the post-forge capacity stabilizer remains optional tuning. Math rewards remain passive modules and do not shortcut the legendary recipe.

Verify all four normal tiers for each type; capacity 1→2→3→4 and rejection of a fifth slot; automatic free-slot equip versus reserve-only pickup; duplicate-type equip rejection; merging with an equipped ingredient; missing/wrong-tier/duplicate-type legendary ingredients; successful forge from reserve at capacity one; occupied-slot replacement without losing unconsumed cartridges; repeated Forge clicks; no legendary overlap stacking; bounded chain behavior; and save/resume during projectiles, burning, and a pending forge. Check the normal economy separately: forty white-equivalents are required for the recipe, and seeded ten-wave acquisition paths should allow a deliberate collector to forge before the final boss.

Use the approved cartridge/icon art and bounded VFX from Prompts 7A and 7B. Verify touch shop scrolling without purchases, readable four-offer layouts, tap-based reserve/equip/merge controls, and the five-ingredient forge preview at capacity one on real phones in both orientations. Measure standard and compact rulesets on minimum mobile hardware. Lower cosmetics first, then use the explicit versioned caps/queued-admission policy or saved ruleset transition; never delete live enemies, pending hits or loot to hide overload, and do not treat repeated Resume stalls as acceptable degradation. Report actual verified behavior and remaining balance work. Do not mark the progression complete solely because a developer-filled inventory can craft legendary.
```

**Prompt 13 — grade-track vertical slices**

Draft tickets 10–13; one ticket per request.

```text
Make the assigned grade track playable from profile/skill selection through five initial questions, countdown reward, corrections and saved history. Use bounded deterministic templates, computed exact answers, explanations and the appropriate keypad/diagram. Keep the shared timer and combat rules unchanged across grades.

Ticket 10: K counting/comparison/composition and grade-1 addition/subtraction/missing addends, with Prompt 9A speech. Ticket 11: grade-2 arithmetic/place value and grade-3 multiplication/exact division. Ticket 12: grade-4 larger multiplication, equivalent fractions and like-denominator sums. Ticket 13: grade-5 decimals/unlike-denominator fractions and grade-6 ratios/unit rates, fraction division and one-step equations.

Check operand boundaries, fraction equivalence policy, zero-denominator rejection, decimals, diagrams and correction explanations. Preserve exact instances and initial/correction history through reload. Add content/audio to the installed-pack contract when offline delivery exists. No external reviewer, assessment study, or fixed bank-size quota gates this MVP.
```

**Prompt 14 — enemies and complete missions**

Draft tickets 14 and 15; production assets depend on the approved reference sheet.

```text
Ticket 14 adds Spitter and Charger behavior, their Prompt 3 masters and Prompt 4 animations, visible shots/windups, damage, wave cleanup, and saved attack state. Ticket 15 adds Splitter children and Overmind boss attacks, matching masters/animations, mission presets, independent combat difficulty, victory/defeat summaries and final-wave quiz bypass.

Mechanics may start with temporary art. Integrate each enemy's production frames, origin/grid metadata, telegraphs and audio hooks in its owning ticket once assets are available. Keep movement, spawning, projectiles and damage controlled by simulation rather than baked into animation. Check phone portrait/landscape readability, resume during attacks, splitter-child cleanup, and boss terminal ordering. Prototype mission lengths and balance are adjustable. Follow existing save and asset contracts.
```

**Prompt 15 — downloaded/offline play**

Draft ticket 19.

```text
Make the installed game and downloaded content/audio playable offline on the published static origin. Show actual pack readiness; stage and validate required files before exposing a ready pack. Preserve versions required by active runs, handle interrupted downloads, and keep application update activation separate from an active session.

Include shell, combat assets and narrated K–1 content in the first complete offline path. Every later grade, audio or asset addition registers in the same pack contract. Verify offline reload/resume, missing-file recovery and update behavior without resetting quiz time or losing corrections. Report preview-host limitations; runtime API keys and live generation are not game dependencies.
```

**Prompt 16 — personal MVP integration and distribution**

Draft ticket 20, including the Prompt 9B audio work package.

```text
Integrate the completed tickets into a playable personal-use distribution. Install sound effects/music, phase transitions, mute/volume controls and narration ducking from Prompt 9B. Verify that every owning feature ticket supplied its production assets and manifests; complete small remaining integration gaps rather than defer all enemy animation work here.

Exercise all K–6 input tracks, win/defeat, timed and expired quizzes, reward-before-corrections, save/recovery, full shop/ammo/forge progression and offline content. Tune white-reward and non-forge viability. Check both phone orientations, touch cancellation, safe areas, dense combined effects and standard/compact performance. Fix functional failures and state which devices were actually tested.

Produce a runnable build with setup/run instructions and documented limitations. Establish the actual hosting target and use the session's deployment authorization for publication. This is a personal MVP: no recruited learners, educator sign-off, calibration samples or formal efficacy claims are required.
```

**Asset delivery requirements**

Request high-resolution masters but judge them at actual desktop and mobile gameplay scales in portrait and landscape. Proposed starting targets: marine and ordinary slimes use 96×96 final frames displayed around 72 pixels; boss frames use 192×192 displayed around 144 pixels; inventory icons display at 48 pixels. These are starting art targets, not a fixed phone-canvas scale. Adjust after the first responsive visual proof, keeping characters and telegraphs readable and collision dimensions independent of art.

- Preserve raw references and all source IDs/URLs. Store installed assets separately with stable names, such as `marine_run`, `slime_drifter_move`, `icon_pulse_blaster`, `ammo_piercing`, `ammo_multi_shot`, `ammo_electric_chain`, `ammo_frost`, `ammo_fiery`, `ammo_legendary_omni`, and `trinket_ammo_expander`.
- Each animation needs its transparent PNG sheet and verified metadata: frame dimensions, grid, count, intended playback rate, loop/one-shot behavior, origin, and any event frame. Retain the returned metadata before creating an engine-specific manifest.
- Keep each texture within the project's chosen compatibility budget, initially 4096 pixels per dimension. Split or pack sheets when required; never silently omit animation frames.
- Check for clipped feet, camera turns, drifting scale, detached features, mismatched first/last loop frames, leftover plate color, lost slime edges, and inconsistent views. Regenerate substantial motion/identity errors. Normalize uniform frame padding and baseline only when the underlying animation is sound.
- Test each keyed sprite over both light and dark backgrounds and the real Martian ground. Keep shadows as separate runtime elements.
- Check rarity labels/pips, item-versus-enemy distinction, and telegraph geometry in grayscale and common color-vision simulations, using direct developer inspection. Color alone cannot communicate rarity, danger, or selection.
- Track task speech by content version and validation status separately from cosmetic sound effects. Each playable K–1 item needs installed task speech and correction support; verify transcript, file references and playback directly. External reviewer sign-off is not required.
- Record a status for each asset: candidate, selected master, animated, keyed, integrated, or verified in play. These stages are not interchangeable.
