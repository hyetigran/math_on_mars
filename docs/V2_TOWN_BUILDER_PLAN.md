# V2 town builder — consolidated design

Status: accepted product rules from the design interview through Q86 and the decorative-production follow-up, September 29, 2026. Numerical values and technical recommendations are explicitly separated below. The gameplay rules are a future design, not implemented gameplay. An isolated visual camera prototype is now available; see [prototype notes](V2_VISUAL_PROTOTYPE.md). Work remains isolated on `codex/v2-opening-session`.

## Vision and views

A charming, walkable European-inspired town on Mars combines idle construction, farming, family life, and separate town learning. Players may visit at any time. One shared town is seen from an elevated building view and a true behind-character street-level view.

Predefined streets and plazas establish the layout. Players choose buildings on ordinary plots without functional zoning restrictions. Livestock facilities instead use larger rural plots along predefined outskirts roads; this is an accepted exception. Neighborhood expansion follows capability milestones, such as housing and sustainably supporting a population, rather than a prescribed building checklist.

Street-level play includes walking, colonist conversations, and access to the same building controls as the overhead view. Interiors and required manual chores are deferred. Animations represent assignments, work, and social life but do not control essential production. Camera choice, render distance, and pathing stalls cannot change output merely because people are not visibly moving.

The town sits inside a large transparent pressurized dome, with warm façades, narrow streets, gardens, and plazas against the red Martian landscape outside. Rural plots sit near the dome edge. The dome supports the fiction of families, livestock, and outdoor cafés. User-supplied visual references now guide connected façades, narrow leafy lanes, courtyard blocks, gables, pedestrian squares, and compact settlement-to-farm transitions; see [visual reference notes](V2_VISUAL_REFERENCES.md). The owner-approved visual direction and selected MC-aligned concept are documented in the [art style guide](V2_TOWN_ART_STYLE.md); finished asset and in-engine validation remain outstanding.

Prioritize desktop and tablets, supporting phones with simplified controls and reduced visual detail. Validate touch controls early; exact reference devices and performance budgets remain to establish.

## Building catalog and progression

The accepted building catalog has 23 types: 22 production/residential/service buildings plus a Playground. Decorative items form a separate placeable catalog. All have five increasingly impressive visual levels, preserving recognizable identity and plot fit. A level does not necessarily add a floor. Initial builds take seconds; later levels extend through minutes/hours to days or weeks. Exact costs, durations, capacities, and benefits require tuning.

The functional roles below are agreed; particular visual treatments and numeric upgrade benefits are proposals.

