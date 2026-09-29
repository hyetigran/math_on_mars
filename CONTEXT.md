# Math on Mars

A personal-use math game where a marine fights slime waves and answers Kindergarten–Grade 5 math questions between waves to earn upgrades. Grade 6 is retired: older profiles default to Grade 5 and any Grade 6 active mission is discarded; historical Grade 6 practice records remain intact.

## Language

**Between-wave quiz**:
A configurable number of required math questions answered between non-final combat waves, regardless of grade. The Settings tab in base camp and mission setup saves 1–20 questions per wave and 1–300 seconds per question for the cadet (defaults: 5 questions and 8 seconds per question). The same Settings tab selects Input (default) or Multiple choice; multiple choice presents four stable, distinct answers in both the initial quiz and correction round, including exactly one correct answer. Distractors use nearby whole numbers, tenths for decimal tasks, or the task’s common-denominator units for fractions, staying within three units of the answer. Settings apply to new missions. Seconds per question × question count determines one shared countdown (40 seconds by default); answering never resets it, and pausing preserves its remaining time. Reward timing uses the proportion of the full quiz time budget remaining after all first attempts. Legacy saved quizzes without a configured time limit retain their shared 30-second countdown. Accuracy and speed determine the reward's power level; questions cannot be skipped in normal play, including after the countdown reaches zero. A clearly labeled QA · Skip quiz button bypasses quiz/review for testing and goes to reward selection without adding invented answers to practice history. It preserves an already-earned reward quality, or supplies a purple test reward when skipped before scoring finishes.
_Avoid_: Reactor charge calculation

Questions are selected from 163 checked-in, fixed adaptations of first-edition Illustrative Mathematics public practice problems (CC BY 4.0). Each carries a source URL, publisher problem reference, adaptation notes, and app-authored skill label; provenance is retained in practice history. The mission ID and grade shuffle the grade’s bank, and successive waves traverse that deck before cycling. Numbers are never generated and there is no template fallback. Existing saved quizzes retain their original questions. This is a selected-skill starter bank, not full-grade coverage or a validated mastery assessment. See content/questions/README.md.

**Reward power level**:
The white, green, blue, or purple quality earned from the between-wave quiz's completion time and first-attempt accuracy. Wrong initial answers lower the time-based quality, with white as the floor.
_Avoid_: Charge

**Correction round**:
The untimed retry of incorrectly answered quiz questions within the quiz stage, before reward selection. Corrections must be answered correctly and do not change the reward power level earned on first attempts.
_Avoid_: Immediate scored retry

**Ammo type**:
A reusable firing effect applied to the weapon's continuous supply of projectiles. Each equipped ammo type fires its own projectiles in each volley. Only Piercing projectiles pass through enemies; other projectiles stop on impact. Electric Chain can jump on impact. Total direct damage per volley is shared across types.
_Avoid_: Consumable bullet supply

**Legendary Omni Ammo**:
An ammo type formed from the five distinct purple ammo types, firing all five ammo types while occupying one active ammo slot.

## V2 language — agreed design, not yet implemented

**Town**:
A cadet's personal persistent colony, continued across devices, built on plots along predefined streets and inhabited by colonists. A transparent pressurized dome encloses the European-inspired streets, gardens, plazas, and rural plots, with the Martian landscape visible outside. One 3D scene supports elevated management and behind-character walking views; desktop/tablets take priority, with simplified phone controls and detail.
_Avoid_: Shared colony

**Town practice**:
The town's learning activity, separate from between-wave quizzes, supporting parent-assigned homework or self-selected topics from the question bank and earning construction progress.
_Avoid_: Between-wave quiz (when referring to town learning)

**Building inventory**:
Separate storage for owned buildings removed from plots using Store building instead of demolition. Completed upgrades persist; storage has no fee and placement on a compatible plot is instant and free. Stored buildings provide no services or capacity and still count toward singleton limits. Rehouse residents and transfer goods safely before storage, releasing workers; block storage if housing or goods capacity would be insufficient. Finish/cancel construction first; other job progress is preserved but paused until placement and operating requirements are restored.
_Avoid_: Warehouse (stores goods), demolition (replaced by building storage)

