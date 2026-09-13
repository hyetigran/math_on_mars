# Math on Mars — game plan

Updated September 13, 2026 after the owner interview. This is a **personal-use MVP**, with home use, adult-assisted setup, local profiles, and repeatable combat missions. No educator assignment, external review, learner recruitment, study, or evidence-gathering release gate is required. The game is not yet implemented.

This document is the product source of truth. [ARCHITECTURE.md](./ARCHITECTURE.md) describes implementation contracts; [../CONTEXT.md](../CONTEXT.md) defines domain vocabulary. Earlier charge formulas, per-item timing targets, accuracy streaks, three-question presets, skipping, and immediate retries are superseded.

When resuming project work, read the [memory bank](./memory-bank/README.md) for current progress, next steps, and confirmed versus provisional decisions.

**1. The game in one sentence**

A lone space marine survives alien-slime waves on Mars, answers five math questions against one 30-second countdown, chooses an earned upgrade, corrects mistakes, and prepares for the next wave.

**2. Scope and established decisions**

- Support desktop, phone, and tablet browsers, with portrait and landscape touch play.
- Include a selected practice track for every grade K–6. Five quiz questions apply to every grade; grade changes content, not combat difficulty or the timer.
- Build the core run with local profiles. Hub, permanent armory, cloud accounts, classroom administration, and other subjects are deferred.
- One Pulse Blaster; continuous automatic projectiles modified by equipped ammo types.
- Piercing, Multi Shot, Electric Chain, Frost, and Fiery upgrade through purple. Two matching type/tier copies merge up one tier.
- Five distinct purple ammo types forge legendary with all five effects in one active slot. Capacity begins at one and shop Ammo Expanders raise it to four.
- Ammo types are reusable for the run; they are not a finite bullet supply. Equipped effects combine on each shot.
- Math rewards have white, green, blue, and purple power levels. No charge points or separate continuous strength calculation.
- No question can be skipped. Misses are corrected after choosing the reward and before the next combat wave.
- WizardGenie remains the asset workflow; use the existing reference directions. Paid asset batches need their actual cost/scope established before execution.

Balance values and mission lengths below are adjustable implementation defaults. Do not make formal external validation a dependency of building this MVP.

**3. Combat reference and progression**

Carry over Goblin Gutter's automatic combat, movement/dodging, loot, passive upgrades, merging, and four-offer shop with a free refill after all four offers are purchased. Use the science-fiction equivalents: marine, slimes, salvage, supply caches, tech modules, and med-gel/med-kits. One gun with configurable ammo replaces multiple weapon slots.

Launch enemies: Drifter, Spitter, Splitter, Charger, and the Slime Overmind boss. Brood summoners are deferred; mini-slimes are Drifter derivatives. Math difficulty and combat difficulty remain independent.

**4. Session loop**

1. Choose local profile, grade/skill, combat difficulty, and mission. Start with one gun and one white Piercing ammo type equipped.
2. Fight an ordinary wave with automatic aim/fire. Sweep remaining loot and save when the wave clears.
3. Pause combat and present exactly five questions, one at a time, sharing a single 30-second countdown.
4. Each valid answer settles that question's first attempt and advances. A wrong answer is queued for later correction; there is no immediate retry.
5. After all five initial answers, freeze the timer-derived rarity, apply wrong-answer drops, and offer three upgrades of the resulting power level. Choose one.
6. Revisit every missed question in an untimed correction round. Provide help and require a correct answer for each before proceeding. Corrections do not change the selected reward or rewrite initial accuracy.
7. Resolve caches, shop, merge, and equip. Then explicitly select Next wave.
8. Defeat or final boss victory ends the run directly, without a quiz that could only reward a nonexistent next wave.

If time reaches zero, keep every unanswered question mandatory. Finish the initial pass for a white reward, choose it, then complete corrections. There is no Skip, End quiz, or timeout-based auto-answer. Save & Exit pauses a run; explicitly abandoning ends it and does not bypass questions into the next wave.

Prototype mission defaults: Standard has ten waves with the boss on ten; optional Short has six with the boss on six. Both use five questions after each ordinary clear. The first implementation slice has three waves and two quizzes. No cadence experiment or grade-specific set length is required.

**5. Math content and presentation**

| Grade | Initial practice track |
|---|---|
| K | Count 0–10; compare quantities; compose/decompose within 5 with pictures |
| 1 | Add/subtract within 20; missing addends |
| 2 | Add/subtract within 100; place value |
| 3 | Multiplication and exact division within 100 |
| 4 | Larger whole-number multiplication; equivalent fractions; like-denominator sums |
| 5 | Decimal operations; unlike-denominator fraction addition/subtraction |
| 6 | Ratios/unit rates; positive-fraction division; one-step equations |

