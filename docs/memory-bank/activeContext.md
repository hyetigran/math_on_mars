# Active context

Updated September 13, 2026.

## Current work

The plans and WizardGenie prompt pack reflect the personal MVP and confirmed five-question, 30-second countdown with post-reward corrections. A runnable Phaser 4 browser project and ten-wave core slice now exist. The slice includes local profiles, grade-only mission setup, K–6 question generation, desktop/touch combat, reward deductions, mandatory corrections, choice caches, shop/loadout actions, ammo merging, and the Omni forge path. Combat now checkpoints its serializable simulation state every five seconds and on interruptions, restores enemies/projectiles/status-effect durations deterministically, clears held input on interruption, and offers an immediate mission retry after defeat. Browser-generated question speech was removed at the owner's request; reviewed installed narration remains future work. The owner authorized sequential implementation of all 20 numbered tickets, each on a separate branch followed by code review, fixes, a PR and merge. GitHub has no published issues; use the numbered definitions in WIZARDGENIE_PROMPTS.md. The generated reference sheet remains a candidate awaiting owner approval.

## Sequential ticket work

Ticket 1 merged as PR #1 (83e1931). It adds saved collectible salvage, wave-clear sweep, floating touch movement/cancellation, mobile instructions, and pause-menu handedness controls. Preserve the grade-only ten-wave mission.

Ticket 2 merged as PR #2 (3d8193d), completing multi-stat rewards, capped gains, correction attempt history and worked explanations.

Ticket 3 merged as PR #3 (635bcb1), adding IndexedDB transactions, private publication, receipts and backup recovery.

Ticket 4 (`ticket/04-combat-resume`) was implemented in `/tmp/mathonmars-ticket4` to preserve unrelated uncommitted instruction/memory edits in the original checkout. Periodic checkpoints now run in the background every 300 active simulation ticks, coalesce waiting snapshots and retain failed jobs/receipt IDs. Critical actions freeze immediately, drain pending saves, then commit their current state. Snapshots reject stale run/wave identities. All 43 tests, build, Prettier and diff checks pass; both reviews found no remaining production blockers. Integration covers delayed saves before wave transitions/defeat, sibling isolation, terminal backup invalidation and deterministic resumed combat. Live browser/device checks remain outstanding. PR/merge follows, then ticket 5’s salvage shop. User approval to merge subsequent reviewed PRs remains in force.

## Next implementation work

The eight code-review findings are now addressed: committed RunSession commands, validated saves with backup/retry recovery, occurrence-based answer history, paused-input guards, a fraction correction keypad, muzzle-origin aiming, shared volley chain limits, and funded burn reservoirs. See [review fixes](../REVIEW_FIXES.md) for verification and migration limits.

1. Exercise the complete ten-wave flow in WizardGenie Play and on physical phones/tablets, then fix runtime/input issues found there.
2. Add reviewed, installed K–1 narration assets; browser speech synthesis is already removed.
3. Extend IndexedDB persistence with ticket 18’s full profile transfer and conflicting-tab recovery UI.
4. Continue enemy, content, economy, offline, and real-device verification in [GAME_PLAN.md](../GAME_PLAN.md).

Keep routine tuning adjustable and proceed with the personal MVP; formal educational review or learner evidence is not a prerequisite.

## Separate setup still pending

The engineering-skills setup selected GitHub Issues and default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. A configuration draft was shown, but the owner has not chosen whether to create `AGENTS.md` or `CLAUDE.md`. Neither instruction file nor `docs/agents/` configuration has been written. Memory-bank initialization does not silently complete that separate setup or create remote labels.
