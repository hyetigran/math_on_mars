# V2 design interview

Status: active, September 28, 2026. Worktree branch: codex/v2-opening-session. Uses grilling and domain-modeling. Existing accepted requirements remain in V2_TOWN_BUILDER_PLAN.md; new recommendations below are not decisions until answered. Session tuning documents are examples, not approved requirements.

## Settled foundations

Predefined streets; any building type on any plot; elevated planning and true behind-character exploration; at least 12 purposeful building types; visible upgrades; houses/apartments and assigned colonist workers; food/blocks/parts/credits as stock and power/water/oxygen as capacity; gentle shortages; math accelerates construction.

## Design tree and first-round frontier

Ask these independent product decisions before selecting numerical balance or architecture:

1. Ownership and access: personal cadet town versus shared town; same-device versus cross-device expectations.
   - Unlocks save ownership, shared-worker rules, synchronization and offline conflict decisions.
2. Intended visit pattern: one short daily session versus frequent check-ins or extended continuous play.
   - Unlocks build durations, offline production horizon, storage limits, and queue design.
3. Source of learning credit: town practice, between-wave quizzes, and/or actual external homework.
   - Unlocks qualification, correction handling, credit amount/caps, content, and verification.
4. Town/combat relationship: independent activities or material/progression dependencies.
   - Unlocks permanent rewards, salvage boundaries, and combat balance.
5. Farming interaction: staffed automatic production versus planting/harvesting cycles or individual plant tending.
   - Unlocks crop inventories, recipes, automation, and offline farming behavior.
6. Purpose of street-level play: optional exploration and interactions versus exclusive manual tasks.
   - Unlocks interiors, interaction controls, camera requirements, and scope of character activities.
7. Progression objective: open-ended personal town versus chapters, population targets, or other milestones.
   - Unlocks district expansion, catalog unlocks, research, and later upgrade progression.

## Evidence requiring clarification through design

The sample second session contains a 70–90 minute stretch with no required construction decision. This could support occasional visits but might feel empty as continuous play. The core fantasy includes farming, while the opening draft uses continuous automatic greenhouse output. The main plan mentions food recipes and credits that the first 90-minute sample does not exercise. Shared towns, cross-device saves, actual homework, and optional combat credit are not yet specified. These are product gaps, not arithmetic errors.

## Deferred branches

After first-round answers: precise building roster; plot count and expansion; relocation/refunds and duplicate value; level count and benefits; colonist arrival and job assignment policies; shortage recovery; input/output recipes and trade; construction queues and upgrade operation; practice reward pacing; persistence and device-time policy; release scope, camera prototype, and asset pipeline.

Record glossary additions when terms resolve. Record an ADR only for a costly-to-reverse decision with a real tradeoff and rationale. Do not treat recommendations or illustrative timing as user decisions. Before implementing the resulting design, confirm shared understanding at interview completion.

## Round 1 answers

1. Accepted personal town per cadet; cross-device scope is still open.
2. Play at any time, Clash-of-Clans-style flexibility; did not accept a once-daily target.
3. Battle and base are separate learning paths; did not accept shared learning credit.
4. Wave-10 rewards should enable stronger armor/weapons through crafting. Other combat/town dependencies remain open.
5. Accepted player-selected crops with worker-managed growing/harvesting, safe during absence.
6. Accepted exploration, conversations, and shared building controls; defer interiors and required manual chores.
7. Accepted neighborhood milestones with open-ended customization.

## Newly available decisions

Cross-device continuity; town-practice format; typical construction duration range; crop replanting automation; crafting persistence and town relationship; district unlocking conditions. Existing wave-10/gear facts are being checked before asking downstream questions about reward cadence. Precise farming balance and recipe costs wait for crop rules.

## Round 2 answers

8. Cross-device continuity confirmed.
9. Town learning supports parent-assigned homework and selected topics from the question bank. Parent assignment format and external content support remain unresolved.
10. First construction takes seconds; subsequent levels increase to days or weeks. The recommended 24-hour upper range was not accepted.
11. Accepted automatic replanting until crop choice changes or storage fills.
12. Crafted armor/weapons persist across missions and defeat.
13. Both town and battle participate in crafting; exact source requirements per recipe remain unresolved.
14. No answer yet to neighborhood unlock criteria; retain as pending.

## Verified current combat facts