Use deterministic templates with computed answers, appropriate operand ranges, and explanations. This is selected practice, not a claim of complete curriculum coverage. Automated answer checks and normal developer verification remain appropriate; no named reviewer or learner evidence is required.

Keep the selected grade/skill fixed through a run. Record original first-attempt correctness and later correction completion separately. Show simple practice history; do not present game rarity as mastery or a school grade. Formal adaptive evidence windows and promotion gates are unnecessary for this MVP. Avoid immediate exact repeats where the available question pool permits.

Use the Quizcaster reference for a central question, Question 1 of 5 progress, and a full keypad arranged 7–8–9 / 4–5–6 / 1–2–3 / Backspace–0–Check. Numeric construction is required; fractions use numerator/denominator fields and decimals get a decimal key. Partial/malformed input shows validation and is not a wrong submission. Provide visual counting groups for younger grades.

K–1 includes replayable spoken tasks and guidance, with text/diagrams alongside audio. Keep task speech available offline once downloaded; use authored text and installed audio rather than live AI-generated questions. Do not block the build on an educator review, a 500-item quota, narration sample counts, or calibration studies. Corrections provide hints/worked examples while still requiring the learner to enter the correct answer.

Timing implementation default: begin at first exposure of the first problem, including item-specific speech. Keep answer entry available during narration; initial narration does not lock Check. Initial/replayed question speech consumes the same overall time. Keep question transitions immediate; actual loading pauses timing while the task is concealed. Capture time when an answer is accepted and suspend timing/input during its save so storage latency does not consume the budget. A genuine pause conceals the problem and stops speech; resume preserves the same remaining time. These media details are implementation defaults, adjustable independently of the confirmed 30-second rule.

**6. Countdown and reward rules**

Exactly five questions share **30 seconds**, for every grade and input device. The timer stops at zero and never forces an unanswered question to disappear. Freeze remaining time when the fifth valid initial answer is submitted.

| Remaining time at completion | Starting power level |
|---|---|
| More than 20 seconds | Purple |
| More than 10, up to 20 seconds | Blue |
| More than 0, up to 10 seconds | Green |
| Zero seconds | White |

Then lower the starting level once per wrong initial answer, with white as the floor. In ascending order `[white, green, blue, purple]`, compute `finalIndex = max(0, timeIndex - wrongAnswerCount)`. Exact 20 seconds is blue; exact 10 is green; exact zero is white. Use unrounded elapsed time for decisions and round only the display.

Examples: finishing with 24 seconds and no misses earns purple; one miss earns blue; two earn green; three or more earn white. Finishing with 16 seconds and one miss earns green. Finishing after expiry always earns white, even if all five answers are correct.

Show the countdown, the four named rarity bands, and the wrong-answer count clearly. At reward selection explain the time-based tier, drops, and final tier. There is no 0–125 charge, per-item speed bonus, strength multiplier, input-method target, or accuracy streak.

Offer three distinct useful tech-module variants at the final rarity; choose one for free. Prototype magnitude default: white gives half a variant's first modifier, green its full first modifier, blue adds its second modifier, and purple adds its third. Keep all promised gains positive after caps. This magnitude table is tuning, not an additional owner decision. The downgrade affects only this quiz's reward, never prior equipment, salvage, ammo rarity, or shop/cache rewards.

Preserve offered cards and their exact gains across resume. Reward selection is untimed and settles once. If there are misses, enter corrections next; otherwise continue to caches/shop. Repeated incorrect correction answers have no reward penalty and keep that correction pending until correct.

**7. Combat and upgrades**

Desktop movement uses WASD or arrows, with automatic attacks, Q for med-kit, and Escape for pause. On phones and tablets, provide a floating virtual movement stick in a lower thumb zone, automatic aiming/firing, a separate large med-kit button, and an always-reachable pause button. Support moving and using a med-kit with different fingers at the same time. Offer a mirrored control arrangement for left- or right-handed use. Provide a brief tutorial for the current input method and visible focus for keyboard use. Touch combat is required at launch; controller support can follow.

**Mobile layout and playability — launch requirements**

Support the complete run on desktop, phones, and tablets, including profile/setup, combat, every K–6 answer format, reward choice, caches, shop, ammo reserve, merging/forge, and Save & Exit/Resume. Portrait and landscape both work without requiring fullscreen or an orientation lock. The same weapon, ammo, five-question quiz and 30-second countdown apply across grades and input devices. There is no input-method timing calibration or relaxed mode.