**Seed variety**:
A crop option permanently unlocked for the town through a one-time purchase. Automatic replanting requires no additional seed purchases or trade-credit spending; workers, water, and power sustain growing cycles. Basic varieties are immediately purchasable; research makes advanced varieties available for that one-time purchase.

**Growing cycle**:
The period between planting a player-selected crop and its harvest, with assigned colonists performing tending and harvesting.
_Avoid_: Continuous food production

**Neighborhood milestone**:
A development goal that advances the town toward new services or districts while allowing players to customize between goals.
_Avoid_: Daily task (when referring to town progression)

**Crafted equipment**:
Permanent armor or weapons retained across missions and after defeat, distinct from temporary mission upgrades. Advanced recipes combine battle-earned materials with town-made parts at the Armory. Progression uses crafted replacements with published stats and material costs; older pieces remain available. Initial V2 has no durability, repair costs, or randomized equipment stats.
_Avoid_: Legendary Omni Ammo (when referring to permanent equipment crafting)

**Armor slot**:
One of five permanent pre-mission equipment positions: Helm (firing speed), Armor/chest (damage reduction), Gloves (critical-hit chance), Legs (health), and Boots (movement). Equipped pieces visibly change the character; concrete stat formulas remain to define.

**Critical hit**:
A firing volley that deals twice its normal direct damage. One critical roll applies across the volley's ammo streams and pellets; Gloves increase its chance. It does not double status durations or trigger additional critical rolls. Chance values and treatment of secondary ammo damage remain to define.

**Hand slot**:
One of two weapon positions in the permanent pre-mission loadout. A one-handed weapon occupies one position; a two-handed weapon occupies both as a single item. Two distinct one-handed pistols may be dual-wielded. Preserve existing pistol behavior; rifles have higher base damage. Both configurations use one shared mission ammo setup.
_Avoid_: Ammo slot (a separate mission system)

**Research project**:
A staffed, timed Research Lab task paid for with trade credits and town materials, permanently unlocking crops, recipes, or advanced building tiers. One project runs at a time, separate from construction and equipment crafting; construction credit cannot accelerate it. Essential buildings do not require research. Projects pause without required staff or utilities, retaining progress until requirements are restored.

**Pending battle reward**:
A locally saved offline wave-10 victory awaiting once-only settlement on reconnect. Reveal the crafting material when collected; pending materials cannot be spent at the Armory.
_Avoid_: Available crafting material (before settlement)

**Crafting material**:
A persistent battle reward randomly awarded on completing the tenth and final wave, used with town-made parts to craft advanced equipment.
_Avoid_: Salvage (the mission-scoped currency)

**Armory**:
The staffed town building where permanent armor and weapons are crafted from battle-earned materials and town-made parts, using a queue separate from construction. Crafting pauses without required staff or utilities, retaining progress until requirements are restored.
_Avoid_: Workshop (the producer of town parts)

**Parent assignment**:
Town practice assigned by a parent using topics and a question count from the question bank, optionally with a due date. An overdue assignment does not damage the town.
_Avoid_: Uploaded homework (not included in initial V2 scope)

**Construction credit**:
Banked time earned by completing town practice and correcting mistakes, spent to accelerate a chosen construction project. Its award increases at town milestones, is shown before practice, and is fixed when earned. Credit neither expires nor has a storage cap; unused time remains banked and cannot accelerate equipment crafting or research.
_Avoid_: Trade credits, crafting material

**Construction slot**:
Capacity for one active building construction or upgrade project; a new town has two permanent slots, with more unlocked through the Construction Office. Its additional slots must be empty before the Office can be stored; storage removes them and redeployment restores them.
_Avoid_: Worker slot, crafting queue

**Held harvest**:
A completed crop or animal-product batch retained safely at its farm while town storage is full. It cannot be consumed or sold until transferred, and further crop/animal production pauses until transfer is possible.
_Avoid_: Stored food (before transfer)

