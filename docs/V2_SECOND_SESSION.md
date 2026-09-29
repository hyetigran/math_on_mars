# V2: establish a self-sufficient neighborhood

Status: proposed progression and tuning, September 28, 2026. Companion to [the opening session](V2_OPENING_SESSION.md). None of these costs, unlock conditions, or durations are final. Planning only; no runtime changes.

**Interview update, September 28:** the user chose crop selection with growing cycles and worker-managed tending/harvesting. Continuous food production below is a superseded tuning simplification. Its checked totals must be recalculated once crop rules are settled. Play is available at any time; these timelines are examples, not prescribed session lengths. The agreed progression now starts with seconds-long builds and extends to days/weeks at advanced levels, so build times and fixed ten-minute practice rewards below also need redesign. Battle and town learning are separate paths. Two construction slots are now confirmed; the single-slot sequence below is a historical example, not the current concurrency requirement.

## What this stage should accomplish

The player learns that a town needs both people and supporting services. Build a Workshop to replenish parts, expand life support to admit residents, expand power and water, then build the first apartment. Walking through the resulting neighborhood should show a mix of homes, growing space, workshops, and distinctive utility buildings within the same narrow-street architectural style.

This stage follows the example opening at minute 30. It spans 60 more minutes of town time, which may be split across visits; it is not a required hour-long play session. Construction finishes during absence, but new jobs and colonist arrivals require player actions. The exact example assumes those actions occur at the listed times. Returning later moves subsequent steps later.

## Starting point

Use the opening example's ending state: 52.2 food, 92 blocks, 18 parts, 60 credits, 6 colonists, 8 beds. Four workers are assigned (two Greenhouse L2, two Block Factory), leaving two available. Power is 7/10, water 6/8, oxygen 6/6. Four of the initial twelve plots are occupied. One construction drone runs one job at a time.

Starter capacity remains in place; expanded services add to it. No additional credits, quest gifts, salvage, or practice rewards are assumed in the balance check.

## Five new building choices

All five types are selectable on any empty plot. Suggested catalog visibility: show all from the outset, with a recommended next action; do not create mandatory building-order locks for these basic services. Availability is distinct from affordability and safe activation. An apartment can be constructed before life support expands, but new residents cannot move in without sufficient support.

| Level 1 building | Blocks / parts | Build time | Worker slots | Effect at full staffing | Operating power / water |
|---|---:|---:|---:|---|---:|
| Workshop | 24 / 4 | 6 min | 2 | Uses 1 block/min to make 0.5 parts/min | 2 / 0 |
| Oxygen Plant | 20 / 4 | 6 min | 1 | Adds oxygen support for 6 residents | 1 / 0 |
| Solar Plant | 18 / 3 | 6 min | 1 | Adds 8 power capacity | 0 / 0 |
| Water Plant | 18 / 3 | 6 min | 1 | Adds 8 water capacity | 1 / 0 |
| Apartments | 30 / 6 | 10 min | 0 | Adds 8 beds | 2 power when occupied; resident water counted separately |

Workshop throughput scales by staff: one worker consumes 0.5 blocks/min and produces 0.25 parts/min; two double both rates. Its fixed power requirement remains 2 whenever operating. Resource conversion is an abstract fabrication recipe, not a claim about making machinery from masonry. The wider material fiction can treat building blocks as standardized construction feedstock before more detailed recipes are introduced.

Utility buildings provide their listed capacity only while staffed and supplied. Initial solar generation omits day/night variation and batteries, preserving the first version's simple capacity model. Water and oxygen systems omit consumable chemical feedstocks. Homes have no jobs; residents may work anywhere, without adjacency requirements.

Apartment versus houses: one apartment gives the same eight beds as two Level 1 houses. It occupies one plot instead of two, costs 30 blocks/6 parts versus 32 blocks/4 parts, and uses the same 2 total power at full occupancy. This makes apartments efficient in land and blocks but more expensive in parts. A single house remains the cheaper incremental purchase. No happiness or worker-quality penalty distinguishes apartment residents.

## Recommended path, not mandatory sequence

| Time from town start | Action | Immediate lesson |
|---|---|---|
| 30 | Start Workshop | Construction stock will become a renewable supply |
| 36 | Assign both available workers to Workshop | Parts replenish, but blocks now feed two purposes |
| 42 | Start Oxygen Plant | Oxygen limits immigration despite vacant beds |
| 48 | Move one Workshop worker to life support, then accept two residents into the second house | Reassignment trades some parts output for population growth |
| 48 | Start Solar Plant | More workers need more operating infrastructure |
| 54 | Assign one new resident to solar; start Water Plant | Power rises from 10 to 18 capacity |
| 60 | Assign the other new resident to waterworks; start apartment | Water rises from 8 to 16; staff are now fully assigned |
| 70 | Apartment completes | Beds rise from 8 to 16, while population remains 8 |
| 72 | Accept two residents into the apartment | Population rises to 10, with two available workers |
| 72–90 | Inspect output, take a walk, practice, or plan the next producer | The next decision belongs to the player |

