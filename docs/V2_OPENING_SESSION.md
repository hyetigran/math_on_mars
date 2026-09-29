# V2: the first 30 minutes

Status: proposed playable opening and numerical tuning draft, September 27, 2026. The user has authorized planning on this separate worktree. This document does not implement gameplay or establish final balance. It builds on V2_TOWN_BUILDER_PLAN.md and preserves current combat behavior in CONTEXT.md.

**Interview update, September 28:** the user chose crop selection with growing cycles and worker-managed tending/harvesting. Continuous food production below is a superseded tuning simplification. Its checked totals must be recalculated once crop rules are settled. Play is available at any time; these timelines are examples, not prescribed session lengths. The agreed progression now starts with seconds-long builds and extends to days/weeks at advanced levels, so build times and fixed ten-minute practice rewards below also need redesign. Battle and town learning are separate paths. Two construction slots are now confirmed; the single-slot sequence below is a historical example, not the current concurrency requirement.

## Experience to prove

Within one session, the player should choose a building plot, meet housed colonists, assign workers, understand food production, use math practice to accelerate a visible upgrade, and welcome new residents. The payoff is walking past the improved greenhouse and seeing its workers and plants through the windows.

Thirty minutes describes an example session, not a countdown, mandatory lesson length, or deadline. The player may explore, leave, or take longer on questions. Construction proceeds during practice and absence; tutorial prompts follow milestones rather than forcing timestamps.

## Arrival scene and starter town

An authored pedestrian lane links a small plaza, the existing mission portal, and 12 initial plots. Two plots contain a furnished Level 1 house and a working Level 1 Block Factory. Ten are empty and accept any available building type. Future neighborhoods add plots; the full catalog remains at least 12 purposeful types, with 18 currently proposed. Unavailable types can be previewed with clear unlock conditions; plot position never restricts type.

The starter habitat provides baseline utilities outside the buildable plots. It is visible background infrastructure, not free copies of all utility buildings. The mission portal remains accessible; no mission is required to begin the town lesson. A construction drone handles the first serial construction jobs without requiring a Construction Office or an idle colonist.

| Starting state | Proposed amount | Purpose |
|---|---:|---|
| Colonists | 4, all housed and initially available | Enough for a farm and materials production |
| Housing | 4 occupied / 4 beds | Establishes that more residents need another home |
| Food | 40 portions | Provides room to explore without an immediate shortage |
| Building blocks | 100 | Funds the introductory projects without waiting for income |
| Parts | 30 | Funds construction and the first upgrade |
| Credits | 60 | Introduces trade later; no opening task requires spending them |
| Power | 10 capacity | Starter habitat supply |
| Water | 8 capacity | Starter habitat supply |
| Oxygen | Supports 6 residents | Allows one additional two-person arrival |
| Storage | 200 food, 200 blocks, 100 parts | Provisional per-category starter limits; credits have no warehouse cap |
| Practice credit | 0 minutes | Earned through completed practice |

No additional raw-soil resource is tracked for Block Factory: its local feedstock is abstracted. Parts are starter stock until the Workshop is introduced. The UI labels supplies as a founding grant so normal future production does not appear to create materials from nowhere.

## Opening building and utility tuning

All numbers below are deliberately small tuning parameters, not real physical units. Fractions may be kept internally; UI rounds display without changing stored balances.

| Building or upgrade | Cost: blocks / parts | Base duration | Jobs | Output or capacity | Power / water |
|---|---:|---:|---:|---|---:|
| Starter house | Already built | — | 0 | 4 beds | 1 power while occupied; resident water counted separately |
| Block Factory L1 | Already built | — | 2 | 1 block/minute per worker | 2 / 0 while operating |
| Greenhouse L1 | 20 / 4 | 3 minutes | 2 | 0.4 food/minute per worker | 2 / 2 while operating |
| Greenhouse L2 upgrade | 20 / 6 | 20 minutes | 2 | 0.6 food/minute per worker after completion | 3 / 3 while operating |
| Additional house L1 | 16 / 2 | 5 minutes | 0 | 4 more beds | 1 power while occupied; resident water counted separately |

