# Math on Mars — design validation notes

September 13, 2026. Companion to the [PRD](./GAME_PLAN.md) and [architecture](./ARCHITECTURE.md). These are planning calculations and explicit release checks, not evidence that the game, balance, curriculum, or mobile build has passed testing. Numerical product inputs remain in the PRD.

Reproduce the arithmetic with [design_checks.py](./design_checks.py): from the repository root run `python3 docs/design_checks.py`. It uses exact fractions and checks the stated examples, tier boundaries, capped-reward counterexample, burn-funding cases, support-window decisions, finite-bank counts, and initial catalog size. Inputs are hand-maintained planning formulas with a few document markers, not a parser that proves all prose consistent. It does not test an implemented command handler, browser storage, combat engine, or learners.

**Self-review of the current documents — September 13**

| Finding | Disposition in this pass |
|---|---|
| Choice caches inherited per-item accept/sell wording, permitting all alternatives to be claimed | Split choice and grant cache contracts. Choose/sell one complete option, close the whole choice cache atomically, and create two distinct instances for an accepted blue pair |
| Nonzero stat headroom still allowed 75-charge and 100-charge rewards to produce identical gains | Require room for ×1.50 of the first base modifier and positive gain in each additional quality modifier. Separate fixed math cards, replaceable invalid shop offers and fixed sellable cache contents |
| One ambiguous revision counter mixed UI actions with periodic saves; duplicate retries could fail a phase guard first | Separate interaction, simulation and storage revisions. Look up matching receipts before fresh-command guards; serialize writes using the latest durable revision |
| Burn replacement lacked a determinate partial-funding rule | Specify reservoir/rate equations, zero-funding behavior and conservation through ticks, including stronger but partially funded hits |
| Timed wave wording contradicted queued compact spawns | Define spawn schedule plus enemy/queue cleanup; final boss and internal final-wave exception are explicit. Add queue-drain, fair-admission and tick-latency verification |
| Pre-reader acceptance stopped at the quiz; three module families lacked icon prompts | Extend spoken guidance and acceptance through reward/cache/shop/next wave; add the three missing family icons, reused across variants |
| Template/content/occurrence identities and planned/actually presented history were conflated | Define content keys and presentation-time history, retain repeat support evidence, and require per-step adaptation-liveness traces |
| Per-item +20 feedback disagreed with the normalized three-item rail | Display correctness and speed contributions on the same 5/N scale as the rail; keep exact internal values |

The review also found unresolved design risks; these have **not** been proved away. The blue-pair collector route enables purple after wave one and needs comparison with staged tiers. A small step may be permanently ineligible for fresh promotion evidence under the 30-item exclusion; the whole-skill 500-item count is insufficient. Stronger reward eligibility may exhaust the 18-variant catalog in reachable high-power states; fixed prices/drop budgets and traces are still required. Short missions, accuracy streak, wrong-retry counting and the Omni stabilizer retain their provisional status; the PRD now requires a versioned policy record rather than letting prompts silently settle them.

**Review dispositions**

