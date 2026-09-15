# Active context

Updated September 13, 2026.

## Current work

The plans and WizardGenie prompt pack reflect the personal MVP and confirmed five-question, 30-second countdown with post-reward corrections. A runnable Phaser 4 browser project and ten-wave core slice now exist. The slice includes local profiles, grade-only mission setup, K–6 question generation, desktop/touch combat, reward deductions, mandatory corrections, choice caches, shop/loadout actions, ammo merging, and the Omni forge path. Combat now checkpoints its serializable simulation state every five seconds and on interruptions, restores enemies/projectiles/status-effect durations deterministically, clears held input on interruption, and offers an immediate mission retry after defeat. Browser-generated question speech was removed at the owner's request; reviewed installed narration remains future work. The owner authorized sequential implementation of all 20 numbered tickets, each on a separate branch followed by code review, fixes, a PR and merge. The 20 tickets are published as GitHub issues #4–#23 (`ready-for-agent`). Draft ticket 1 is #4 (closed, PR #1); draft ticket 2 is #6 (closed, PR #2). Use the issue, not the draft number. The generated reference sheet remains a candidate awaiting owner approval.

## Sequential ticket work

Ticket 1 merged as PR #1 (83e1931). It adds saved collectible salvage, wave-clear sweep, floating touch movement/cancellation, mobile instructions, and pause-menu handedness controls. Preserve the grade-only ten-wave mission.

Ticket 2 merged as PR #2 (3d8193d), completing multi-stat rewards, capped gains, correction attempt history and worked explanations.

Ticket 3 merged as PR #3 (635bcb1), adding IndexedDB transactions, private publication, receipts and backup recovery.

Ticket 4 merged as PR #24 (72c8af5), closing published issue #12. Published issue #11 was reconciled with merged PR #3 and closed.

Ticket 5 (`ticket/05-salvage-shop`, issue #13) adds saved four-slot offers, full passive catalog/rarities, empty purchased slots, a free refill after four buys, paid rerolls that preserve purchased slots and the first guaranteed Expander, and capped-offer replacement. Shared module installation preserves missing HP. Shop labels show rarity, ownership status and exact gains. Saved payload validation and escaping protect rendered shop data; legacy shops preserve prior purchased slots. Prototype prices are 6/9/14/20 salvage for white/green/blue/purple modules, 5 for med-gel, and 2 plus prior paid rerolls for rerolls. All 50 tests, build, formatting and diff checks pass; both review axes report no blockers. Nine nine-wave spending routes retain useful math choices. Browser touch/keyboard checks remain outstanding. PR/merge follows, then draft ticket 6 / issue #15 ammo progression.

Continue using the isolated `/tmp/mathonmars-ticket4` worktree while the original checkout has unrelated user edits. User approval to merge reviewed ticket PRs remains in force.

## Next implementation work

The eight code-review findings are now addressed: committed RunSession commands, validated saves with backup/retry recovery, occurrence-based answer history, paused-input guards, a fraction correction keypad, muzzle-origin aiming, shared volley chain limits, and funded burn reservoirs. See [review fixes](../REVIEW_FIXES.md) for verification and migration limits.

1. Exercise the complete ten-wave flow in WizardGenie Play and on physical phones/tablets, then fix runtime/input issues found there.
2. Add reviewed, installed K–1 narration assets; browser speech synthesis is already removed.
3. Extend IndexedDB persistence with ticket 18’s full profile transfer and conflicting-tab recovery UI.
4. Continue enemy, content, economy, offline, and real-device verification in [GAME_PLAN.md](../GAME_PLAN.md).

Keep routine tuning adjustable and proceed with the personal MVP; formal educational review or learner evidence is not a prerequisite.

## Agent-skills setup

`/setup-matt-pocock-skills` is complete. Issues are GitHub Issues for `hyetigran/math_on_mars`. Pointers live in `AGENTS.md` and `docs/agents/`. Default triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Domain docs are single-context. Remote GitHub labels and the 20 draft tickets are not created by this setup — publish them with `/to-tickets`.