| Building | Distinct gameplay purpose | Proposed upgrade benefits and visual progression |
|---|---|---|
| House | Houses residents who can staff production buildings | More resident capacity; simple dwelling becomes a richly detailed home with balconies and a roof garden |
| Apartments | Houses more colonists per plot than a house | Greater occupancy within a planned height limit; modest flats become an elegant courtyard apartment building. Proposed tradeoff: higher construction cost and utility demand, not better workers |
| Greenhouse | Grows staple crops used in food production | More growing beds and crop choices; simple glasshouse becomes an advanced conservatory |
| Orchard | Grows fruit for preserves and café recipes | More trees and fruit varieties; espalier courtyard becomes a lush enclosed rooftop orchard |
| Water Plant | Supplies water capacity for residents and growing buildings | More supported demand; cistern house gains visible filtration and water-recovery equipment |
| Oxygen Plant | Provides oxygen and air-recycling capacity for colonists | More supported residents; modest utility house becomes an advanced, architecturally integrated air-processing facility |
| Solar Plant | Supplies power capacity for advanced production equipment | More supported equipment; modest solar roof gains integrated panels and a sculpted solar canopy |
| Block Factory | Produces construction blocks from locally gathered Martian regolith | Larger production batches; masonry yard becomes an enclosed precision fabrication workshop |
| Workshop | Makes parts for machinery/building upgrades and crafts decorative furnishings such as benches, fountains, planters, lamps, and basketball hoops; blocks-to-parts remains a proposed fabrication input | Advanced part recipes and longer queues; workbenches become an automated artisan workshop |
| Warehouse | Holds harvested crops, goods, and construction supplies | More storage; simple storeroom becomes a substantial automated depot |
| Chicken Coop | Raises chickens for eggs on a rural plot | Greater animal capacity and improved husbandry facilities; values remain open |
| Dairy Barn | Raises cows for milk on a rural plot | Greater animal capacity and improved milking facilities; values remain open |
| Pig Farm | Raises pigs for meat on a rural plot, with abstract non-graphic processing | Greater animal capacity and improved farm facilities; lifecycle/recipe details remain open |
| Mill | Converts grain into flour or livestock feed | Larger batches and longer processing queues; small mill becomes a refined mechanized millhouse |
| Bakery | Converts flour into bread and pastries for sale or orders | New recipes and larger batches; modest oven shop becomes an elaborate neighborhood boulangerie |
| Jam Kitchen | Converts fruit into jam and other preserved goods | New recipes and larger batches; small kitchen becomes a glazed artisan production house |
| Café | Fulfills resident requests using produce and prepared food, earning trade credits and relationship progress | More request variety and service capacity; small counter becomes a lively café with loggia and roof terrace |
| Market | Trades surplus goods for trade credits and offers basic supplies for purchase | More trade choices and larger orders; simple storefront becomes an ornate covered market within its plot |
| Construction Office | Manages construction jobs and their queue | Longer queues and eventually additional concurrent jobs; contractor's shop becomes a detailed guildhall |
| Armory | A staffed building with its own queue for permanent armor and weapons, using battle-earned materials and town-made parts | Recipe access and visible equipment displays; tier benefits remain open |
| Research Lab | Unlocks crop varieties, recipes, and advanced building tiers through research projects | More project options; small lab becomes a distinctive research house with visible advanced equipment |
| Playground | A freely relocatable ordinary-plot amenity for children and nearby families; no permanent worker | Five visual levels improve equipment and family-serving capacity; exact values remain open |
| Plant Nursery | Grows decorative trees, flowers, shrubs, and hedges for town customization; Greenhouse remains for food crops | New plant families and more elaborate landscaping pieces; potting shed becomes a lush garden pavilion |

Multiple producers, homes, utilities, shops, Armories, and Playgrounds are allowed. Each instance must contribute production, capacity, or a local service. Construction Office and Research Lab are each limited to one per town, upgraded over time. The first two construction slots and basic building access cannot depend on already owning these services.

Two construction projects may run concurrently at the start; Construction Office progression adds slots. Upgrading buildings operate at their old level until completion, then activate new output and utility requirements. Equipment crafting uses its own queue, not construction slots.

Finished buildings may be moved or swapped free between compatible plots, preserving levels, residents, workers, inventory, and relationship/happiness history. Active construction/upgrade projects remain fixed until completed or cancelled. Cancelled unfinished work returns materials but loses elapsed progress and already-applied construction credit, disclosed before confirmation. Store building replaces demolition and its material-refund rule. Buildings retain all completed upgrades in a separate building inventory, with no storage fee, and can be placed again instantly and freely on a compatible plot. Stored buildings provide no production, housing, goods-storage capacity, utilities, or neighborhood bonuses. Rehouse residents and safely transfer goods before storage; release workers for reassignment. Block storage if residents would be homeless or goods would lack storage space. Finish or cancel active construction/upgrades before storage. Preserve crafting, research, and farming progress while stored, but pause those jobs. Resume only when placed and required staffing/utilities are restored. Stored buildings count toward singleton limits. Preview lost capacity and affected buildings before storing. The two starter construction slots are permanent. Block storing the Construction Office while any of its additional slots are occupied. When those jobs finish or are cancelled, storing it removes the additional slots; placing it again restores them.

## Decorative growing and crafting