Read-only code inspection: Standard ends at wave 10, Short at wave 6 (`content/balance/missions.ts`). Final victory bypasses quiz/shop (`src/main.ts`, `src/session.ts`). Victory increments a count and clears activeRun; no persistent materials or gear inventory exists (`src/session.ts`, `src/types.ts`). Current armor is a module stat; existing forging creates run-scoped Legendary Omni Ammo (`src/modules.ts`, `src/forge.ts`). V2 permanent equipment is a new progression system. This observed six-wave option was subsequently rejected by the user as contrary to intended design; remove it during implementation rather than designing rewards for it.

## Current frontier

Q14 carried forward: neighborhood unlock criteria. New decisions: parent assignment source; benefit of practice on days/weeks-long upgrades; exact dual-source crafting requirement; wave-6 versus wave-10 reward eligibility; offline/concurrent-device interaction. Lower-level numerical balance depends on these answers.

## Round 3 answers

14. Capability-based district unlocks accepted, rather than mandatory building checklists.
15. Parent assignments select bank topics/question counts with optional due dates; external homework deferred, no town penalty for overdue work.
16. Several short practice sessions should materially shorten long upgrades, potentially by days; scale with progression. Formula remains open.
17. Advanced recipes combine battle materials and town parts at an Armory; starter equipment preserves basic combat access.
18. Rejected Short missions: battle is ten waves and completion awards a random crafting material. Existing six-wave code is an implementation mismatch, not a product option.
19. Initial town management/reward claims require connectivity; timers and production advance during absence; full offline editing deferred.

Next frontier: practice completion and scaled-credit rules; random reward distribution and replay eligibility; concurrent construction; Armory staffing/time; crop/storage resumption. Additional town layout, catalog/tier, immigration, recovery, and expansion details remain to follow as prerequisites resolve.

## Round 4 answers — all recommendations accepted

20. Complete all questions and correct mistakes to earn credit; automatic question-bank checking, parent-visible first-attempt accuracy, no reward reduction for help.
21. Bankable construction time scales at defined town milestones; award is fixed when earned and shown before practice. Formula/repetition limits remain open.
22. Every legitimate ten-wave victory earns a random material reward; small initial pool, duplicates accumulate, costly exchange route, no permanent reward from QA skips.
23. Start with two construction slots; Builders' Guild unlocks more; player targets boosts.
24. Armory requires a worker and uses a separate timed queue; first crafts short. Town-credit applicability to crafting remains open.
25. Finish and hold crops safely when storage fills; no consumption/sale of held goods; automatically resume after transfer frees the farm.

## Round 5 frontier

Repeat-practice reward eligibility; whether construction credit can accelerate equipment crafting; building upgrade-tier count; relocating finished buildings; approval of the 19-type catalog; operation during upgrades; population arrival policy. Subsequent branches include reward scales, craft/build costs, crop cycles, district thresholds, identity/concurrent devices, and visual/implementation scope.

## Round 5 answers

26. No daily reward cap; full rewards for level-appropriate or parent-assigned topics; no duplicate payment for an already-completed assignment, but new qualifying sets may earn rewards.
27. Construction credit cannot accelerate equipment crafting.
28. Five visually distinct building levels; timing broadly spans seconds to weeks. Exact benefits/cost curves remain open.
29. Free relocation/swapping of finished buildings with state preserved; active projects fixed until completion/cancellation.
30. Accepted 19-building target with simpler functional names. User asks how fruit/preserving fits; optional processing-for-trade explanation remains a proposal to confirm.
31. Buildings operate at the old level throughout upgrades, switching on completion.
32. Small arrival groups require explicit acceptance with needs preview; offers do not expire.

## Naming revision

Canonical names in the plan: House, Apartments, Greenhouse, Orchard, Water Plant, Oxygen Plant, Solar Plant, Block Factory, Workshop, Warehouse, Mill, Bakery, Jam Kitchen, Café, Market, Construction Office, Research Lab, Plant Nursery, Armory. Historical interview entries retain original names for traceability.

## Focused clarification

Q33: Should fruit/jam be an optional trade specialization (basic crops support residents; processing uses workers/time/power to earn more credits or fulfill café orders), or is broader food processing unwanted? This decision precedes food recipe pricing and trade balancing. Other unvisited branches remain listed above.

## Food/happiness design direction from user

Q33 trade-only recommendation was not accepted. User proposes personal food preferences (examples meat, jam, bread) that change at an undecided frequency; happiness with food, urban layout, job, and relationship influences; positive/negative neighbor pairings (Bakery/plaza/Café and Solar Plant/Water Plant as positive examples).

