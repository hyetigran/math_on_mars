# Balance tuning

Edit the values in `content/balance/`; they are the live settings used by the game. Restart the mission after changing values. Distances are world units, speeds are world units per second, and durations ending in `Ms` are milliseconds.

## Weapon and movement — `content/balance/combat.ts`

| Setting | Current value | Effect |
| --- | ---: | --- |
| `weaponRange` | 320 | Maximum targeting distance and projectile travel distance. Previously shots had no finite distance cap. |
| `projectileSpeed` | 560 | Base projectile speed; upgrades make shots faster without extending their range. |
| `baseDamage` | 18 | Damage before upgrades and ammo effects. |
| `shotDelayMs` | 520 | Delay between shots; lower means faster firing. |
| `marineSpeed` | 220 | Base movement speed. |
| `multiShotSpreadRadians` | 0.12 | Angle between adjacent pellets. |
| `multiShotDamage` | 1 / 1.15 / 1.3 / 1.45 / 1.6 | Total volley damage multiplier at Multi Shot levels 0–4. Volley damage is shared among ammo types, then the Multi Shot share is divided among its pellets. |
| `maxProjectiles` | 160 | Maximum simultaneous player projectiles. |
| `screenEdgeInset` | 24 | Keeps auto-targeting and direct/chain hits inside the current camera view. |

Range does not depend on projectile speed. Shots expire at their travel limit or when leaving the visible firing area. Burn already applied to an enemy can continue after that enemy moves off-screen.

## Other live balance files

| File | Controls |
| --- | --- |
| `content/balance/ammo.ts` | Ammo level odds, buy/sell values, Omni fire-rate bonus |
| `content/balance/chain.ts` | Chain range and damage limits |
| `content/balance/status.ts` | Frost slowdown and duration; burn damage and duration |
| `content/balance/enemies.ts` | Enemy attack ranges, speeds, telegraphs, boss patterns, spawning rules |
| `content/balance/missions.ts` | Mission length, enemy counts, and Goblin Gutter wave timer caps |

Some existing formulas remain in `src/shop.ts` (shop economy), `src/modules.ts` (upgrade rolls), and `src/session.ts` (quiz reward thresholds). The table above documents the exposed settings; it is not a second set of values loaded by the game.

Mixed loadouts fire one projectile per ammo type, except Multi Shot fires level + 1 pellets. Only Piercing projectiles carry a piercing budget. Frost, burn, and chain effects belong to their own ammo projectiles. Omni fires all five types; it does not make the other types pierce.

## Luck and chest drops — `content/balance/luck.ts`

- Chest drop chance: 8% × (1 + Luck), max 16%; replaces every-fourth-enemy drops.
- Bonus salvage: Luck × 50% chance of +1 salvage, in addition to the base drop.
- Shop rarity: Luck × 50% chance to promote a new ammo/module offer by one color, up to purple. Its price follows its resulting rarity. Existing offers are not rerolled when Luck changes.
- Luck cap: +100%. Lucky Salvage modules grant +5% at white and +10% at higher rarities. Quiz reward quality remains based on quiz performance.

## Wave timer reference

Copied from `/Users/tig/Desktop/gauntlet/goblin-gutter/src/data/balance.json` (`wave.timerCapBands`): waves 1–3 = 30s, 4–9 = 45s, 11–19 = 60s. Goblin Gutter bosses at 10/20 are untimed; Math on Mars retains an untimed final boss (wave 10 standard, wave 6 short). Like its `WaveDirector`, cleared waves can finish early; timeout despawns survivors without kill rewards. The timer advances only with combat simulation, including saved elapsed ticks.