The Plant Nursery grows decorative trees, flowers, shrubs, and hedges; the Greenhouse grows food crops. In addition to parts, the Workshop crafts benches, fountains, planters, lamps, and small play equipment such as basketball hoops. Finished decorations enter inventory, then can be placed and moved freely in designated spaces along streets, plazas, and courtyards. Placement must preserve clear walking routes.

The Playground remains a complete, separate ordinary-plot amenity with five upgrade levels; smaller crafted play equipment does not replace it. Building-level rules do not automatically imply five versions of every decoration. Recipes, durations, placement footprints, storage behavior after placement, and individual decorative effects remain to define. This accepted production/placement loop is planned gameplay; current prototype greenery and furniture remain scenery.

## Resources, food, and trade

| Concept | Treatment |
|---|---|
| Food | Actual edible inventory, summarized as food supply; not a second spendable balance |
| Building blocks | Stored construction material from Block Factory |
| Parts | Stored manufactured material from Workshop |
| Trade credits | Currency earned by selling goods and fulfilling orders |
| Power, water, oxygen | Supply capacity versus operating/population demand |
| Housing | Household units and occupancy; empty space alone creates no residents |
| Workforce | Adult workers assigned or available; children excluded |
| Research | Named projects and permanent unlocks, not a new science currency |
| Construction credit | Banked time from town learning, separate from trade credits |
| Crafting materials | Persistent battle rewards, separate from town parts and mission salvage |

Basic edible crops sustain residents. Specific foods such as bread, jam, and meat also serve preferences, recipes, and trade. Display detailed goods within inventory and relevant building controls rather than giving every ingredient a main resource meter. Residents consume portions once; consumed goods cannot also be sold or processed. Ready-to-eat food summary must exclude ingredients that require preparation.

Workers automatically serve food from a reserved household supply. Automatically reserve one day of household meals before optional processing, sales, or animal-feed production. Show that protected reserve in inventory; processing and trade use only surplus. Serve basic meals to all households before fulfilling preferences. Rotate scarce preferred foods among households so one family cannot monopolize them. Children receive their smaller portions without happiness- or job-rank priority. Exact portions remain to tune. Emergency meals from the starter habitat are consumed directly, cannot be sold or processed, and help recover a struggling town. Starter essential utility support permits recovery; pause optional production before essential services and explain a concrete recovery action. No colonist or livestock death from absence or ordinary shortage.

The Market has game-controlled buyers and published prices for individual goods. The Café fulfills composed food orders. Trade credits buy basic supplies, seeds, decorations, and research projects. Permanent battle materials stay outside ordinary trade except for their dedicated exchange. Recipe yields and prices must account for all consumed ingredients, processing time, staffing, and utilities; a processed good is not automatically profitable just because its price exceeds one ingredient's price.

Example connections: Greenhouse grain → Mill flour → Bakery bread; Orchard fruit → Jam Kitchen jam; bread/jam → household preferences or Café orders; grain → Mill feed → livestock products; Block Factory blocks → Workshop parts → construction and advanced equipment. The block-to-parts recipe remains a proposed material abstraction to validate. The suggested Food Kitchen replacement has not been adopted; Jam Kitchen remains in the catalog.

## Growing and livestock

Buy each seed variety once to unlock it permanently for the town. Players choose an unlocked crop and workers perform tending, harvest, and automatic replanting without recurring seed purchases. Ongoing growing cycles use workers, water, and power; automatic replanting does not spend trade credits. Basic seed varieties are immediately purchasable; research makes advanced varieties available to purchase. Buying the variety once permanently enables planting and automatic replanting. Crops stay safe during absence. If town storage fills, finish the current batch and hold it safely at the farm; pause subsequent production until transfer becomes possible, then resume automatically. Held goods are not consumable/sellable town inventory and must not be counted twice.

Chicken Coops produce eggs, Dairy Barns produce milk, and Pig Farms produce meat. Animals are visible; meat processing is abstract and non-graphic. Workers automatically feed and collect. Facilities begin with animals; breeding/replacement is abstracted into production cycles. Mill feed uses grain. Shortage of feed pauses output without killing animals. Completed animal products follow the held-harvest rule when storage fills.

