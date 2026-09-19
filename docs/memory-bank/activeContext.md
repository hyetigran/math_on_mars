# Active context

Updated September 18, 2026.

## Current work

The personal MVP is implemented on `main` and published to GitHub Pages. Cadets walk a v3 camp, enter the portal for a fresh K–5 mission, fight on the 4K fenced arena with animated enemies, then run Quiz → correction → reward → loot → shop. Game music and SFX are wired (no separate quiz/shop beds). Missions do not resume after camp exit or reload; profiles and practice history persist in IndexedDB.

Draft tickets 1–15 and 17–19 are merged and their GitHub issues are closed. **#5 Mars visual style** (draft PR #36, branch `ticket/16-mars-visual-style`) and **#23 Integrated personal MVP** stay owner-managed. Do not wait on those tickets to ship non-art work. Local uncommitted work includes additional arena fence masters and Sorceress enemy video/sprite sources.

## Next implementation work

1. Live-check the published HTTPS build: first install, offline reload, camp/battle audio unlock, landscape phones/tablets, and a full Short or Standard run.
2. Leave ticket 16 / PR #36 and ticket 20 / issue #23 with the owner (remaining art polish and “integrated MVP” publication extras).
3. Optional audio: quiz/shop music beds; spoken-help packs stay removed per CONTEXT.
4. V2 town builder is **not** started. Street-level behind-character camera is confirmed; lots vs free placement, homework import, and shared vs personal towns are still open. See [V2_TOWN_BUILDER_PLAN.md](../V2_TOWN_BUILDER_PLAN.md).

Keep routine tuning in `content/balance/`. Formal educational review is not a gate.

## Agent-skills setup

`AGENTS.md` and `docs/agents/` point at GitHub Issues. Labels exist. Use issue numbers (#4–#23), not the old draft ticket numbers.

## Working tree notes

On `main` tracking `origin/main`. Only `ticket/16-mars-visual-style` remains besides main. There is no `/tmp` ticket worktree. Do not commit the sibling-archive `assets/sorceress/` dumps or unreviewed fence experiments unless the owner asks.