**Building level**:
One of five successive upgrade stages, each improving a building's appearance and function while retaining its identity and plot fit.
_Avoid_: Floor (a level need not add a storey)

**Solar Plant**:
A town building that supplies power capacity to operating buildings.
_Avoid_: Solar Atelier

**Block Factory**:
A town building that produces building blocks for construction using locally available Martian material.
_Avoid_: Regolith Works

**Household food reserve**:
One day of household meals automatically protected before optional processing, trade, or animal-feed production. Inventory shows the protected amount; optional uses draw only from surplus. Serve basic meals for all households before preferences, rotating scarce preferred foods among households. Children receive smaller portions without priority based on happiness or job rank. Exact portions remain to tune.

**Neighborhood benefit**:
A positive effect from nearby buildings within walkable-street range. Each benefit type applies once using its strongest nearby source; different benefit types can combine, but repeated sources do not multiply the same bonus.

**Food preference**:
A colonist's stable favorite food or occasional changing craving, fulfilled by consuming a served portion. Preference fulfillment is distinct from simply having enough food. Favorites, cravings, and Café orders draw only from foods the player has unlocked.
_Avoid_: Food shortage (when referring only to an unmet preference)

**Colonist happiness**:
A colonist's satisfaction with food, surroundings, work, and relationships, summarized at household and town level. High happiness modestly benefits adult productivity and attracts arrivals; detailed calculation remains under design.
_Avoid_: Happiness currency

**Neighbor effect**:
A positive or negative effect arising from buildings or civic spaces being near each other, while ordinary town buildings remain allowed on any ordinary town plot. Proximity follows walkable streets. Block Factories, Workshops, and livestock facilities slightly reduce nearby residential happiness, using only the strongest nuisance. Solar and Water Plants are neutral to homes and benefit from being near each other. Preview affected homes before placement; exact strengths and range remain to tune.
_Avoid_: Zoning restriction

**Family household**:
A family formed naturally by colonists, with household formation and a later child request accepted by the player after checking housing and resources. A family may have up to two individually approved children, who remain children permanently; declining or postponing has no penalty. Families stay together when moved.
_Avoid_: Workforce (when referring to all family members)

**Livestock**:
Chickens, dairy cows, and pigs raised on larger rural plots to produce eggs, milk, and meat; meat processing is abstract and non-graphic. Workers use grain-based feed from the Mill; starting animals are included, lifecycle management is abstracted, and feed shortages pause output without killing animals.
_Avoid_: Cultivated meat (the proposed Protein Lab was not chosen)

**Child colonist**:
A permanent child member of a household, with food preferences, friendships, and street-level activities. Child colonists never age into adults and cannot fill production jobs. They occupy housing and use utilities, with lower food consumption than adults.
_Avoid_: Future worker

**Rural plot**:
A larger building plot on a predefined outskirts road, reserved for livestock facilities as an exception to ordinary town-plot placement freedom.
_Avoid_: Ordinary town plot

**Household unit**:
Accommodation occupied by one family or a group of single adults. A House contains one unit; Apartments contain multiple units, with exact capacities still to be tuned.
_Avoid_: Worker slot

**Plant Nursery**:
The town building that grows decorative trees, flowers, shrubs, and hedges. The Greenhouse remains dedicated to food crops.

**Workshop**:
The producer of town parts and crafted furnishings, including benches, fountains, planters, lamps, and basketball hoops. Permanent combat equipment is crafted at the Armory.

**Decoration**:
A decorative plant grown at the Plant Nursery or furnishing crafted at the Workshop, held in inventory before free placement and movement in designated street, plaza, or courtyard spaces. Placement keeps walking paths clear. Small play equipment is distinct from the complete five-level Playground amenity; individual effects and recipes remain to define.

**Playground**:
A freely relocatable amenity on an ordinary town plot, where children play and form friendships. Its five levels improve equipment and family-serving capacity without requiring a permanent worker.
_Avoid_: School