Exact crops, cycle times, animal-feed rates, one-time seed prices, and production recipes remain to be balanced. Livestock uses rural plots; ordinary producers and services use town plots.

## People, households, and happiness

Adults arrive in small groups through non-expiring offers accepted explicitly by the player, with housing, food, and utility needs shown first. Population, household occupancy, and adult workforce are separate. Any adult can take any job. A preferred work category grants a small happiness bonus when matched; other work remains fully usable. Coworker friendships also contribute.

Relationships develop naturally through shared activities. Colonists request household formation and later may request children. The player approves the housing/resource commitment rather than selecting partners. Preview the move, preserve roommates' housing, and wait without penalty if no suitable household unit is available. Never silently displace another household.

A House contains one household; Apartments contain multiple units. Singles may share accommodation. Families stay together when moved. Each family may have up to two children, each individually approved. Declining or postponing has no penalty. Children remain children permanently: no aging into adults and no production jobs. They have homes, friends, preferences, and visible activities, occupy housing/use utilities, and consume less food than adults. Adult workforce expansion comes through immigration. Old age and death are deferred.

The Playground occupies an ordinary plot, moves freely, needs no permanent worker, and has five visual levels improving equipment and families served. It provides play/friendship opportunities and nearby-family benefits. School simulation is deferred and separate from the human player's learning.

Track individual happiness with household and town summaries. Food/preferences, surroundings, work, and relationships influence it. High happiness modestly benefits adult productivity and arrival attraction. Low happiness must not disable essential food/utility production.

Each colonist has a stable favorite and an occasional craving. Activate favorites and cravings only from foods unlocked by the player; generate Café orders from the same unlocked food pool. Newly unlocked foods can introduce new demand. An unlocked food need not currently be in stock; this rule prevents requests for locked recipes, not every temporarily unavailable food. Cravings persist until fulfilled or replaced during a later visit; do not rotate through missed requests while absent. Actually serving/consuming a preferred portion creates satisfaction for a period. Weights, frequency, portions, and durations remain tuning decisions.

Positive/negative neighboring-building effects follow short walkable-street distance, with affected buildings highlighted when placing/moving. Bakery/plaza/Café and Solar Plant/Water Plant are accepted examples of good combinations; exact bonuses are not set. Distinguish residential pleasantness from operational benefits. Each type of neighborhood benefit applies once, using the strongest nearby source; different benefits can combine. Repeated sources such as bakeries or playgrounds do not multiply the same happiness bonus. Block Factories, Workshops, and livestock facilities slightly reduce nearby residential happiness. Apply only the strongest nearby nuisance rather than stacking penalties. Highlight affected homes before placement without prohibiting otherwise compatible plots. Solar and Water Plants are neutral to nearby homes and benefit from proximity to each other. Exact effect strengths, range, and settling time remain to tune. Town-wide utilities do not require every consumer to be adjacent to a utility building.

## Two learning paths

Battle quizzes and town practice remain separate. Town practice supports self-selected question-bank topics and parent-assigned bank topics/question counts with optional due dates. External homework upload/entry is deferred. Missed due dates do not damage the town.

Town practice is untimed. Complete all questions and correct mistakes to earn credit. Check automatically using the bank; preserve first-attempt accuracy for parents without reducing rewards for needing help. Full rewards require a learning-level-appropriate topic or a parent assignment. A completed assignment cannot pay twice; a new qualifying set may earn again. No daily reward cap.

Construction credit is bankable time, scales at defined town milestones, and is displayed before practice. Its value is fixed when earned; later milestones do not revalue earlier credit. There is no storage cap or expiration. Applying credit cannot exceed the chosen project's remaining time; excess remains banked. It accelerates buildings/upgrades, never equipment crafting or research. Several short practice sessions should materially shorten late upgrades, potentially by days; exact award scales remain to be tuned.