| Screen or behavior | Mobile requirement |
|---|---|
| Combat view | Recompose the HUD and reserve thumb-control space. Keep the marine, projectiles, enemy silhouettes, and warning geometry readable. Preserve enough visible approach distance to dodge; never merely crop a desktop view or shrink the entire HUD |
| Touch interaction | Use at least 48×48 CSS-pixel hit areas with separation; aim for 56-pixel keypad keys for younger learners where space allows. Move with one thumb; med-kit and pause remain reachable. No required hover, right-click, or drag-only inventory actions |
| Recharge | Show the shared countdown and four labeled rarity bands. Keep the current question/diagram, answer, and Check action visible together; use a single column in portrait and question/keypad columns in short landscape layouts. Explanations may scroll. The full keypad includes decimal/fraction controls when needed |
| Reward and shop | Reflow three reward cards and four shop offers into readable rows or a vertical list. All offers remain available; scrolling is allowed and does not select a card. Show exact gains/costs and use an explicit Choose/Buy action |
| Ammo and forge | Wrap active slots and grouped reserve rows; tap to select/equip/merge instead of requiring drag-and-drop. Show all five named forge ingredients and the resulting loadout in a readable, scrollable preview with an explicit Forge action |
| Text and framing | Start with at least 16 CSS-pixel body/input text and larger math text; measure actual reading usability. Keep controls clear of notches, rounded corners, home indicators, and browser bars. Retain zoom in document/menu screens and avoid horizontal page overflow |
| Interruption | Rotation or a major viewport change pauses play and answer timing during relayout, preserves the draft answer and accumulated time, and requires Resume. App switching/screen lock pauses and attempts a save. Cancelled touches cannot leave movement held or trigger a delayed purchase |

The built-in keypad is the default touch math input so an OS keyboard does not unexpectedly hide the task. Profile-name entry still supports the OS keyboard. If a keyboard opens for any field, keep the focused field and its action visible and preserve the draft. Scrolling a card list must not count as choosing an upgrade, and the final answer tap must not carry into reward selection.

Initial layout checks cover 320×568 and 360×640 CSS-pixel phone viewports, their landscape counterparts, larger phones, and tablets around 768×1024; include actual browser chrome and safe areas. These are test targets, not claims that device support has been verified. Test real iOS Safari and Android Chrome devices plus a tablet before launch, alongside desktop browsers. Select and record minimum supported OS/browser versions and representative device models during the first playable slice.

Target 60 rendered frames per second where practical; require sustained, responsive play at 30 or more on the agreed minimum mobile devices during the busiest planned wave and a full-session soak. Lower cosmetic particles, render resolution, and decoded asset memory before altering combat rules. Cosmetic quality settings keep simulation and rewards unchanged. A separately declared, versioned compact combat ruleset may cap simultaneous entities and schedule the remaining wave budget over time, as specified below; it cannot silently delete damage or rewards during overload. Mobile play remains in MVP scope; report which devices were actually checked.

| Enemy | Readable silhouette | Gameplay purpose |
|---|---|---|
| Drifter | Round lime blob, one bright core | Basic pursuit and crowd pressure |
| Spitter | Tall pear shape, visible nozzle-like mouth | Slow, telegraphed ranged shots |
| Splitter | Two-lobed purple body, two visible cores | Breaks into two weaker mini-slimes |
| Charger | Wide amber wedge with shell ridges | Directional charge with at least one second of warning |
| Slime Overmind | Large magenta dome around a contained reactor core | Alternates slam rings, projectile fans, and limited summons |

**One weapon, configurable ammo**

There is exactly one weapon slot, occupied by the Pulse Blaster in the first release. Its base damage, fire interval, and projectile speed can benefit from passive trinkets; firing patterns and elemental effects come from ammo. The former Scatter Emitter and Arc Coil weapon designs are replaced by Multi Shot and Electric Chain ammo. The proposed visual is one separate gun sprite on a single shoulder-side mount, so the marine's body animations remain empty-handed. There are no extra guns when ammo capacity increases.

Distinguish three concepts: the weapon slot holds the gun; active ammo slots determine effects the gun fires; the ammo reserve holds collected cartridges, including ingredients not currently equipped. A cartridge is reusable for the current run and is consumed only by merging, selling, or run-end cleanup. It does not count down with each shot. If every active slot is empty, the blaster still fires ordinary rounds with no special effects.

The reserve has no separate item-count limit in this release. Present it as grouped stacks by ammo type and tier with an equipped marker, rather than a large bag grid. Reserve ownership includes equipped cartridges; equipping does not create a second copy. Allow one active cartridge per ammo type, up to the current capacity. Other copies remain available for merging or selling. Collecting a new type fills a free active slot automatically; otherwise it enters the reserve without displacing the loadout. Duplicates do not auto-merge. Swapping, selling, and crafting happen between waves, with the initial loadout chosen before combat. Players can own all five types even at capacity one.

**The five ammo effects and normal tiers**

White T1 → Green T2 → Blue T3 → Purple T4 improves the same named effect. D is base shot damage after passive damage modifiers; r is shots per active second after fire-rate modifiers. The following replaces the old 0.6D-per-pellet/no-pierce-falloff proposal. It is an arithmetic-bounded starting point, not verified gameplay balance.