Each arrived colonist consumes 0.1 food/minute, uses 0.5 water capacity, and occupies one oxygen-support slot. Food consumption includes available as well as assigned workers. Empty homes do not create residents or consume residential operating power. Reserve capacity for an arrival or upgrade before confirming it; distinguish reserved and active demand in the UI.

For this opening prototype, the greenhouse is a continuous producer after planting its first crop. Its crop animation depicts production but does not introduce a separate batch harvest schedule. Manual planting, harvest cycles, varieties, and processing chains follow in a later farming design. This keeps the numerical model explicit rather than mixing continuous rates with unspecified crop timers.

A partially staffed producer scales output linearly with assigned workers. Any operating producer reserves its full listed utility demand; zero workers means zero production and no operating utility demand. During an upgrade, existing staff continue producing at the old level. The new demand is reserved when the upgrade is accepted and activates at completion. This avoids asking a food upgrade to disable the colony's only food source.

## Suggested session sequence

| Approximate minute | Player action | What it teaches / reveals |
|---|---|---|
| 0–1 | Meet four colonists by their home; switch between overhead and walking views | This is a place to inhabit, and workers have homes |
| 1 | Choose any empty plot and begin the greenhouse | Costs, construction time, free plot choice |
| 1–4 | Walk the lane, inspect home occupancy, view scaffolding | Construction proceeds without constant interaction |
| 4 | Assign two colonists to the completed greenhouse | Food changes from declining to growing |
| 6 | Assign the other two to Block Factory | Workers are a limited, reusable capacity |
| 8–10 | Preview greenhouse L2, including appearance, rate, and increased utilities | Upgrades change both the town and its economy |
| 10 | Begin the 20-minute greenhouse upgrade | A concrete project for practice to accelerate |
| 12–15 | Complete an optional short town practice set | Learning earns a clearly stated 10-minute reduction |
| 15 | Apply the earned credit to the greenhouse | The finish estimate moves from minute 30 to minute 20 |
| 15–20 | Explore, inspect future buildings, or use the mission portal | Waiting does not require repeated tapping |
| 20 | Watch the L2 reveal; queue another house | The upgraded greenhouse can support a larger population |
| 25 | Inspect four newly available beds and an offer for two arrivals | Empty housing and actual population are different |
| 27 | Accept two new colonists | 6 housed, 4 employed, 2 available; choose what comes next |
| 27–30 | Preview Workshop or utility expansion and walk past the new home | Leaves the player with a purposeful next project |

Only one construction job runs at a time in this slice. Costs are spent once on job acceptance. Jobs finish automatically, with a reveal available on return; an unviewed animation cannot block the next job. New colonists arrive only after explicit acceptance of a readiness-checked offer. The sample's two-minute gap between house completion and acceptance is player timing, not an immigration timer.

Without practice, the greenhouse upgrade completes at minute 30 and housing can follow afterward. The sequence is slower but fully viable. If practice takes longer, recalculate from actual elapsed time and bank any unused reduction; never require the learner to match the sample timeline.

## Town practice and the existing learning system

Use the current checked-in, attributed Kindergarten–Grade 5 question bank and cadet answer-mode preference. Do not claim generated questions or full curriculum coverage: current CONTEXT.md explicitly describes a fixed starter bank. Town practice is a separate untimed activity; it does not change the configured between-wave quiz, correction round, reward power level, or combat rewards.

Proposed opening set: five questions with help and corrections, followed by a fixed 10-minute construction credit on completion. Five is a town tuning proposal, not a change to mission question-count settings. Preserve first-attempt correctness and correction history. No reward for QA skip or an unfinished set. Record an occurrence ID and settlement receipt so retries/reloads cannot grant the same credit twice.

The credit is earned once per completed set and can be applied to a chosen construction/upgrade job. Applying it subtracts up to the job's remaining duration; excess stays banked. Earned credit and its use are separate, durable operations. No construction job or particular building is required to practice. Repeat-set pacing and long-term reward limits remain open; this opening does not define an unlimited-credit economy.