Recorded as new direction with mechanics pending. Does not approve livestock, meat factories, exact negative pairings, mandatory nutrition groups, relationship life cycles, or placement restrictions. Existing gentle shortage/free-placement/free-relocation decisions still hold.

## Next focused frontier

Q34: personal versus household happiness and consequences. Q35: stable favorites versus rotating cravings and time basis. Q36: stock-versus-consumption preference fulfillment and automatic serving. Q37: neighbor-effect distance/meaning. Q38: relationship simulation depth. Q39: meat/protein production fiction. Precise bonus scales and stacking follow these decisions.

## Preferences/families/livestock answers

34. No answer yet on individual/household happiness and consequences; keep pending.
35. Accepted stable favorites and occasional changing cravings; fulfillment or a later visit can replace a craving, with no missed-request cycling during absence.
36. Accepted automatic serving from reserved household food, consumed once; timed satisfaction rather than inventory-presence credit.
37. Accepted proximity along walkable streets and placement/relocation highlights; exact range remains open.
38. Reject friendships-only scope: user wants family formation and children walking the streets. Detailed formation, household, aging, and workforce rules remain open.
39. Reject Protein Lab: actual livestock with buildings on the outskirts. Species and production chain remain open. Whether outskirts is a preference or a placement restriction needs resolution against the earlier any-building/any-plot requirement.

Next frontier: Q34 carried forward; Q40 outskirts placement; Q41 household formation and growth control; Q42 child lifecycle/needs; Q43 livestock types and meat-production presentation. Catalog changes and spatial-capacity specifics depend on these answers.

## Family/livestock decisions accepted

34. Individual happiness with household/town summaries; modest high-happiness adult productivity and immigration benefits; essential production protected at low happiness.
40. Dedicated larger rural plots along predefined outskirts roads for livestock; ordinary town plots stay flexible. Accepted exception to universal placement.
41. Relationships develop through shared activities; colonists request household formation and later a child; player approves housing/resources; requests do not expire.
42. Children have homes, preferences, friendships, visible activities, and no jobs. User explicitly overrides aging: children NEVER become adults. Old age/death deferred.
43. Chicken Coop for eggs, Dairy Barn for milk, Pig Farm for meat; grain feed and food-chain links; abstract non-graphic meat processing. Catalog now 22 types.

Next frontier: family/child count limits and house-versus-apartment household capacity; child needs; livestock feed and starting animal supply; whether children/social activities need new civic buildings; long-absence behavior for consumption/production. Detailed rates follow these choices.

## Round 8 answers — accepted September 29, 2026

44. Up to two permanent children per family, individually approved; housing/utilities and reduced adult-relative food consumption; optional with no decline/postpone penalty.
45. Families remain together: House has one household, Apartments multiple units, singles may share. Moving preserves family relationships/happiness history.
46. Playground civic amenity supports play/friendships and nearby-family benefits; School simulation deferred. Catalog is 22 buildings plus Playground.
47. Automated livestock feeding/collection, grain-to-feed recipe at Mill, initial animals included, lifecycle abstracted, shortages pause output without killing animals.
48. At most 48 hours of BOTH production and consumption during absence, then pause both until return. Construction and equipment-crafting timers can finish across full absence; colonists/animals safe and no accumulating craving penalties.

Remaining structural questions: Playground placement/tiering; cancellation/demolition/refund rules; NPC trade and credit sinks; job satisfaction without worker specialization; duplicate service limits; family-account identity and concurrent devices. Numerical balance and asset/renderer validation remain separate work after product agreement.

## Round 9 answers — all accepted

49. Preview household moves; require suitable accommodation, preserve roommates' housing; wait without penalty rather than displace residents.
50. Cancellation returns materials but forfeits progress and applied construction credit, disclosed first. Demolition returns half original materials, with rehousing and safe inventory transfer; release workers. Whether completed upgrade costs count in demolition refund remains to clarify.
51. In-progress crafts can finish across full absence; new queued crafts start/pay inputs only inside 48-hour simulation, then wait until return.
52. Animal products held safely at full storage, pausing subsequent output; resident food reserve precedes optional processing/feed; shortages do not kill livestock.
53. Adult preferred work category grants small happiness bonus; all jobs usable; coworker friendships help without constant reassignment.
54. Playground on ordinary plot, freely relocatable, five levels, improving equipment/family capacity, no permanent worker. Art scope now 23 × 5 = 115 appearances before variants.