| Ammo | White T1 | Green T2 | Blue T3 | Purple T4 |
|---|---|---|---|---|
| Piercing | 1 extra target | 2 extra | 3 extra | 4 extra |
| Multi Shot | 2 pellets, 1.15D total first-impact budget | 3, 1.30D total | 4, 1.45D total | 5, 1.60D total |
| Electric Chain | 1 extra target | 2 extra | 3 extra | 4 extra |
| Frost, ordinary enemies | 20% slow | 25% | 30% | 40% |
| Fiery, total new burn-damage budget per shot | 0.30D | 0.45D | 0.60D | 0.90D |

Multi Shot splits its volley budget evenly across the pellets; a plain shot deals D. Successive direct piercing impacts from one pellet deal its first-impact damage times 1, 0.5, 0.25, 0.125, 0.0625. A projectile cannot hit the same target twice. Electric Chain starts once on the first direct impact, jumps within 120 world units of the preceding target, deals 0.20D per jump, and shares its 1–4 extra-target budget across the whole volley. The origin is already visited; no direct hit means no chain. Chain hits cannot create projectiles, pierce, or trigger another chain.

Frost lasts two seconds, refreshes separately, and retains the strongest slow. Boss slow is half the ordinary value: 10/12.5/15/20%, so purple Frost improves boss control over white. Fiery uses a **shared funded damage budget**, not a full burn on every pellet/chain target. Direct and chain hits can fund one non-stacking burn per target; a candidate uses 30/45/60/90% of that hit's damage by Fiery tier, limited by remaining shot budget, over at most three seconds. Extending/replacing a burn must debit its actual increase in outstanding burn damage; a weak hit cannot refresh a stronger burn for free. The architecture specifies the reservoir arithmetic. Unspent budget expires with the shot. Burn ticks cannot generate hit effects or refresh Frost. Save durations, remaining damage, and tick progress.

Equipped effects combine; every shot snapshots its stats, ammo, per-impact falloff, chain ledger and burn budget when fired. A maximal purple/legendary volley remains bounded at 25 direct plus four chain hit events, but its damage bound is now 3.1D direct + 0.8D chain + at most 0.9D funded burn = 4.8D lifetime damage across a sufficiently large crowd. Its single-target direct volley is at most 1.6D; piercing/chain add nothing against an isolated boss. Compare sustained DPS and control separately from this lifetime crowd bound. The old 16.4D direct/chain crowd figure was not single-target boss DPS.

**Combat tuning checks.** Exercise each ammo type/tier and combined builds against a boss and crowds. Check bounded damage, burn conservation, Frost behavior, and useful upgrades. Tune during implementation; no formal balance report or external evidence gate is required. Historical calculations in DESIGN_VALIDATION.md are reference material only.

**Ammo upgrades and legendary fusion**

- Normal merge: choose two owned cartridges of the same type and tier below purple, consume exactly those two copies, and create one of that type at the next tier. No different-type merge and no merge of two purples into a normal tier above purple.
- If an ingredient is equipped, a normal merge replaces its equipped instance with the upgraded result in the same slot. Otherwise the result remains in reserve. Merging never increases active capacity or duplicates the result between reserve and equipment. Selling an equipped cartridge requires explicitly unequipping it first.
- Legendary recipe: one Purple Piercing + one Purple Multi Shot + one Purple Electric Chain + one Purple Frost + one Purple Fiery → one **Legendary Omni Ammo** cartridge. Recipe eligibility checks the entire owned reserve, including equipped items; it does not require five active slots. Show five named ingredient checks with tier pips and a single explicit Forge action.
- Forge consumes one selected purple copy of each required type, removes any consumed equipped references, and creates one legendary instance. Preserve all other inventory copies. Auto-equip the legendary; retain any unconsumed active cartridges that fit, and return overflow to reserve rather than deleting it. When an already-full loadout has consumed no active ingredients, the lowest-priority active slot is replaced by legendary and its old cartridge stays owned in reserve. Active-slot order defines this priority and is shown in the preview.
- Legendary Omni Ammo occupies **one active ammo slot** and applies all five effects at their purple values. The four-type capacity limit counts equipped cartridges, so this final fusion legitimately packages five effects into one slot. It has no further merge tier. Any post-forge capacity benefit is explicit below, never a hidden damage multiplier.
- Do not apply an effect twice when legendary overlaps another equipped cartridge. Resolve one strongest version of each effect; with a purple-equivalent legendary, extra normal ammo contributes no further power. Show that redundancy in the loadout. Proposed capacity compensation: while Omni is equipped, each purchased extra slot provides a displayed +4% firing-rate stabilizer, up to +12%, applied once after ordinary fire-rate aggregation. It depends on purchased capacity, not whether redundant cartridges are manually unequipped, and disappears when Omni is unequipped. No ammo effect stacks twice. Include this explicit bonus in the damage budget and forge preview so Expander investment retains value after fusion.
- One legendary can be forged per run. It cannot be sold, split, or used as a merge ingredient. It is not in the random drop/shop pools. Disable another forge after success, and preserve that flag across resume. All forge and merge actions preview the consumed/resulting items and commit inventory, equipment, and settlement IDs together.