**Absence window**:
Up to 48 hours of production and consumption simulated while a player is away; both pause after that limit until return. Already-running construction, equipment crafting, and research may complete across the full absence. Crafting/research require staff and utilities during the simulated window; preserve their eligibility at its cutoff, letting eligible running jobs finish and leaving blocked jobs paused. New queued jobs start and pay inputs only within the simulated window, then wait for return. Stored buildings remain paused. Opening the town while connected reconciles saved progress and a fresh allowance begins when the player leaves; battle-only or parent-dashboard visits do not reset it.
_Avoid_: Construction time limit

**Preferred work**:
An adult colonist's favored work category, providing a small happiness bonus when matched by their assigned job. Other jobs remain available and fully usable; coworker friendships may also improve satisfaction.
_Avoid_: Job qualification

**Cadet town access**:
A parent account manages multiple cadet profiles without separate child email addresses, each owning a town. Only one device actively manages a particular town at a time, with explicit handoff.
_Avoid_: Shared multiplayer town

**Trade credits**:
Town currency earned through Market sales and Café orders and spent on basic supplies, seeds, decorations, and research projects.
_Avoid_: Construction credit, mission salvage

**Emergency meals**:
Starter-habitat food consumed directly to help a struggling town recover, unavailable for sale or processing.
_Avoid_: Trade goods

## V2 visual experiment

`town-prototype.html` is an isolated Three.js camera/asset experiment on the V2 worktree. Run `pnpm dev:town`; `pnpm build:town` builds it separately. It contains three selectable geometric buildings, a two-state House appearance preview, overview/walking controls, and a proxy character. The user-provided European-town references now inform additional attached-house scenery, a leafy lane, courtyard, fountain square, and agricultural edge; see `docs/V2_VISUAL_REFERENCES.md`. These scenery instances do not add simulated building functions. All changes are in memory; it does not implement the agreed town simulation or modify cadet saves. See `docs/V2_VISUAL_PROTOTYPE.md`.

## Connected town development slice

The separate connected-town entry uses a Node 24/SQLite development service for parent sign-in and durable parent-owned cadet towns. Server ownership checks guard reads and retry-safe cadet creation; sessions use expiring HttpOnly cookies. A saved House snapshot renders in both prototype camera modes with local upgrade previews disabled. This does not migrate or alter existing local battle profiles. Management leases and gameplay commands follow in later tickets. See `docs/V2_CONNECTED_TOWN.md` and ADR-0005 for setup and production limitations.

## Presentation

Typography uses locally bundled Oxanium for headings, buttons, and HUD labels, with Atkinson Hyperlegible Next for body copy and math. The archived Space Mission sheets are visual references, not font files; Oxanium approximates their geometric display style. Font files and licenses live in `src/assets/fonts/` and are included in the offline pack. Counters use tabular digits. The base camp has no headings or labels; its portal uses an E interaction bubble and the boundary-editor control uses an accessible icon.

Startup shows the splash artwork while camp and combat artwork, selected audio, and fonts preload. Decoded images are retained across missions so arena entry requires no new artwork downloads. Offline-pack installation starts in the background after the splash finishes. Startup then opens a walkable base camp using the v3 environment. The camera fills the viewport at a closer zoom and follows the marine within the artwork bounds. The camp uses the illustrated unarmed, eight-direction marine sprites; the original 3D bake is retained as source material but is no longer the displayed character. Walking advances with ground travel and stops on a planted-foot pose. Approaching the north portal reveals an E interaction bubble; E or tapping the bubble opens track selection and starts a fresh arena mission for the selected cadet. Every portal entry creates a new instance at wave one, including when an older saved mission exists. Exiting to camp or closing/reloading the game loses mission progress; there is no Save & Exit or mission resume. Pausing within the current game still preserves its state. Cadet settings and practice history persist. This supersedes save/resume requirements in older planning documents. The camp has no track dropdown or Crew page. This supersedes older planning documents that exclude a hub from launch scope.

