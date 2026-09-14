# Progress

Snapshot: September 13, 2026, after fixes for the eight code-review findings.

## Complete

- Git repository and GitHub remote established.
- Game plan and architecture reconciled with the owner's countdown, rarity, correction, ammo, and personal-MVP decisions.
- Root domain glossary created.
- WizardGenie prompts updated to current gameplay and all 20 draft tickets, including corrections, content, enemy assets, audio, and offline delivery.
- Remaining conflicting historical validation/screenshot guidance marked as superseded.
- Memory bank initialized from current documents and conversation decisions.
- Runnable Vite/TypeScript project using Phaser 4.2.1.
- Ten-wave combat run with automatic fire, desktop/touch movement, med-gel, pause, and a final Overmind wave.
- Serializable combat checkpoints and deterministic resume for the marine, scheduled spawns, enemies, projectiles, effect durations, cooldowns, and random state.
- Interruption handling that clears held keyboard/touch input, plus direct retry after defeat.
- Local profile/setup flow and all seven K–6 practice-track generators.
- Five-question shared countdown, time tier, wrong-answer drops, reward choice, corrections, cache, shop, loadout, merge, and forge interfaces.

## Not implemented

Authored/installed K–1 narration, production art/animation, the full enemy roster, complete versioned content packs, service-worker delivery, and deployment.

## Verification status

The review fixes pass 21 regression tests (`pnpm test`), the production build, and whitespace checks. Chrome interaction checks cover paused quiz input/time, fraction entry and draft resume at a phone-sized viewport, and failed-save retries without duplicate answers. See [review fixes](../REVIEW_FIXES.md). Complete ten-wave play, physical-device, performance, and offline verification remain pending.

Earlier scaffold verification: a server-free Chrome smoke check boots the production bundle, writes a five-second combat checkpoint, and restores it in a second browser session. Headless screenshots at 390×844 portrait and 844×390 landscape confirmed canvas centering and reachable touch controls. Historical Python calculations do not verify the current rules.

## Open implementation details

- Runtime/package versions and actual development commands.
- Generated asset/reference-sheet workflow and installed narration.
- White reward magnitude and other explicitly provisional balance values.
- Device coverage and behavior verified once a runnable build exists.

The pending agent-instruction filename choice belongs to the separate engineering-skills setup, not to game readiness.

## Sequential implementation update

Tickets 1 and 2 merged through PRs #1 and #2. Ticket 3 now implements IndexedDB transactions, legacy migration, command receipts, private publication, and backup recovery. All 39 automated tests, build and formatting checks pass. Live browser save-delay/rotation and physical-device verification remain outstanding.

Ticket 4: background/coalesced combat checkpoints and critical-save ordering implemented; 43 tests pass, including durable combat replay and delayed checkpoint terminal/profile isolation. Build and formatting pass. Live browser/device verification remains outstanding. Work uses an isolated worktree to preserve unrelated local edits.

Ticket 5: saved shop offers, passive catalog purchases, empty slots/free refill, paid rerolls and capped-offer replacement now implemented. All 50 tests pass, including nine-wave purchase routes, failed saves, stale purchase IDs and legacy-shop migration. Build/formatting pass; browser interactions remain unverified.

Ticket 6: fixed milestone choice bundles, accept/sell settlement, grouped reserves, selected batch merge previews, reusable combat drops, saved shuffle bag, wave-tier shop ammo and capacity cap checks implemented. All 59 automated tests pass, including all four Piercing/Multi Shot tiers, collector/noncollector cache routes, save failure/resume and stale commands. Build/Prettier pass. Ammo economy v1 is centralized in content/balance/ammo.ts. Browser/physical-device interaction and progression feel remain unverified; temporary pickup art is retained.

Ticket 7: Electric Chain tuning is centralized; temporary arcs use stable zigzags, glow and endpoint highlights. All 61 automated tests pass, including all four tier budgets with pre-impact save/resume, shared multi-pellet bounds, range exclusion and isolated boss behavior. Standards and Spec reviews report no blockers. Build/formatting pass; rendered/device readability remains unverified.

Ticket 8: Frost/Fiery balance values are centralized, and enemies show simultaneous snowflake/flame indicators with remaining-duration bars derived from saved status fields. All 62 tests pass, including every status tier against normal enemies and bosses, partial-tick resume, expiration and funded damage. Standards and Spec reviews pass. Build/Prettier pass; rendered/device feedback readability remains unverified.

Ticket 9: exact selected ingredient preview and resulting loadout order, pending forge save/resume, once-per-run flag, and displayed Omni capacity stabilizer implemented. Sixty-four tests pass, including invalid ingredients, failed save, pending/post-forge resume, overflow/duplicate preservation and nonstacking effects with capacities 1–4. Both review axes pass after fixes. Build/Prettier pass. Temporary visuals and browser/device interaction remain unverified. The stabilizer changes shot rate only: the existing 4.8D per-volley lifetime crowd bound stays unchanged; capacity four raises rate by 12% after ordinary modifiers.

Ticket 10: K counts 0–10, compares quantities, and composes/decomposes pictured quantities within five; grade 1 includes addition/subtraction/missing addends within 20. Thirty-nine authored, locally generated MP3 clips supply installed task/hint speech. Replay consumes shared quiz time, audio loading/enablement conceals tasks and suspends timing, and pause cancels queued speech. Resume rechecks playable readiness. Sixty-six tests pass, including K–1 exact content/history and deferred audio enable/cancellation; all 39 MP3s decode. Both review axes pass after readiness/recovery/content fixes. Build/formatting pass. No browser is connected, so audible playback and browser/device interaction remain unverified; offline app installation is still a later ticket.