Use the current attributed Kindergarten–Grade 5 question bank as the initial content source. It is a limited starter bank, not full curriculum coverage or a mastery assessment. Parents set the cadet's grade and eligible practice topics; all eligible topics earn full credit. Parent assignments may intentionally cover review topics. Automatic mastery-based eligibility is deferred. Assignment length normalization and repeated-question policy still need precise rules before reward implementation.

## Battle rewards and equipment

Battle missions have exactly ten waves. Each legitimate completion awards a random persistent crafting material; QA skips cannot grant permanent rewards. Begin with a small material pool, let duplicates accumulate, and provide a costly exchange route for unwanted types. Drop distribution, recipe quantities, and exchange rates are unresolved. If wave 10 is completed offline, persist the victory locally as a pending reward; on reconnect, settle it once and reveal the crafting material. Show “Reward saved—connect to collect.” Pending materials cannot be used for crafting before collection. Durable recovery, duplicate detection, and verification of legitimate victory remain implementation requirements.

Crafted armor/weapons persist across missions and defeat. Advanced recipes combine battle materials and town parts at a staffed Armory with a separate timed queue; early crafts are short. Starter gear keeps basic combat playable. Temporary mission upgrades and existing run-scoped ammo forging stay distinct from permanent gear. Choose permanent equipment before a mission; it provides base stats, while between-wave upgrades remain mission-only and ammo remains a separate system. Do not infer that the existing Legendary Omni Ammo forge supplies permanent equipment crafting.

The loadout has five armor slots: Helm, Armor (chest/body), Gloves, Legs, and Boots. Two hand slots hold weapons: a two-handed rifle occupies both slots as one equipped item; a one-handed pistol occupies one slot, allowing two distinct pistols to be dual-wielded. A two-handed weapon cannot be combined with another weapon. Preserve existing pistol behavior; rifles deal more base damage. The earlier proposed alternating-pistol redesign and additional rifle range are not accepted requirements. One shared mission ammo setup applies to the equipped weapon configuration, with earned ammo effects layered onto weapon behavior; do not create separate per-hand ammo loadouts. Current pistols auto-target and fire simultaneous ammo volleys, with direct damage shared across ammo streams; preserve that behavior. There are no independently timed left/right pistols. Exact rifle damage values remain balance decisions.

Each armor position has an accepted primary role: Helm increases firing speed; chest Armor reduces damage; Gloves increase critical-hit chance; Legs increase health; Boots improve movement. Crafted replacements improve these stats, and equipped pieces visibly change the character. Q84 replaces the earlier accuracy/handling roles: do not introduce aim-leading or reloading from those superseded proposals. A critical hit deals 2× direct damage. Roll once per firing volley and share the result across its ammo streams and pellets. Gloves increase critical-hit chance. Critical hits do not double status durations or trigger further critical rolls. Exact chance values, equipment stat stacking/limits, and the classification of secondary ammo damage remain to define before implementation. These are planned equipment effects, not a claim about implemented critical hits. Progress through increasingly advanced crafted replacements with published stats and material costs. Older equipment remains owned and available to equip. Initial V2 equipment has no durability, repair costs, or randomized stats. Replacement recipes and stat values remain to balance.

## Research

The Research Lab requires an assigned worker and consumes trade credits and town materials for timed projects. One project runs at a time in a queue separate from construction and Armory crafting. Completed research permanently unlocks crop varieties, recipes, and advanced building tiers. Construction credit cannot accelerate research. Essential buildings remain available without research; neighborhood milestones continue to govern district expansion. Basic seed varieties need no research; advanced crop research unlocks the option to purchase that seed variety once. Specific projects, prerequisites, and costs remain to define; research follows the absence policy below.

Armory crafting and Research Lab projects pause when required staffing or utilities are lost, preserving progress. Restore requirements to resume. Preview the effect before reassigning a worker. Crafting and research follow the full-absence completion eligibility rule below; storing their building always pauses them.

## Accounts, devices, and absence

One parent account manages multiple cadet profiles, each owning one town. Children choose a profile without individual email addresses; parent controls are protected. Only one device actively manages a given town at a time, with explicit handoff when switching. Identity/authentication technology is not chosen.