At minute 48, complete and staff life support before accepting arrivals. The two-minute delay between apartment completion and arrival acceptance is illustrative player timing, not an automatic immigration countdown. Immigration offers occur in pairs for this sample, require explicit acceptance, and do not expire. Their final cadence remains open.

The sample ends with nine occupied plots: two houses, one apartment, greenhouse, Block Factory, Workshop, life support, solar, and waterworks. Three remain available for the player's next choices. Additional predefined neighborhoods will be needed for the full catalog.

## Immigration and assignment rules for this slice

Before accepting a pair of colonists, preview and validate beds, oxygen, water, and any new residential power demand together. Require a proposed ten-minute food reserve for the resulting population and nonnegative current net food production. At ten residents this reserve is ten food. Reserve duration is tuning, not an accepted global rule. The readiness panel should state exactly what is missing and show the buildings that can resolve it.

Workers remain interchangeable. A worker can change jobs without a fee; assignment changes output and demand atomically. Protect essential services: reject a reassignment that would remove oxygen or water needed by existing residents, with an explanation and a suggestion to assign a replacement or pause optional users. Never trap a worker silently or let a confirmation create an unannounced essential-service failure. Removing optional factory demand can free power for essential uses.

Construction itself does not require colonist staffing. A new producer can be built dormant if operating capacity is unavailable, with a clear preview. Activating it requires available workers and utilities. This differs from an in-place upgrade: reserve that upgrade's extra operating demand before accepting the job, since the building will continue operating when it completes. Replacing or demolishing occupied homes remains unavailable until relocation is designed.

## Checked sample balances at minute 90

Assumptions: exact timing above; no purchases beyond the five buildings; all producers continuously staffed as listed; no further practice boosts; no inventory limits reached; no decorative costs. This is a deterministic arithmetic check, not a playtest or a production simulation implementation.

| Measure | Calculation | Result |
|---|---|---:|
| Food production | 60 × 1.2 | 72 |
| Food consumption | 18 × 0.6 + 24 × 0.8 + 18 × 1.0 | 48 |
| Food remaining | 52.2 + 72 − 48 | 76.2 |
| Blocks produced | 60 × 2 | 120 |
| Blocks used by Workshop | 12 × 1 + 42 × 0.5 | 33 |
| Blocks spent on buildings | 24 + 20 + 18 + 18 + 30 | 110 |
| Blocks remaining | 92 + 120 − 33 − 110 | 69 |
| Parts produced | 12 × 0.5 + 42 × 0.25 | 16.5 |
| Parts spent | 4 + 4 + 3 + 3 + 6 | 20 |
| Parts remaining | 18 + 16.5 − 20 | 14.5 |
| Credits | Unchanged | 60 |
| Residents / beds | 6 + 2 + 2, across three homes | 10 / 16 |
| Assigned / available workers | 2 greenhouse + 2 regolith + 1 workshop + 3 utilities | 8 / 2 |
| Power | Homes 4 + greenhouse 3 + regolith 2 + workshop 2 + life support 1 + waterworks 1 | 13 / 18 |
| Water | Residents 5 + greenhouse 3 | 8 / 16 |
| Oxygen | Starter 6 + life support 6 | 10 / 12 |
| Net food rate | 1.2 − 1.0 | +0.2/min |

A minute-by-minute calculation checked every purchase, staffing count, power/water/oxygen allocation, and final inventory. Lowest balances were 52.2 food, 24 blocks, and 7 parts. Starter storage caps were not reached.

This stage ends with a useful choice: add a second greenhouse for food headroom, put the second worker back in the Workshop, or save parts for another building. Another two arrivals would use all oxygen capacity and bring the existing greenhouse to zero net food; the readiness panel should explain the lack of growth headroom even if the action is permitted. The player can choose to establish more production first.

## Learning remains an accelerator

This route needs no additional practice to finish. A completed set can shorten the selected construction job; a six-minute job can use at most its remaining time and banks the rest of a ten-minute reward. It does not manufacture parts, auto-assign staff, or admit residents. If faster construction moves a later purchase earlier, recheck current materials and capacity rather than assuming the unboosted timeline's inventory.

Do not prescribe a number of practice sets per hour or treat question speed as a town production stat. Keep the existing mission question bank and combat scoring behavior unchanged. Long-term credit pacing remains a separate design decision.

## Follow-up design boundaries

Not solved by this sample: alternate-build-order recovery, recipe variety, trade prices, all higher building tiers, duplicate service/research value, immigration cadence, long-absence limits, apartment relocation, or the complete 18-building economy. In particular, withholding a market from this sample means credits are intentionally dormant; the next production/trade chapter must give them a clear use.

Next concrete implementation step remains the small 3D camera-and-street prototype described in the main plan. The two session documents now provide enough provisional economic detail for an independent town-rules prototype once that implementation scope is chosen. No game code or current saves are changed by these documents.
