# Product context

Implemented behavior follows [CONTEXT.md](../../CONTEXT.md). [GAME_PLAN.md](../GAME_PLAN.md) still describes the original interview decisions; where they conflict, CONTEXT wins.

## Implemented session loop

Walkable camp → portal (grade + mission) → combat wave → five initial answers → **correction round (if any misses)** → choose reward → accept/sell loot → shop/inventory → next wave. Defeat and final victory end the run and return toward camp. There is no Save & Exit for a mission; pause keeps the current session only.

Every grade gets exactly five mandatory questions sharing one 30-second countdown. Freeze remaining time after the fifth initial answer:

| Remaining time | Starting reward |
| --- | --- |
| More than 20 seconds | Purple |
| More than 10, up to 20 seconds | Blue |
| More than zero, up to 10 seconds | Green |
| Zero | White |

Each wrong initial answer lowers the reward one tier, with white as the floor. Timeout never skips unanswered questions. Development builds may use a labeled QA skip; production hides it.

The correction round is untimed and happens **before** reward selection. Corrections do not change the earned reward power level or rewrite first-try accuracy. There is no skip in normal play, charge score, per-question speed bonus, or accuracy streak.

Supply caches / milestone ammo bundles are removed. Progression is quiz rewards, enemy loot (sealed chests revealed after reward), and shop purchases. Luck can raise chest chance, bonus salvage, and shop-offer rarity; it does not change quiz rewards.

## Implemented ammo model

The Pulse Blaster fires continuously. Each equipped ammo type fires its own projectiles in the volley. Only Piercing passes through enemies; others stop on impact. Electric Chain can jump on impact. Direct damage per volley is shared across types. Matching type/tier pairs merge through purple. One purple of each type forges Legendary Omni Ammo (all five streams, one slot). Capacity starts at one; shop Expanders raise it to four.

## Adjustable defaults

White reward magnitude, mission lengths (Short 6 / Standard 10), prices, weapon range, wave timer caps, and luck rates are prototype tuning in `content/balance/` and [BALANCE.md](../BALANCE.md). Preserve that status when changing numbers.