Ticket 11: Grade 2 now includes bounded addition/subtraction and digit-value/tens-and-ones tasks; grade 3 includes multiplication and exact division within 100, including zero results with positive divisors. Sixty-seven tests pass, with 80 seeded grade 2–3 runs checking exact answers, ranges and saved correction history. Both code reviews pass; build/Prettier pass. Combat and timer rules are unchanged.

Ticket 12: grade 4 equivalent-fraction missing-numerator practice added alongside multiplication and like-denominator sums. Fraction answers now use labelled numerator/denominator fields in quizzes and corrections; templates save explicit input kinds with legacy fallback. Sixty-nine tests pass, including malformed-input neutrality, equivalent rational answers, partial drafts, field selection and corrected history across reload. Both review axes pass after UI fixes; build/Prettier pass. Browser keyboard/focus interaction remains unverified.

Ticket 13: grade 5 includes decimal addition/subtraction and guaranteed unlike-denominator fraction addition/subtraction; grade 6 includes ratio scaling, unit rates, positive-fraction division and addition/multiplication equations. Seventy tests pass, including 60 seeded upper-grade runs checking exact rational answers, equivalent forms, zero-denominator rejection and saved correction history. Both review axes pass; build/Prettier pass.

### Ticket 14 — Spitter and Charger

- Added Spitters on standard wave 3 / short wave 2 and Chargers on standard wave 5 / short wave 3, with schedules and attack tuning in `content/balance/enemies.ts`.
- Spitters fire visible, finite-lived shots after a telegraph. Chargers lock a direction, warn for 1.2 seconds, then dash with one direct attack hit. Temporary silhouettes, directional arrows, and warning countdowns distinguish both enemies.
- Saves retain warning/active/cooldown state, locked direction, hit ledger, and flying enemy projectiles. Profile validation rejects malformed attacks; projectiles clear on victory and defeat.
- Fixed ammo shuffle RNG returning integer endpoints, which could produce an undefined ammo type; regression covers complete five-type bags across multiple seeds.
- Validation: 76 tests, production build, and Prettier check pass. Separate spec and standards reviews completed; balance-location and duplicated-validation-limit findings fixed. Phone portrait/landscape visual readability remains unverified because no connected browser/device is available. Existing Phaser bundle-size warning remains.

### Ticket 15 — Splitter, Overmind, mission presets

- Splitters enter standard wave 6 / short wave 4 and split once into two weaker mini-slimes; surviving children prevent wave completion.
- Final-wave Overmind alternates warned expanding slam rings, projectile fans, and limited summons. Boss attack phases, locked aim, hit ledger, and summon count survive save/resume; boss defeat removes remaining minions and shots. Frost slows cooldown pursuit while committed warnings remain stationary.
- Setup independently selects Easy/Standard combat and six-wave Short/ten-wave Standard missions. Short uses a smaller wave budget; all grades/presets retain five required questions and one 30-second countdown. Retry retains mission settings. Summaries report this mission's answer accuracy; final victory/defeat ends directly without a quiz.
- Validation: 83 tests, production build, and Prettier check pass. Spec and standards reviews completed; Frost control, shared fan geometry, and preset-lookup findings fixed. Browser/device readability and practical combat balance remain unverified. Existing bundle-size warning persists.

### Owner scope update — art tickets handled manually

The owner instructed: “skip any ticket that references game art, I will manually handle those tickets.” Ticket 16 / issue #5 and its draft PR #36 remain owner-managed and unmerged. Ticket 20 / issue #23 explicitly depends on Mars visual style and is also left to the owner. Continue non-art tickets 17 (spoken equipment guidance), 18 (profile recovery), and 19 (offline infrastructure). Do not wait for reference-sheet approval or produce/integrate game art in this workflow.

### Ticket 17 — spoken equipment guidance

- Added 27 fixed installed MP3 clips for four power levels, cache choices, ammo descriptions, buying, equipping, merging, forging, selling, rerolling, Next wave and Save & Exit. Dynamic quantities remain text.
- Reward/cache/shop/forge screens load and enable required speech before exposing actions. Missing audio permits retry or Save & Exit; screen transitions, pause, rotation and app-switch cancellation share the existing lifecycle.
- Generalized installed narration to separate clip packs; authored equipment audio is generated at build-authoring time with the existing local voice toolchain, never runtime synthesis.
- Validation: 84 tests, production build and Prettier pass; ffprobe validates all 27 clips. Audible playback and device interaction have not been verified in a connected browser/device.

- Spec and standards reviews completed; added per-card spoken module effects and replaced text-rewriting callbacks with typed playback status.

### Ticket 18 — profile recovery and transfer

- Added selected-profile JSON export and validated import previews. Identity collisions require an explicit Replace or Keep decision, with export of the existing profile available before replacement. Invalid mission state can be omitted only through the explicitly described history-only import path; malformed history is rejected.
- Backup/raw export remain available when startup cannot decode an envelope. Explicit history recovery retains validated history if neither primary nor backup mission can resume. Failed writes now expose Reload saved profiles alongside retry/export for conflict recovery.
- Added exclusive browser profile leases for opening/resuming and importing. An occupied profile shows an in-use message; leaving it releases the lease. Revision checks remain the fallback and secondary guard. Late acquisitions and repeated UI actions cannot retain abandoned leases.
- Escaped imported profile/equipment IDs in HTML attributes. Shared history-recovery validation across import and IndexedDB.
- Validation: 89 tests, production build, and Prettier pass. Separate spec/standards reviews completed; browser-lock and duplication findings resolved. Actual browser file dialogs, downloads and multi-tab lock interaction remain unverified without a connected browser.
