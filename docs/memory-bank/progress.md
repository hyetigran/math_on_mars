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