| Concern | Revision / outstanding evidence |
|---|---|
| Hint-first learners invisible | Two windows; six support-needed observations among ten presented items can offer support with zero unassisted attempts. Only the selected skill emits one suggestion |
| Flat blue/purple strength | First-modifier factor now runs continuously from ×1.00 to ×1.50 across normalized charge 0–125; actual useful stat headroom is required |
| Free K–1 solving during audio | Initial and replayed item-specific audio count as solve exposure; pause must stop speech and conceal the item |
| Unvalidated T | Gameplay owner owns target calibration; record method/narration cells, sample counts, median/IQR exposure/T, and speed-purple feasibility for each grade's primary method |
| Slow accurate ceiling | Two consecutive clean sets are a proposed alternate purple route, pending owner choice; speed still awards purple sooner and stronger first modifiers |
| Latest owner instruction | Wrong answer lowers this quiz's reward a tier. Counting a wrong retry again is a working detail awaiting clarification; earlier equipment is preserved |
| Promotion disagreement | One 9–10 advance / 6–8 retain / 0–5 support policy, plus support-need priority, in implementation and pilot rubric |
| Long sessions/inventory work | Separate sitting targets and full-mission estimates; proposed Short K–1 preset; five selectable pair-of-blue supply milestones avoid forty individual purchases |
| Ammo power spread | Calculated single-target, crowd, lifetime burn, and rate bounds below; revised volley/falloff/funded-burn proposal must pass a combat harness before content expansion |
| Frost tax / spent capacity | Boss slow now scales by tier; guaranteed type selection avoids random collection dead ends; proposed visible Omni capacity stabilizer retains Expander value |
| Early white-ammo trap | Starting capacity stays one; guaranteed first-clear salvage and persistent affordable first Expander, plus free manual equip/swap and early supply choice |
| Safari eviction | Adult installation/backup guidance, actual persistence status, external backup preparation/save flow, and deletion/restore/inactivity checks are launch gates |
| Pickup stutter | Pickups are in-memory domain changes with checkpoint persistence; wave-clear commits the sweep. No per-pickup database freeze |
| Self-selected touch target | Remove setup pacing choice; actual edit provenance chooses T, mixed edits use the smallest applicable target |
| Late reward repetition | 18 concrete variants across six families with distinct stat priorities, cap-aware filtering and useful-offer validation; runtime traces still pending |
| Bank/audio cost | 500 reviewed instances, explicit repeat spacing and unique-text cost model below; actual deduplicated manifest/reviewer quote still pending |
| Overload pause loop | Declared standard/compact admission limits and saved transition; schedule rather than silently discard work. Test both on minimum devices |
| Confounded cadence / pilot percentages | Three-arm structured observation with one primary boundary-quit measure; named failure stop rules replace a 70% gate in a tiny pilot |

**Reward arithmetic and incentives**

Per-question charge remains 20 plus up to five for a first unassisted correct response, 15 assisted, zero unresolved/revealed/skipped. Normalize to five-item equivalents using the planned N, including unattempted zero items. Wrong submissions affect the final tier as well as their question outcome; an error cannot be forgotten when its retry succeeds.

| Case, before any accuracy streak | Charge | First modifier | Final quality with each wrong submission counted |
|---|---:|---:|---|
| Five Hint-first correct, zero wrong | 75 | ×1.30 | Blue |
| Five unassisted unhurried | 100 | ×1.40 | Blue |
| Five unassisted fast | 125 | ×1.50 | Purple |
| Four fast + one Hint-first correct | 115 | ×1.46 | Purple |
| Four fast + one wrong-then-correct | 115 | ×1.46 | Blue |
| Three fast + two wrong-then-correct | 105 | ×1.42 | Green |
| Three Hint-first correct | 75 normalized | ×1.30 | Blue |
| Two fast + one Hint-first correct | 108⅓ normalized | ×1.433⅓ | Blue |
| One fast + two unattempted in a three-item set | 41⅔ normalized | ×1.166⅔ | Green |

The first example's 25-charge difference from an unhurried unassisted set changes saved modifier magnitudes. With only +1% damage headroom, however, an 8% base modifier at ×1.30 or ×1.40 yields the same +1% applied gain. The revised rule rejects that card and requires room for its full 12% maximum. Test all promised modifier rows and reachable purchases, not just nine floor rewards. This is a designed incentive, not a learning-effectiveness result.

The suggested confidence threshold p≈0.4 is not a general consequence of the earlier points table. Before tier drops, if q is probability of a correct assisted retry after a failed attempt and h is probability of success after Hint-first, expected attempt charge is `p × (20+b) + (1−p) × 15q`; Hint-first charge is `15h`. The crossover depends on q, h and speed bonus b. With q=h=1, attempting has greater expected charge for any p>0. The new tier drop adds a set-level nonlinear cost. Hint-first remains reasonable behavior to support; the dual-window rule must detect support need without treating seeking help as proven mathematical error.

For four unassisted answers plus one Hint-first answer, 15 speed charge is needed for a purple candidate. Equal ratios require 1.25T, but it is not a per-item conjunction: 1T, 1T, 1T, 2T produces the same bonus total. If the assistance followed a wrong submission, the owner's new drop makes the final award blue. Five unassisted answers at equal 1.6T total 110. T feasibility therefore needs actual input and narration measurements, not an educator's signature alone.