Remaining core frontier: fixed NPC trade/credit uses; guaranteed shortage recovery; duplicate production/service rules; parent/cadet identity and concurrent town access; credit banking limits; visible travel versus simulated production. Then consolidate remaining tuning and architecture/prototype choices without presenting them as already approved.

## Round 10 answers — all accepted

55. Game-controlled Market buyers/published prices, Café orders; credits buy basic supplies, seeds, decorations, and research; battle materials excluded except dedicated exchange.
56. Starter habitat emergency meals are direct-use/nontradeable/nonprocessable; essential utility recovery; optional production pauses first; clear recovery actions.
57. Duplicate buildings allowed except one Construction Office and one Research Lab per town, upgraded over time.
58. Parent account with multiple cadets, no separate child email; protected parent controls; one active management device per town with explicit handoff.
59. Construction credit has no expiration/storage cap, fixed earned value, no retroactive scaling; spend only remaining project time and retain excess.
60. Assignments/resource rules govern output, not physical animation, camera, congestion, or render distance.

Consolidation: main plan rewritten September 29 to separate accepted rules, historical sketches, proposed technical direction, and unresolved interactions. Remaining frontier includes seeds/replanting, locked food demand, permanent gear structure, research unlock boundaries, refunds, and offline victory handling; tuning/prototype choices follow.


## Round 11 answers — accepted with equipment override

61. Parents set grade and eligible practice topics; every eligible topic earns full credit. Parent assignments can deliberately include review topics. Automatic mastery-based eligibility deferred.
62. User overrides one weapon/one armor recommendation: five armor pieces (Gloves, Helm, Armor [chest/body], Legs, Boots) and two weapon hand slots. Rifles are two-handed and occupy both slots; pistols are one-handed and two distinct pistols can be dual-wielded. Retain pre-mission equipment choice, permanent base stats, mission-only wave upgrades, and separate ammo system. Firing, ammo interaction, individual stats, and gear progression remain open.
63. Staffed Research Lab uses trade credits/town materials for timed permanent crop/recipe/advanced-tier unlocks. One project at a time in a separate queue; no construction credit acceleration; essential buildings not research gated.


## Round 12 answers — equipment behavior

64. User directs keeping pistols as they are; rifles should have higher base damage. Do not treat the proposed alternating-pistol firing redesign or rifle range increase as accepted.
65. Accepted one shared mission ammo setup across the equipped weapons.
66. Accepted primary armor roles: Helm accuracy, chest Armor damage reduction, Gloves reload/fire handling, Legs health, Boots movement. Crafted replacements improve stats; equipment changes character appearance. Exact formulas and how accuracy/handling map to existing combat require definition; this does not independently authorize a new reload system.


## Round 13 answers — all accepted

67. Increasingly advanced crafted replacements have published stats/material costs. Older equipment remains available to equip. No durability, repair costs, or randomized stats in initial V2.
68. One-time seed-variety purchase permanently unlocks automatic replanting; ongoing crops use workers/water/power without recurring seed purchases or automatic credit charges. Interaction with research-unlocked crop varieties remains to clarify.
69. Favorites/cravings and Café orders use only unlocked foods; new unlocks introduce new demand. This is an unlock restriction, not a requirement that goods currently be in stock.

Combat fact check for Q64–66: current pistols automatically target visible nearby enemies and fire simultaneous ammo volleys, sharing direct damage across streams; no alternating-hand cooldowns. No accuracy, handling, or reload stat currently exists. Preserve existing pistol firing; concrete helmet/glove effects need definition. Sources: src/combat-aim.ts, src/combat-rules.ts, content/balance/combat.ts, src/types.ts.


## Round 14 answers — removal policy reopened

70. Accepted basic seeds immediately purchasable; research makes advanced varieties purchasable, and a one-time purchase permanently enables planting/replanting.
71. User is unsure about demolition and proposes storing the building in inventory instead. Do not record the 50%-of-all-invested-materials recommendation as accepted. Suspend the earlier demolition rule while resolving storage and redeployment; residents, staff, goods, capacities, and active jobs need explicit treatment.
72. Accepted crafting/research pause on loss of required worker or utilities, preserving progress and resuming when requirements return. Show the consequence before worker reassignment. Reconcile with the prior full-absence crafting completion/48-hour economy limit before implementation.


## Round 15 answer — building storage accepted

