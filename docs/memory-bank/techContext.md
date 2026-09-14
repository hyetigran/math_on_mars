# Technical context

Observed September 13, 2026.

- Git remote: `https://github.com/hyetigran/math_on_mars.git`.
- The repository contains a runnable Vite browser project, planning Markdown, reference images, and a historical Python calculation script.
- Current stack: strict TypeScript, Vite 7.3.6, Phaser 4.2.1, and semantic DOM/CSS screens. `pnpm` is the workspace package manager.
- Runtime profiles now use IndexedDB transactions, with one-time migration from legacy localStorage snapshots. Browser-generated question speech was removed at the owner's request; reviewed installed K–1 audio remains planned alongside a service worker.
- Deployment target and concrete supported device versions remain to be established.
- `pnpm test` runs 21 Node regression tests through `scripts/test.mjs`; `pnpm build` type-checks and builds the app. `tests/browser.html` provides isolated development fixtures for interactive pause, fraction, and save-failure checks.
- `src/session.ts` owns committed run commands; `src/combat-rules.ts` owns plain simulation state; `src/persistence.ts` validates localStorage snapshots and offers explicit backup recovery. Combat saves are version 2; see [migration limits](../REVIEW_FIXES.md).

## References

- [GAME_PLAN.md](../GAME_PLAN.md): authoritative product rules.
- [ARCHITECTURE.md](../ARCHITECTURE.md): proposed runtime, state, and persistence contracts.
- [CONTEXT.md](../../CONTEXT.md): project vocabulary.
- `references/backwoods/`: composition and combat readability.
- `references/quizcaster/`: math and upgrade screen layouts.
- Goblin Gutter: rendering and gameplay reference described in the plan.
- WizardGenie: intended development-time asset workflow. The project reference sheet is not yet created or approved.

[WIZARDGENIE_PROMPTS.md](../WIZARDGENIE_PROMPTS.md) now reflects the current plan and maps all 20 draft tickets to prompts. `QUIZCASTER_REFERENCES.md` and `DESIGN_VALIDATION.md` still carry supersession notices; their old quiz rules and formal review gates are historical. `docs/design_checks.py` still contains old formulas and must be revised before use as current validation.

Ticket 3 adds `src/indexeddb.ts`, private RunSession command preparation, durable receipts and post-command backups. `fake-indexeddb` is development-only; 39 tests cover transactions and existing rules. Browser fixtures now inject IndexedDB write failures.