**Damage envelopes before choosing enemy HP**

D includes passive damage; r is firing rate before the proposed post-forge stabilizer. A lifetime shot bound includes damage that may take up to three seconds to burn. It must not be reported as instantaneous DPS. The crowd envelope assumes enough valid targets and impacts; actual spread, movement, overkill, range and existing burns reduce it.

| Configuration | Previous proposal | Revised proposal |
|---|---:|---:|
| Plain gun, one impact | 1D | 1D |
| White Piercing, sufficient targets | 2D direct | 1.5D direct |
| Purple Multi Shot, all pellets hit | 3D first impacts | 1.6D first impacts |
| Purple Piercing alone, sufficient targets | 5D direct | 1.9375D direct |
| Purple Multi Shot + Piercing, full crowd | 15D direct | 3.1D direct |
| Add purple Chain | +1.4D | +0.8D |
| Fiery on 29 distinct hit targets from one volley | Up to 26.1D over three seconds | At most 0.9D total funded increase in remaining burn damage |
| Maximal combined lifetime crowd envelope | 42.5D including burn | 4.8D including funded burn |

Old isolated-boss Multi Shot direct DPS was at most 3D×r; the quoted 16.4D direct/chain crowd figure is not boss DPS. Revised isolated-boss direct DPS is at most 1.6D×r, plus the actually funded non-stacking burn; chain needs another target and piercing needs another impact target. Boss/add encounters are a separate test scene.

At maximum proposed purchased capacity, Omni has a displayed ×1.12 fire-rate stabilizer. Its conservative fresh-crowd funding envelope is 4.8×1.12 = **5.376D×r**. Against white Piercing's 1.5D×r crowd direct bound at the same passive stats, that ratio is 3.584. At the proposed +60% passive damage and +60% ordinary attack-speed caps, the Omni upper envelope is 13.76256D₀×r₀ relative to an unmodified gun. This residual full-build spread is explicit; arithmetic normalization does not prove a common enemy table is balanced. The green-floor/no-forge path and maximal build both require measured boss/clear-time and survival checks before content expansion.

| Tier | Multi Shot pellet count | Total first-impact D | Combined Multi Shot + Piercing direct crowd D | Chain maximum D |
|---|---:|---:|---:|---:|
| White | 2 | 1.15 | 1.725 | 0.20 |
| Green | 3 | 1.30 | 2.275 | 0.40 |
| Blue | 4 | 1.45 | 2.71875 | 0.60 |
| Purple | 5 | 1.60 | 3.100 | 0.80 |

Frost is evaluated through damage avoided, chase spacing and boss windup control, not a fictitious damage number. Its proposed boss slow advances 10→12.5→15→20%. Fiery tiers fund 0.30/0.45/0.60/0.90D per shot, with reservoir accounting preventing free strong-burn refreshes. The fixed five-choice supply route makes getting the required Frost pair a deliberate selection rather than waiting on uniform random drops.

**Acquisition and session accounting**

Five milestone caches × two blue cartridges × four white-equivalents = forty white-equivalents. Selecting each type once produces the five purple ingredients with five normal merges, then one forge, using ten cartridges. Each cache closes after accepting or selling one complete option; its alternatives are never additional loot. Extra random drops use a saved five-type bag and are optional to that route. Choosing the module alternative or selling ingredients intentionally trades away the guaranteed forge. Standard milestones complete after wave eight; Short completes before its boss. This route also permits a purple cartridge immediately after wave one; compare first-tier arrival and merge time with staged-tier acquisition before approving the release schedule. Test both mission schedules and the non-collector alternative.

The first ordinary clear guarantees eight salvage; the first Expander costs eight and remains reserved until bought. Later prices are 16 and 24. This prevents random starvation while preserving the requested capacity-one start and shop-only expansion. The HUD/shop tutorial should surface “Equip collected ammo” and the explicit batch merge preview, so reserve ownership is not mistaken for an automatic weapon upgrade.