73. Replace demolition with Store building. Retain completed upgrades in separate building inventory, with no storage fee; free instant redeployment on a compatible plot. Stored buildings provide no production, housing, storage capacity, utilities, or neighbor bonuses. Rehouse residents and transfer goods before storage; workers become available. Block if residents would lack homes or goods would lack capacity. Finish/cancel active construction first; preserve but pause crafting, research, and farming progress. Stored buildings count toward singleton limits. Preview consequences before storage. Supersedes earlier demolition/refund rules, not cancellation rules. Construction Office extra-slot behavior is a follow-on decision.


## Round 16 answers — all accepted

74. Two starter construction slots are permanent. Block storing the Construction Office while additional slots are occupied. After those projects finish or are cancelled, storage removes the extra slots; redeployment restores them.
75. Already-running construction, crafting, and research may finish beyond the 48-hour economy limit. Crafting/research must meet staffing and utility requirements during simulation; preserve eligibility at the cutoff for completion afterward. Blocked jobs remain paused. New queued jobs wait after the cutoff until return; the existing rule permitting starts within the simulated window remains. Stored buildings remain paused.


## Round 17 answers — all accepted

76. Automatically protect one day of household meals before processing or selling; show reserve in inventory, optional processing/trade only use surplus. Exact portions remain balance work. Existing household priority over feed remains.
77. Each neighborhood benefit type applies once from its strongest nearby source; different benefits combine. Repeated bakeries/playgrounds do not multiply the same happiness bonus. Negative-effect stacking remains separate.
78. A connected town visit reconciles saved progress, with a fresh absence allowance when the player leaves. Opening only battle or the parent dashboard does not reset town production.


## Round 18 answers — all accepted

79. Desktop and tablets first; phones supported with simplified controls and reduced visual detail. Validate touch early. Exact reference devices/performance budgets remain to establish.
80. Large transparent pressurized dome enclosing warm façades, narrow streets, gardens, and plazas; red Mars outside; rural plots near its edge. Specific regional architecture and final art treatment remain open.
81. First prototype: one small 3D street/plaza with House, Greenhouse, Bakery; elevated management and true behind-character walking cameras using the same assets; one building's alternate upgrade appearance. Validate both views before full economy work. This accepts the prototype scope, not an engine choice or final art kit.


## Round 19 answers — all accepted

82. Persist an offline wave-10 victory locally as a pending reward. Reconnect to settle once and reveal the crafting material; display “Reward saved—connect to collect.” Pending materials cannot be crafted with until collection. Once-only settlement and legitimate-victory verification require implementation.
83. Block Factories, Workshops, and livestock facilities slightly reduce nearby residential happiness. Apply the strongest nearby nuisance only, without cumulative penalties. Highlight affected homes before placement; do not prohibit otherwise compatible placement. Solar and Water Plants remain neutral to homes and benefit from being near each other.


## Round 20 answer — armor roles overridden; food sharing pending

84. User specifies Helm increases firing speed and Gloves increase critical-hit chance. Supersedes earlier helmet accuracy and glove handling recommendations; aim-leading and reloading are not requirements. Chest damage reduction, Legs health, and Boots movement remain accepted. Critical-hit mechanics and stat formulas remain to define.
85. Unanswered: recommendation was basic meals for everyone before preferences, with scarce preferred foods rotated among households and smaller child portions without happiness/job-rank priority. Do not treat this recommendation as accepted.


## Round 21 answers — all accepted

85. Basic meals for everyone first, then rotate scarce preferred foods across households to prevent monopolization. Retain smaller child portions without happiness/job-rank priority.
86. Critical hits deal 2× direct damage, with one roll per firing volley shared across ammo streams/pellets. Gloves increase critical-hit chance. No doubling of status durations or additional critical rolls. Exact chances remain balance work; classification of secondary ammo damage needs implementation detail.


## Post-interview follow-up — decorative production accepted

User asked about growing decorative trees and crafting benches, fountains, playgrounds, and basketball hoops, then accepted the proposed division of responsibilities. Greenhouse grows food; Plant Nursery grows decorative trees/flowers/shrubs/hedges; Workshop makes parts and decorative benches/fountains/planters/lamps/basketball hoops. Finished decorations enter inventory for free placement/movement in designated spaces along streets, plazas, and courtyards while keeping walking routes clear. Playground remains a separate complete five-level amenity; smaller crafted play equipment can coexist. Current prototype scenery does not implement this production loop. Recipes, timings, item footprints, and effects remain specification/balance work.