Game audio uses the supplied camp/battle/boss music, environmental loops, combat effects, and quiz/reward/shop/interface feedback. Selected game audio preloads during the splash; unavailable audio remains optional. Camp music attempts automatic playback as soon as camp opens. If the browser blocks audible autoplay, the first click or keypress unlocks playback. Battle music retains its position across waves within a mission and resets for a new mission; boss music starts from the beginning. Each action uses one selected SFX take (`_01` for numbered families); alternate takes are archived outside the repository and excluded from the build. There are no quiz or shop music assets yet. See `docs/AUDIO_AUDIT.md` for the inventory and wiring audit. Pausing stops combat audio and resumes the loops from their paused position; leaving the arena stops its loops and effects while the result cue can finish. Questions and equipment guidance remain text and visual, without spoken-help controls, audio readiness gates, or installed speech packs. This supersedes the earlier removal of all game audio.

The between-wave flow is Quiz → Select reward → Loot drops → Shop & inventory. All revealed loot is accepted or sold on its own screen, individually or all at once. The shop opens automatically as soon as the last loot decision is settled. Waves without loot go straight to the shop. Shop offers appear above inventory, with marine stats alongside; the loot decision panel is centered. Inventory displays six slots per page, with equipped ammo first and reserve stacks with explicit quantities. Empty slots fill the grid when fewer than six stacks remain; paging keeps extra owned items accessible without extending the grid. Installed upgrades are not displayed in inventory or included in its item counts; their effects appear in the marine stats panel. Total owned ammo and med-gel and section counts are visible; equipped ammo is excluded from reserve counts. Cards use larger item artwork and four rarity border colors, without visible level badges. The stats card includes a marine portrait; on narrow screens its values open from a Marine stats button. Shop and inventory fit the standard desktop and phone viewports, with scrolling retained as a fallback for smaller windows or enlarged text. Start wave remains visible. Between-wave screens have no Exit mission button; mission exit remains in the pause menu. Merge all combines every matching pair in one click, including newly created pairs, up to purple. Dragging ammo onto matching ammo combines that pair; a reserve stack containing duplicates can be dragged onto itself. Equipped ingredients preserve the resulting ammo in the loadout. Forging opens a dialog.

Pause darkens the battleground and applies a subtle 5px blur. Between-wave quiz, rewards, corrections, loot, and shop panels appear over a frozen image of the just-completed arena; combat is stopped underneath.

Combat salvage drops use compact 16-unit icons and a display-density-aware canvas for crisp rendering. Item drops appear as sealed chests, concealing type and rarity. Collected chests remain separate from equipment until explicitly accepted on Loot drops, after the quiz and reward selection. Their fixed contents are revealed together, with no chest-opening sequence. Uncollected drops are swept up at wave clear. Pending loot must be accepted or sold before the next wave; the final wave proceeds directly to the victory summary.

The camp includes an Edit boundaries tool. It shows the full artwork with a polygon for walkable ground and polygons for blocked scenery. Users can draw shapes, drag or add corners, undo edits, and save to test them immediately. Custom boundaries persist in local browser storage and can be exported/imported as versioned JSON. Invalid polygons and layouts that block the spawn or portal are rejected; absent or corrupt overrides use the built-in collision boundaries.

The built-in camp collision layout uses the owner-edited export in `src/camp-boundary-layout.ts` (outer boundary and five blocked polygons). Restore defaults returns to this authored layout. Browser-local edits continue to override it.

All finalized assets are organized by family under `src/assets/`, including approved masters, current marine source models, sprite sheets and optimized runtime files. Earlier models, experiments and reference screenshots are archived outside the repository in `../tmp_assets` (the parent `tigran` directory). Asset preparation and the playable build use only in-repository assets; see `src/assets/README.md` and `docs/ASSET_RELOCATION.json`.