Full Standard example: 45×40 seconds of exposure/help/feedback + nine×90-second shops + six combat minutes + two setup minutes = **51.5 minutes**. Short example: 15×40 seconds + five×60-second shops + 3.5 combat minutes + 1.5 setup minutes = **20 minutes**. These are transparent planning inputs, not observations. Per-grade sitting targets and duration hypotheses are in the PRD; record answer exposure, narration/help, reward selection, cache/shop/forge, combat and planned stops separately.

**Finite bank, speech quote, and review effort**

| Reviewed skill bank | Minimum instances | Construction constraint |
|---|---:|---|
| K counting | 66 | 11 quantities × six reviewed layouts |
| K comparison | 110 | 55 unequal unordered quantity pairs × two layouts |
| K composition/decomposition | 84 | 21 ordered pairs totaling at most five × four layouts |
| Grade 1 addition | 80 | Balanced reviewed equations/representations within 20 |
| Grade 1 subtraction | 80 | Balanced reviewed equations/representations within 20 |
| Grade 1 missing addend | 80 | Balanced reviewed equations/representations within 20 |
| Total | **500** | Layout variation is not a claim of 500 distinct mathematical concepts |

Keep the last 30 exact content keys out of same-skill selection across runs and avoid the last eight operand signatures where possible (last four quantities for counting). Explicitly label a spacing relaxation as repeat practice and exclude too-soon repeats from accuracy/promotion/streak evidence while retaining support observations. Report relaxation per selectable step and prove continued access to fresh eligible evidence after a dismissed suggestion; a small step can otherwise remain invisible to promotion forever. Count actual presentations, not reserved/unseen instances. Generic shared narration may repeat; it cannot leak which visual answer is coming.

Read-only Sorceress `sorceress_list_tools` quote retrieved September 13, 2026 for Speech (TTS): **“Cost = 1 credit per 2,000 characters, minimum 1 credit (whole credits only). Charged only on success.”** The tool also specifies a short line of up to 2,000 characters costs **1 credit**. No speech generation was started.

Math/onboarding scenario: three distinct short clips per item plus 20 onboarding/help-control clips = 1,520 successful short-clip generations = **1,520 credits**. A planning allowance of 304 successful replacement clips (20%) makes **1,824 credits for this subtotal**. It excludes the newly explicit reward/cache/shop/loadout narration. If that UI adds U distinct short clips, the undeduplicated planning allowance becomes `ceil(1.2 × (1,520 + U))` credits; U is unestimated until its scripts exist. This is a derived allowance, not a complete budget or fixed provider quote. Deduplicating exact texts lowers the count; clips longer than 2,000 characters need a fresh exact quote. Obtain the manifest's actual unique texts/character counts and reconfirm live prices before a paid batch. Do not concatenate arbitrary numeral fragments to obtain a cheaper unreviewed spoken question.

Human review is a separate, unquoted cost. For scheduling only, 500 items at 1.5 minutes of item review is 12.5 hours; listening twice to 1,520 clips averaging six seconds adds about 5.1 hours. Additional UI speech, any bank expansion needed for per-step spacing, template/standard review, fixes and learner testing increase that estimate. The educator/narration reviewer must quote actual time and rates; these assumptions are not a commissioned review or budget approval. Measure download size from delivered encoding and duration, rather than assuming a small compressed package has a small decoded-memory footprint.

**Release evidence still required**

The updated planning script passed the listed arithmetic/examples, including threshold boundaries, capped-gain counterexample and burn funding. All 36 local document/image links resolved and Markdown code fences were balanced in this pass. These checks do not establish game correctness. Still pending: owner decisions on streak/Short default/retry counting and acquisition/stabilizer proposals; implemented command/save tests; per-profile T observations and speed-purple feasibility; learner stop-rule retests; standard/compact combat/DPS traces; reachable useful-offer traces; per-step bank/spacing validation and actual complete audio manifest/quote; and physical-device retention, external-backup restore, and inactivity-return checks. None is replaced by this report.

For Safari, test the documented activity-based ITP risk and actual persistence result on supported versions, including Home Screen use. Synthetic whole-origin deletion verifies the external restore path; it does not prove an elapsed inactivity test passed. [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/).
