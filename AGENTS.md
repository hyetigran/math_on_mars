## Agent skills

### Issue tracker

Issues live in GitHub Issues for `hyetigran/math_on_mars` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` plus `docs/adr/`. See `docs/agents/domain.md`.

## V2 branch workflow

V2 development lives on `v2`. For each new V2 ticket, create a fresh `codex/` branch from the latest `origin/v2`, review against `v2`, and open and merge its PR into `v2` before starting the next ticket. Do not target `main` for V2 work unless the user explicitly requests a release.

`main` was restored to pre-V2 commit `34e1b82` through PR #75. The V2 branch preserves the implementation through `5c88311` and records that rollback as an ancestry-only merge, so a future release can merge the complete V2 changes back into `main`.