One purple costs eight white-equivalents; the recipe costs forty, but it need not mean forty pickups or purchases. Use five planned supply milestones: Standard after waves 1, 3, 5, 7, 8; Short after waves 1–5. Each creates a fixed choice cache containing five named options, each a pair of blue cartridges of one type, plus a fixed ordinary-module alternative. Select one option. Choosing each ammo type once yields ten blue cartridges = forty white-equivalents and permits forging before Standard wave nine or the Short boss. This is an explicit guaranteed collector route; choosing immediate module power or selling ingredients gives it up. No uniform-random drop assumption is needed. Cache choices and contents are fixed when created, saved, and resolved once.

**Choice-cache settlement:** these are six mutually exclusive options, not six granted items. The ordinary-module alternative is one fixed green module at base magnitude. Select one option and either accept its complete bundle or sell that complete bundle for its fixed quoted value; commit that choice, the inventory/stat/currency change, and closure of all alternatives together. An accepted blue pair creates two distinct owned instances; subsequent normal inventory actions can handle them individually. A cache module that has become capped may be sold but is not rerolled. Ordinary loot caches use a separate grant-cache rule: each item already granted can be accepted or sold once. Never apply grant-cache settlement to a milestone choice cache.

**Acquisition tradeoff still to validate:** the first blue pair can immediately merge into purple after wave one, so this schedule makes much of the white/green/blue ladder optional. It guarantees ingredients, not a satisfying upgrade curve. Start with this collector route for the MVP and adjust its timing if it bypasses too much of the upgrade ladder. Do not claim the current guaranteed route proves the intended Goblin Gutter progression feel.

Optional random ammo supplements that route: use a saved five-type shuffle bag, one cartridge per scheduled random-ammo event, with wave-based tiers and no legendary. A bag contains each type once before refilling; resume cannot reset it. Do not require buying all 36 Standard shop offers to assemble the recipe. Add an explicit batch normal-merge preview to reduce repetitive taps, consuming/creating all selected pairs atomically without auto-merging pickups. Verify collector and non-collector seeded paths and actual time spent in inventory. Easy combat and both mission presets must be viable without forging.

**Shop capacity trinket and ammo acquisition**

The shop sells **Ammo Expander**, a utility trinket that immediately adds one active ammo slot: 1 → 2 → 3 → 4. Three purchases reach the hard cap. It changes neither the single weapon slot nor reserve storage. The effect is run-long, is not an equippable inventory item, and cannot be sold back after purchase. It has no rarity ladder or multiplier; +1 capacity is a discrete utility effect, exempt from ordinary trinket modifier-count and math-strength rules. Show “Active ammo 2/4 → 3/4” on the offer. At capacity four, exclude it from new offers, remove stale/locked offers and refill those slots once without a reroll fee; revalidate capacity on every purchase so concurrent clicks never spend salvage for a fifth slot. Initial proposed prices are 8, 16, and 24 salvage. Guarantee eight salvage on the first ordinary wave clear and reserve the first shop slot for an 8-salvage Expander until bought; that offer survives rerolls. The player can choose other spending, but random offers cannot deny the affordable first expansion. Starting capacity remains one, as requested. Free between-wave equip/swap remains available even without buying it; the first supply cache offers an immediate higher-tier cartridge.

Ammo cartridges can drop at scheduled defeated-slime events, appear inside post-wave supply caches, and be bought in the salvage shop. Collection during combat is an in-memory atomic inventory change included in combat checkpoints; it is not a per-pickup IndexedDB transaction or save stall. Wave-clear sweep and phase transition commit the resulting reserve together. Fix a pickup/cache/offer's type and tier when it is created; pickup and resume never reroll it. Sweep uncollected ammo into the reserve at wave clear before the next intermission; any new automatic equip cannot affect the already-finished wave. Normal drops/offers include the five ammo types in T1–T4 with wave-based weights and no direct legendary drop. Shop offers also include stat trinkets and med-kits. The Ammo Expander is shop-only, as requested.

Math continues to award the free passive tech-module choice defined above. Ammo progression comes from cartridges and their merge recipe; a purple math reward does not itself contain all five ammo effects or bypass fusion. The Ammo Expander is excluded from the free math reward pool. Tech modules retain their separate green/blue/purple modifier counts. Ammo rarity, math-earned trinket quality, and active ammo capacity are separately labeled systems.