Starting construction, spending, assigning workers, and claiming town rewards require connectivity. Full offline town editing is deferred. Visible absence does not require a continuously running browser process: saved time/state must reconcile on return.

Production AND consumption simulate for at most 48 hours of an absence, respecting inputs, storage, food reserves, feed, utility demand, and shortages; both then pause until return. Already-running construction, equipment crafting, and research may finish across the full absence. During the first 48 hours, crafting/research progress only while their staff and utility requirements are met. At the cutoff, preserve the running job's staffing/utility eligibility: eligible jobs can finish afterward; blocked jobs remain paused. New queued jobs may start and pay inputs within the simulated window under the existing queue policy; after the cutoff they wait until return. Stored buildings remain paused. Opening the town while connected reconciles saved progress; leaving after that visit starts a fresh absence allowance. Opening only a battle or the parent dashboard does not reset town production. The window belongs to the town, not each device. Colonists/livestock stay safe and cravings do not accumulate absence penalties.

Server timing, legacy cadet migration, and reconnect implementation still need decisions; offline victory reward behavior is defined above. Backend technology remains open. Save town state independently from disposable missions, with durable once-only reward settlement and safe household/inventory transitions.

## Scope, current evidence, and validation

Current worktree code has a separate Canvas 2D camp and Phaser battles; source marine models and Three.js sprite-baking tooling exist, and an isolated Three.js visual prototype now exists at `/town-prototype.html`; no production town simulation exists. Profiles currently lack this town/permanent-equipment model. The six-wave mission preset found in code contradicts the accepted ten-wave rule and must be removed/aligned during implementation. CONTEXT.md distinguishes current presentation from agreed future V2 vocabulary.

Recommended technical direction, not yet an engine decision: one 3D town with overview and walking cameras, retaining Phaser combat and HTML math screens. Evaluate Three.js/Babylon.js on a small lane/plaza scene before committing. See [engine research](research/v2-town-builder-engine-research.md). Web timer background behavior supports elapsed-time reconciliation rather than tick counting ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)).

Accepted first prototype: one small 3D street and plaza with a House, Greenhouse, and Bakery. Switch between elevated management view and walking behind the character using the same scene/assets. Include an alternate upgrade appearance for one building to test readability and visual progression in both views. Validate desktop/tablet controls and touch early, with a reduced-detail phone check. This prototype tests cameras, scale, navigation, and asset reuse before the full economy.

Later sequence remains proposed: (2) a small economic/learning loop with saves; (3) a finished street corner and further sample building tiers; (4) families, rural farming, and the battle-material/Armory connection; (5) expand toward the full catalog. This sequencing does not remove agreed full-V2 features. Five levels across 23 types imply 115 visual states before corner variants; use reusable art structures and validate street-level and overhead readability before large asset production.

The [opening-session](V2_OPENING_SESSION.md) and [second-session](V2_SECOND_SESSION.md) documents are historical numerical sketches. Their continuous food production, single construction slot, minute-based early build times, and bed-only population model were superseded. Their arithmetic is not validation of the current design. Rewrite and test them after the final product choices and balance table are established.

## Remaining decision categories

- Detailed rules: specific research prerequisites, equipment stat stacking/limits, and classification of secondary ammo damage for the direct-damage critical rule.
- Tuning: crop/recipe catalogs and yields, input priorities, prices, worker/housing numbers, durations, research projects, reward amounts, happiness weights, craving cadence, neighborhood thresholds, and initial inventory. Proposals must be tested, not silently labeled accepted.
- Prototype/architecture: reference desktop/tablet/phone devices and performance budgets, chosen 3D renderer, authoritative saves/time, login/recovery/migration, detailed visual style and asset kit, and release stages beyond the agreed first prototype.

The [interview record](V2_DESIGN_INTERVIEW.md) preserves question-level decisions. ADRs record cross-device connectivity, rural-plot exceptions, and absence rules. Confirm shared understanding after the remaining design branches are resolved before implementing the resulting feature.
