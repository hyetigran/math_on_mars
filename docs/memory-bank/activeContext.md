# Active context

Updated September 13, 2026.

## Current work

The plans and WizardGenie prompt pack reflect the personal MVP and confirmed five-question, 30-second countdown with post-reward corrections. A runnable Phaser 4 browser project and ten-wave core slice now exist. The slice includes local profiles, grade-only mission setup, K–6 question generation, desktop/touch combat, reward deductions, mandatory corrections, choice caches, shop/loadout actions, ammo merging, and the Omni forge path. Combat now checkpoints its serializable simulation state every five seconds and on interruptions, restores enemies/projectiles/status-effect durations deterministically, clears held input on interruption, and offers an immediate mission retry after defeat. Browser-generated question speech was removed at the owner's request; reviewed installed narration remains future work. The 20-ticket breakdown remains proposed rather than published. The generated reference sheet remains a candidate awaiting owner approval.

## Next implementation work

1. Exercise the complete ten-wave flow in WizardGenie Play and on physical phones/tablets, then fix runtime/input issues found there.
2. Replace temporary browser speech synthesis with reviewed, installed K–1 narration assets.
3. Expand persistence from localStorage snapshots to the IndexedDB transaction contracts in [ARCHITECTURE.md](../ARCHITECTURE.md).
4. Continue enemy, content, economy, offline, and real-device verification in [GAME_PLAN.md](../GAME_PLAN.md).

Keep routine tuning adjustable and proceed with the personal MVP; formal educational review or learner evidence is not a prerequisite.

## Separate setup still pending

The engineering-skills setup selected GitHub Issues and default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. A configuration draft was shown, but the owner has not chosen whether to create `AGENTS.md` or `CLAUDE.md`. Neither instruction file nor `docs/agents/` configuration has been written. Memory-bank initialization does not silently complete that separate setup or create remote labels.