Initial authored module catalog; all numbers are tuning values. Prototype tuning: white uses half the first modifier, green uses the full first modifier, blue adds the second, and purple adds the third. This white magnitude is an implementation default, not a user-specified balance value. No continuous math-strength multiplier applies. These 18 variants use six families and existing stats; their distinct priorities, rather than names alone, drive the offer mix.

| Family / variant | First modifier | Blue adds | Purple adds |
|---|---|---|---|
| Overclock / Rapid | +6% attack speed | +6% damage | +8% projectile speed |
| Overclock / Ballistic | +8% damage | +4% attack speed | +8% projectile speed |
| Overclock / Accelerator | +12% projectile speed | +6% damage | +4% attack speed |
| Shield / Integrity | +10 max HP | +2 armor | +10% healing |
| Shield / Plating | +2 armor | +10 max HP | +10% healing |
| Shield / Recovery | +15% healing | +10 max HP | +2 armor |
| Thruster / Drive | +5% movement speed | +15% pickup radius | +5% attack speed |
| Thruster / Tractor | +20% pickup radius | +4% movement speed | +4% attack speed |
| Thruster / Strafe | +7% movement speed | +1 armor | +6% projectile speed |
| Med-service / Restorative | +12% healing | +8 max HP | +12% pickup radius |
| Med-service / Rescue | +12 max HP | +8% healing | +3% movement speed |
| Med-service / Field | +1 armor | +12% healing | +4% attack speed |
| Targeting / Cannon | +7% damage | +10% projectile speed | +10% pickup radius |
| Targeting / Lead | +14% projectile speed | +4% damage | +3% movement speed |
| Targeting / Pursuit | +4% movement speed | +5% damage | +8% projectile speed |
| Salvage / Collector | +20% pickup radius | +1 armor | +8 max HP |
| Salvage / Shell | +12 max HP | +12% pickup radius | +4% damage |
| Salvage / Pulse | +5% attack speed | +12% pickup radius | +8% healing |

Initial passive caps: +60% damage, +60% attack speed, +50% projectile speed, +35% movement speed, +100% pickup radius, +75% healing, +100 max HP, and 20 armor. The explicitly displayed Omni capacity stabilizer applies after the ordinary attack-speed cap and is capped at +12%. These caps are inputs to the balance/offer checks, not validated outcomes. If reachable late-run states cannot provide three useful choices, revise caps/catalog before release rather than serving decorative “Add another” cards.

The marine has one health resource: HP, shown as Suit Integrity. There is no separate regenerating shield pool. Armor is a mitigation stat, not a spendable resource: `damageTaken = incomingDamage × 20 / (20 + armor)`, with armor clamped to a proposed 0–20 for launch. At 0 armor damage is unchanged; at 2 it is reduced by about 9.1%; at 20 it is halved. Store fractional HP so rounding never makes repeated small hits harmless. Both ordinary contact damage and enemy projectiles use this same rule; damage-over-time and armor penetration are deferred.

Accepted stat modules activate immediately, remain active until the run ends, and do not occupy the weapon slot, ammo slots, or reserve. Allow stacking with configurable caps; use additive percentage bonuses within a stat to avoid uncontrolled exponential growth. Increasing maximum HP preserves missing health. Apply each selected module's saved magnitude once before aggregating stats and applying caps. Show cumulative effects on the marine panel. Ammo Expander follows its separate discrete-capacity rule above.

The 18 variants above are authored starting values, not completed runtime content or verified balance. During implementation, check the catalog/caps across a full Standard run. Math offer sets need three distinct variants, at least two first-stat priorities, and positive actual gains for every modifier promised by the awarded rarity; prefer an unseen variant. Show New module for a new family, New variant within an owned family, or Add another for a repeated variant, alongside the exact gain. Keep math choices fixed while their phase owns input. In the shop, deterministically replace and save offers with a capped first modifier or a zero-gain promised modifier after purchases change eligibility; replacing an invalid offer is not a purchase. Cache options stay fixed and retain their sell route. Validate reachable purchases, caches and high-quality rewards as well as floor rewards; if any reachable reward checkpoint lacks three legal variants, revise the catalog, caps or economy before release. Nine floor-reward traces alone do not establish coverage.

Within a shop refill generation, purchased slots remain empty and do not reroll. Buying each of its four slots triggers one free four-slot refill, clears that generation's purchased-slot flags and preserves the paid reroll count. Manual rerolls replace only eligible unpurchased slots. If offer locks are included, rerolls preserve unpurchased locked offers except offers invalidated by current stats or the Ammo Expander capacity cap. Prices, resale values, reroll costs and loot schedules must be fixed in a balance version before acquisition/headroom acceptance; the current partial price list is not a complete economy.