## Thirty-minute balance check

Assume the actions occur at the example times, no sales or additional purchases, continuous production, no caps reached, and all utility allocations pass. A practice completion at minute 15 applies 10 minutes to the upgrade started at minute 10, so it finishes at minute 20.

| End-of-session measure | Calculation | Result |
|---|---|---:|
| Food produced | 16 min × 0.8 + 10 min × 1.2 | 24.8 |
| Food consumed | 27 min × 4 × 0.1 + 3 min × 6 × 0.1 | 12.6 |
| Food remaining | 40 + 24.8 − 12.6 | 52.2 |
| Blocks remaining | 100 − 20 − 20 − 16 + 24 min × 2 | 92 |
| Parts remaining | 30 − 4 − 6 − 2 | 18 |
| Credits | No introductory spending | 60 |
| Residents / beds | Four starters + two accepted arrivals | 6 / 8 |
| Assigned / available workers | Two greenhouse + two Block Factory | 4 / 2 |
| Power demand / supply | Two occupied homes + greenhouse + Block Factory | 7 / 10 |
| Water demand / supply | Six residents × 0.5 + greenhouse | 6 / 8 |
| Oxygen demand / support | Six residents | 6 / 6 |
| Net food rate | 1.2 production − 0.6 consumption | +0.6/min |

This checks arithmetic and affordability, not whether the pacing feels fun. Oxygen is the next visible expansion constraint; two vacant beds do not mean two more arrivals are currently supported. The player can assign their two available workers to an existing/new producer while planning utility expansion. Utility and Workshop costs must be designed before a subsequent-session build is considered balanced.

## Recovery and persistence requirements

- If the learner leaves during practice, preserve the set and any submitted history; resume without duplicate rewards. Town elapsed time continues separately from active mission time.
- If construction finishes during practice, credit remains usable elsewhere. If it is partly used, bank the excess.
- At capacity shortages, explain the limiting supply and block additional commitments rather than silently accepting a nonfunctional building upgrade or arrival.
- At food exhaustion, pause immigration and optional food spending; colonists survive and keep essential food recovery possible. An emergency starter-habitat meal supply prevents permanent failure without requiring credits or a staffed market; its exact recovery amount and cooldown need tuning before release.
- A worker has at most one workplace and one home. Reassignment changes both buildings together; no double production. Reject home removal while occupied until a relocation policy is implemented.
- Apply offline production chronologically with input exhaustion, storage caps, consumption, and upgrade events. Do not award L2 production for time before its completion. On return, summarize elapsed time, completed projects, inventory changes, and any cap reached.
- Keep town persistence separate from disposable missions. Arena exit or defeat cannot remove colonists, practice credits, or town construction.

## Prototype acceptance and next steps

The smallest playable validation uses an authored lane and plots, two camera arrangements, two housing instances, Block Factory, a greenhouse with two visual levels, four initial colonists, two arrival colonists, and the practice-to-construction link. Placeholder 3D assets are sufficient for the economy test. A third greenhouse tier belongs to the subsequent art proof; no full catalog is needed to validate this opening.

Check in playtesting:

1. Can the player explain beds versus residents versus available workers after assigning their first job?
2. Does the greenhouse completion and later upgrade feel visibly rewarding from both cameras?
3. Does the displayed 10-minute practice reward feel worthwhile without making the rest of play tedious?
4. Can a player who takes longer on questions or skips practice still progress?
5. Do reload, duplicate reward submission, offline completion, and worker reassignment preserve correct state?
6. Are plot selection, movement, and building panels usable on the actual target phone/tablet?

The [second-session design](V2_SECOND_SESSION.md) now specifies proposed costs, staffing, availability, and checked progression for Workshop, Water Plant, Oxygen Plant, Solar Plant, and the first apartment. Before building the playable prototype, resolve the 3D renderer through the small camera test already described in V2_TOWN_BUILDER_PLAN.md.