Battle Zone uses the approved arena background and animated enemy run/attack sheets. Its marine uses the eight-direction dual-pistol idle, run, attack, and run-attack sheets recovered from the sibling archive into `src/assets/characters/marine/armed/`; camp retains its unarmed marine. While running, the marine faces his direction of travel; run-attack is used only when that direction matches his aim, otherwise the run animation continues while auto-fire aims independently. Stationary attack facing follows the target. `scripts/prepare-armed-marine.mjs` and `scripts/prepare-battle-assets.mjs` reproduce the optimized sheets and MP3 audio from in-repository masters.

Battle Zone matches Goblin Gutter’s world proportions: a 2,560 × 1,440 arena with a 2,371 × 1,271 inset play area and a 1,280 × 720 reference viewport. The canvas fills the entire available screen at every aspect ratio; its backing resolution uses device density up to 2× with a 3.7-million-pixel budget to avoid excessive Canvas rendering cost on large Retina displays; the camera adjusts its visible area without stretching the art or adding side bars. The camera smoothly follows the marine and stays inside the artwork. Regular enemies enter at the arena edges at least 360 units from the marine; the boss encounter starts near the center. Movement, charges, summons, and projectile cleanup all use shared world bounds from `src/battle-world.ts`. The arena uses its full 3,840 × 2,160 source resolution for the scrolling view.

The quiz power rail uses four illustrated energy-core badges in white, green, blue, and purple, with distinct silhouettes and accessible labels. Item cards retain numerical level badges.

Pause → Edit arena bounds opens the arena artwork for tracing a walkable polygon and blocked scenery. Drag corners, add/remove points, undo, import/export JSON, and Save & test in arena. Custom arena geometry is stored separately from camp geometry in this browser. Saving applies to marine movement and enemy movement/spawn placement; positions outside newly drawn ground are moved to valid ground without resetting mission progress. The central spawn must remain walkable. Defaults remain active until a custom layout is saved.

Supply bonuses are removed. There are no milestone ammo bundles or bonus armor choices. Progression uses quiz rewards, actual enemy loot, and shop purchases; legacy pending supply bonuses are discarded without granting items or salvage.

Weapon tuning lives in `content/balance/combat.ts`, with the settings guide in `docs/BALANCE.md`. Shots have a 320-unit targeting/travel cap and direct/chain hits stay inside the camera’s visible firing area. Projectile speed upgrades do not extend range. Standard and Piercing shots are laser streaks, Multi Shot uses green darts, Electric Chain uses violet zigzags, Frost uses icy shards, and Fiery uses flame bolts; mixed loadouts fire separate projectiles with their respective visual effects.

Normal waves use Goblin Gutter's timer caps: waves 1–3 are 30 seconds, 4–9 are 45 seconds, and 11–19 are 60 seconds. Clearing enemies can finish a wave early; the final boss is untimed (including the Short mission's wave 6). At expiry, surviving enemies disappear without drops and existing ground loot is swept up. The countdown uses saved simulation ticks, so pausing stops it and restoring preserves it. Source: the local Goblin Gutter `src/data/balance.json` and `src/objects/WaveDirector.js`.

Luck is an upgrade stat capped at +100%, available through Lucky Salvage modules and shown in Marine stats. Base chest chance is 8% per defeated enemy, multiplied by 1 + Luck (up to 16%). Every defeated enemy retains its base salvage and rolls a Luck × 50% chance for one additional salvage. Newly generated ammo and module shop offers roll a Luck × 50% chance to increase one rarity tier, capped at purple, with the corresponding price. Existing offers retain their rolled rarity. Luck does not change quiz rewards. Tuning lives in `content/balance/luck.ts`.

The camp boundary icon opens a map chooser for Base camp or Battleground. Both editors are accessible without starting a mission; arena edits from camp apply when the next battle starts. The in-battle pause editor remains available for immediate testing.