Standard wave progression: pursuit 1–2, Spitters 3–4, Charger 5, Splitters 6–7, mixed 8–9, Overmind 10. Short introduces pursuit at 1, Spitter at 2, Charger at 3, Splitter at 4, mixed at 5, boss at 6, with its own tuned budget. Tune mission/combat presets independently of math grade.

An ordinary wave clears only when its finite scheduled/queued spawn budget is exhausted and all enemies, including splitter children, are defeated; then sweep drops and clear hostile projectiles. The 30–45 seconds is a spawn-schedule target, not forced removal of remaining enemies. Compact admission and cleanup may extend it and must be included in session measurements. Final boss death ends the mission after the configured simultaneous-death check; the three-wave internal slice instead ends on its final ordinary-wave clear.

**Declared compact combat ruleset.** Proposed standard/compact caps are 80/40 live enemies, 160/80 live damaging projectiles, and 256/128 pending hit events. Pin a ruleset ID and these limits at run creation; show Compact combat in mission settings, separate from learning grade and cosmetic quality. At an enemy cap, queue remaining spawns; at projectile capacity, defer a whole volley and its fire interval rather than discarding pellets. Resolve a full admitted volley/impact batch in stable order before advancing another simulation tick; never silently drop a hit. Compact preserves total scheduled wave/loot budgets but changes density and possibly duration, so record it separately in balance/pacing results. Reduce cosmetics first. If thermal slowdown persists, offer a checkpointed switch to the compact ruleset at a paused boundary, record that transition, and preserve already admitted effects; temporarily grandfather existing entities until they clear. Retest compact on the minimum hardware. If it still repeatedly stalls, that device/build fails support; do not present an endless Resume loop as degradation.

**8. Art and audio direction**

**Reference roles and visual authority**

Use all three references, with a distinct purpose for each:

| Reference | What it guides |
|---|---|
| [Backwoods screenshots](/Users/tig/Desktop/tigran/mathonmars/references/backwoods/) | Arena and future hub composition, relative character scale, enemy readability, environmental detail, and combat HUD placement |
| Goblin Gutter | Established smooth chibi rendering, outline weight, cel shading, camera/view consistency, and animation conventions |
| Quizcaster screenshots | Math-question layout, upgrade selection, progress indicators, and the menu structure for future subjects |

The ten supplied Backwoods screenshots are preserved with their original filenames in [references/backwoods/](/Users/tig/Desktop/tigran/mathonmars/references/backwoods/), copied unchanged from `/Users/tig/Desktop/gauntlet/goblin-gutter/backwoods_ref/`. The set contains `gameplay_1.png` through `gameplay_3.png`, `post_wave_shop_1.png` and `post_wave_shop_2.png`, `base_camp_1.png` and `base_camp_2.png`, `level_selection.png`, `level_selection_locked.png`, and `splash_screen.jpg`. Use these project-local copies for reference review and the Math on Mars reference sheet.

Translate these references into one consistent science-fiction style. Backwoods supplies spatial composition and readability; Goblin Gutter supplies rendering continuity; Quizcaster supplies the educational interaction layout. Their pictured mechanics, fantasy scenery, and pixel treatment do not override this document's gameplay or art requirements. A future hub composition reference does not bring the hub into launch scope.

Create a **Math on Mars reference sheet** showing the marine, a representative slime, Martian terrain, and a sample UI panel together. Include a gameplay-size view so their relative scale, contrast, outlines, palette, and typography can be judged as one game. Review and approve this sheet before expanding into batch asset generation.

Include a phone portrait composition and a phone landscape composition alongside the desktop view, with real-size HUD, thumb zones, a sample math keypad, and readable enemy telegraphs. Judge generated art at these sizes before expanding the asset set; decorative frames must allow responsive layout and safe-area padding.

Once approved, the Math on Mars sheet becomes the primary visual authority for WizardGenie generation. Attach it to subsequent requests alongside the selected character or object master when identity must be preserved. Use the three source references within their assigned roles to explain a specific decision; resolve conflicting visual cues through the approved sheet. Gameplay rules remain governed by this document.

Status: the reference roles and approval step are accepted. The Math on Mars reference sheet still needs to be created and approved.

Keep Goblin Gutter's smooth illustrated chibi proportions, dark outlines, simple cel shading, consistent overhead view, and readable silhouettes. Replace the swamp palette with muted rust-red terrain and charcoal machinery. The marine uses off-white/navy armor and a cyan visor; slimes use distinct colors and shapes. Hostile telegraphs use orange-red plus explicit ring, line, or cone geometry.

