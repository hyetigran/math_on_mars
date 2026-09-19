# Audio audit — September 18, 2026

## Findings and changes

- Camp music existed as a WAV master but was absent from runtime conversion and had no playback owner. Added its MP3 and camp playback, machinery/wind ambience, portal proximity loop, footsteps, and portal entry.
- Quiz, rewards, loot, shop, equipment, and interface effects were exported but not wired. Connected them to screen entry and completed actions. Reward and loot reveals fire once per mission/wave; transaction feedback follows successful persistence. Invalid answers/actions use gentle feedback.
- Battle music previously restarted with each combat controller. It now retains its playback position across waves, resets for a new mission, and fades in. Boss music starts at zero. Pause resumes existing loop positions; camp destruction stops its sounds.
- Added Piercing impact feedback and occasional nearby slime movement. Boss entry plays when the boss is already present at scene creation. Terminal death cues are owned by the finish sequence to prevent duplicate triggering.
- Camp music preloads during the splash without blocking game loading and attempts automatic playback when camp opens. Browsers that block audible autoplay require an initial click/key gesture; one-shot effects are not queued behind that gate.

## Music

| Asset | Actual duration | Wiring |
|---|---:|---|
| music_camp | 98.18 s | Camp loop, paused with camp and stopped on exit |
| music_battle | 91.43 s | Ordinary-wave loop, position retained across waves |
| music_boss | 66.67 s | Boss encounter loop, starts at beginning |

There are no separate quiz/shop music assets. Those screens currently have action SFX only.

## Selected effects and triggers

Names below refer to runtime MP3s under `src/assets/audio/runtime/`.

| Assets | Trigger |
|---|---|
| marine_footstep_01 | Ground travel in camp and combat; no camp footsteps while jumping |
| portal_enter | Entering the camp portal |
| blaster_fire_01, ammo_omni_fire | Normal or legendary firing |
| ammo_multishot_accent | Multi Shot volley accent |
| ammo_piercing_hit | Actual Piercing projectile impact |
| ammo_electric_arc | Chain lightning jump |
| ammo_frost_apply, ammo_fiery_apply | Observed application/refresh of frost or burn |
| marine_damage | Lost suit health |
| marine_low_health | Crossing below 25% health; rearms after healing |
| medkit_use | Successful combat healing |
| marine_shutdown | Defeat finish sequence |
| slime_move_01 | Moving slime within 180 world units; at most once per two seconds |
| slime_hit_01 | Observed slime health loss |
| slime_death, splitter_divide | Slime removal or Splitter division |
| spitter_windup, spitter_fire | Spitter preparation and shot |
| charger_windup, charger_rush | Charger preparation and rush |
| overmind_enter, overmind_windup | Boss arrival and attack preparation |
| overmind_slam, overmind_fan, overmind_summon | Boss attack transitions |
| overmind_death | Boss victory finish sequence |
| wave_start, wave_clear | Wave entry and ordinary-wave completion |
| mission_victory, mission_defeat | Mission outcome |
| quiz_key, quiz_backspace | Quiz/review keypad and keyboard editing |
| quiz_correct, quiz_incorrect | Accepted initial/review answer feedback |
| quiz_timer_zero | First expiration of the shared timer per quiz |
| corrections_complete | Successful final correction |
| reward_reveal_white, reward_reveal_green, reward_reveal_blue, reward_reveal_purple | First reward reveal at earned quality |
| reward_select | Reward choice or accepting revealed loot |
| salvage_pickup_01, ammo_pickup | Salvage increase or collected loot chest |
| cache_open | First display of a wave's revealed loot |
| shop_purchase, shop_sell | Successful purchase or sale |
| shop_refresh | Successful paid reroll |
| ammo_equip, ammo_unequip | Successful loadout toggle |
| ammo_merge | Successful merge, including drag merge |
| omni_forge | Successful legendary forge |
| ui_select | Generic navigation controls without dedicated action feedback |
| ui_open, ui_close | Forge dialog open / close and return from track selection |
| ui_unavailable | Invalid input or rejected equipment/shop action |
| ui_pause, ui_resume | Mission pause and resume |
| amb_mars_wind | Camp and battle ambience |
| amb_camp_machinery | Camp ambience |
| amb_portal_hum | Loop only while near the camp portal |

Reward quality reveals and normal/Omni shots represent different game states, not alternate takes of the same action.

## Duplicates and alternate takes

SHA-256 comparison found no byte-identical files across supplied source MP3s, WAV masters, and runtime MP3s. This does not establish perceptual uniqueness; source/master/runtime formats are production derivatives of the same sound.

| Family | Selected | Alternatives excluded from the build |
|---|---|---|
| Marine footsteps | marine_footstep_01 | _02, _03, _04 |
| Blaster fire | blaster_fire_01 | _02, _03 |
| Slime movement | slime_move_01 | _02, _03 |
| Slime hits | slime_hit_01 | _02, _03, _04 |
| Salvage pickups | salvage_pickup_01 | _02, _03 |

64 selected runtime assets: 3 music tracks, 3 ambience loops, and 58 effects/stings. The 12 alternate runtime files and their source/master versions are archived outside the repository; see `ASSET_CLEANUP.json`. The asset catalog excludes them, and preparation scripts no longer reference them. No supplied originals were deleted.

## Verification

- TypeScript check and production/offline-pack build passed.
- Regression tests cover camp loops, pause/resume, cancellation during loading, music continuation across waves, mission reset, boss restart, result cues, portal loop duplication, and consistent takes.
- Headless Chrome observed camp music and ambience buffer sources starting after interaction, with no page errors. All 64 selected runtime files returned HTTP 200 and decoded successfully; alternate take lookup was excluded.
- This is wiring and playback verification, not a subjective listening/mixing review or a physical-device audio test.