The battleground is a regular rectangular fenced Mars yard, replacing the asymmetric crater. Chain-link mesh and yellow radiation signs enclose a flat rust-red floor, following Goblin Gutter’s zone composition. Runtime art is the unchanged native 3840×2160 PNG at `src/assets/environment/arena/mars-arena-4k.png`, renamed from the user-supplied `sorceress-301b41a5-1789782162227.png`, with four concentric circular soil zones with an enlarged center, wider bands and rust-red/orange colors matched to the v004 reference, getting progressively lighter outward. The outer circles extend past the top/bottom fence rather than being flattened to fit, following the Backwoods gameplay_2 shading principle. World size stays 2560×1440; playable bounds align to the inside of the fence (91,115)–(2462,1300). Fence boundary edits use `math-on-mars-battle-fence-boundaries-v1`; old crater overrides remain stored but no longer apply.

Spitters fire pink projectiles directly on cooldown with no windup telegraph. Chargers show a thick red directional arrow at ground depth, below enemies, loot, and projectiles. Every equipped ammo type (up to four slots) fires its own stream; projectile visuals pulse, flicker, or shimmer using simulation time and freeze when paused. Streams have separate muzzle offsets for readability.

Startup removes `wgPlay` and `build` query parameters from the visible address and normalizes `/index.html` to its containing directory. Deploy the contents of `dist/` at the domain root for a plain domain URL; subdirectory previews retain their hosting prefix. Published offline pack verification remains enabled; legacy explicit build requests remain supported by the worker.

Development builds and local previews (localhost, 127.0.0.1, or [::1]) include a floating QA button during missions, opening the wave and ammo controls directly. The same controls remain available in Pause → QA · Jump to section. Choose combat or the quiz after any non-final wave, set salvage (0–1,000,000), and add up to four trinkets with selected rarities. Installed trinkets can be cleared first; stat caps still apply. Quiz jumps use the mission’s question settings and start with a fresh shared timer without adding practice records. Choose any wave in the current mission and up to four ammo pieces, each with its own rarity, including purple Legendary Omni. Jumping restarts combat at full health, replaces owned ammo with the selected equipped loadout, and clears unfinished quiz, loot, shop, and combat state while retaining practice history and applying the selected upgrades and salvage balance. Empty loadouts fire standard projectiles. QA also includes Skip quiz during questions and corrections, plus map/arena boundary editors. QA controls are hidden on public production hosts.

Enemy introductions are the same for all mission lengths: Drifter at wave 1, Spitter at wave 2, Charger at wave 3, and Splitter at wave 4. Earlier types remain in the mix on later regular waves; the final wave retains its boss encounter.

Final waves spawn one Overmind with eight regular adds, then batches of four every 1.5 seconds, up to 64 regular adds total. Reinforcements pause at 32 living adds, counting summoned minis. All four regular types enter from the arena edges. Boss defeat immediately ends the encounter and clears surviving enemies and queued reinforcements.

Camp and combat share a 3.7-million-pixel drawing budget, preserving viewport proportions and capping device density at 2×. Cached audio playback creates no download timeout; timeouts are allocated only for actual fetches. New IndexedDB command receipts retain payload fingerprints and revision metadata rather than duplicating profiles; historical full-profile receipts remain retryable.

Combat rules run at a fixed 60 Hz. The marine, enemies, projectiles, and attached indicators interpolate between the last two simulation positions for smooth movement at different display refresh rates. This presentation runs one simulation step behind; collisions, wave timing, and saves use the authoritative simulation state. Pausing freezes both. Camera follow strength scales with elapsed time to preserve the same response across refresh rates. Interpolation retains only coordinates and reuses its output objects; retired entity histories are released through weak references.

Connected town management now uses an explicit per-tab takeover lease, bound to the authenticated parent session and a durable generation. Preference commands have transactional durable retry receipts; stale generations cannot mutate town state. The town motto is the first harmless command exercising this boundary (#42).

Connected town version 2 introduces starter stocks/utilities, three ordinary plots, two construction slots and server-timed Greenhouse jobs. Construction and cancellation use the authoritative command/receipt boundary. Both camera views now poll persisted town snapshots instead of preview state (#43).

Connected town version 3 adds one-time lettuce seeds, unique adult-worker assignments, paused growth, discrete held harvests, hourly household meals and starter utility/emergency-meal recovery. Food and meal progress is persisted and reconciled on server time; housing capacity and available workers are distinct (#44).