Rarity cannot depend on color: show White / Green / Blue / Purple text with one / two / three / four filled pips and matching modifier rows on every stat-module choice, shop offer, cache reveal, and active-module summary. Ammo uses its type name/symbol plus T1–T4 labels and pips; legendary adds a distinct gold crest and “Legendary — All five effects” label. Capacity displays active/available slots separately. The gun has no independent rarity ladder at launch. Enemy bodies do not carry item-tier frames. Test grayscale plus common red-green and blue-yellow color-vision simulations at gameplay size; a player must distinguish hostile warning geometry, loot, and selected controls without identifying hues. Use practical developer checks; no recruited learner study is required for this personal MVP.

Aim for adventurous cartoon action: slimes burst into droplets and dissipate, the marine's suit powers down on defeat, and the world contains no human gore. Make combat lively; make the math console visually quiet. Avoid tiny sci-fi lettering and decorative symbols near equations.

Generate a small reference set first: marine, Drifter, Martian terrain/arena composition, and a sample UI panel. Assemble them into the Math on Mars reference sheet and verify their gameplay-size appearance before approval and batch expansion. For green slimes, use a flat blue key plate; use a green plate for the blue/cyan marine. Slime bodies should look gelatinous through painted highlights while remaining substantially opaque for clean extraction.

The accompanying [WizardGenie prompt pack](/Users/tig/Desktop/tigran/mathonmars/docs/WIZARDGENIE_PROMPTS.md) contains the shared art direction, masters, animations, environment, pickups, icons, audio, and implementation handoff prompts.

The three preserved [Quizcaster screen references](/Users/tig/Desktop/tigran/mathonmars/docs/QUIZCASTER_REFERENCES.md) guide UI hierarchy and content grouping. Adapt their question/keypad layout, rarity rail, upgrade cards, and grouped study menu to smooth science-fiction console art. Keep the marine/ammo art direction, shared countdown and wrong-answer tier drops, and separate legendary recipe. The screenshots' parchment, pixel rendering, three-question count, five-tier quiz ladder, and broad content library do not automatically become our launch requirements.

**9. Profiles, saves, defeat, and stopping**

Local profiles have independent settings, selected grade/skill, practice history, and at most one active run. A new run resets run-only salvage, ammo, capacity, and upgrades; learning history remains. There are no accounts or server dependencies.

Save & Exit works during combat, quiz, reward selection, corrections, and shopping. Restore the same phase, countdown, original answers, pending corrections, inventory, enemies/projectiles, RNG, offers, and rewards. Hidden/paused time never advances gameplay or the quiz countdown. A timeout is saved as zero, never a fresh timer.

Commit answers and their wrong-count changes together; commit reward selection and correction-phase entry together. Corrections append their own outcomes without replacing first-attempt records. Autosave after meaningful actions and periodically during combat. Use atomic local storage transactions, stable action IDs, a last-valid backup, and explicit failure feedback. A retry must not award twice or erase a pending correction.

Defeat and explicit abandon end the run. New run cannot silently erase an active run; offer Resume or Abandon. Profile export/import and error recovery remain useful local features, but recruited retention studies and external backup evidence are not MVP completion gates.

**10. Implementation sequence and completion**

1. Establish the runnable TypeScript/browser project and a responsive combat slice with one gun, white Piercing, touch/keyboard movement, and three waves.
2. Implement the five-question countdown, four rarity bands, wrong-answer drops, reward choice, and mandatory correction phase. Start with grade-3 arithmetic, then add the other selected K–6 tracks.
3. Make all phases resumable and isolate local profiles. Verify timer, rewards, original accuracy, and corrections survive reload without duplication.
4. Implement the five ammo types, merging, Expanders, legendary, caches, and shop. Use the documented economy as adjustable prototype tuning; verify white-reward runs can progress.
5. Integrate the remaining enemies, boss, art, narration, and responsive screens. Check performance and readability on available desktop/mobile browsers.
6. Run focused rule tests and exercise complete win, defeat, save/resume, and correction paths. Report any untested device behavior honestly. Deliver a playable personal MVP without waiting for educator approval, learner interviews, pacing samples, or experimental evidence.

Required scoring cases include 30/20/10/0-second boundaries, late completion, zero through five wrong answers, malformed input, no skipping, pause/resume, double submission, and correction retries after reward selection. Verify exact fractions/decimals, ammo merges and forge, capped capacity, and exactly-once purchases/rewards. These are implementation checks, not educational research.

**11. Expansion boundary**

Hub, permanent progression, accounts/cloud sync, classroom tools, additional subjects, controller support, and formal curriculum/effectiveness work can follow. They do not block this personal-use MVP.

Earlier [DESIGN_VALIDATION.md](./DESIGN_VALIDATION.md) and [design_checks.py](./design_checks.py) contain historical formulas. [WIZARDGENIE_PROMPTS.md](./WIZARDGENIE_PROMPTS.md) has been updated to the current plan and draft tickets. They must not override this plan or be used as acceptance proof for the new quiz. See their supersession notices before reusing them.
