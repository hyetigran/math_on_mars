# Offline builds

`pnpm build` produces a static `dist/` directory, including `sw.js` and `offline-manifest.json`. Serve the entire directory over HTTPS. No gameplay backend is required. Development and localhost previews deliberately bypass installation checks so ordinary local launches stay fast; append `?verifyOffline=1` to a localhost build only when exercising the service-worker installation path. A worker left by an older localhost build activates without precaching, removes its preview caches, and unregisters itself.

The build ID hashes runtime source, content, public assets, scripts, and build configuration. A single release therefore pins the content, balance, simulation/reward rules, shell, and asset manifest together. Each manifest lists every distributable runtime file and its SHA-256. The current pack contains the bundled K–6 generators and visual runtime assets, with no audio files; game art remains owner-managed.

Launch, retry and resume verify the required cache bytes. An incomplete download has no readiness marker; a missing/corrupt current file triggers a verified repair attempt. A missing old release cannot silently load new definitions. Existing pre-offline saves use the current supported decoder and receive a release pin without changing their recorded state.

A saved run retains its release ID. Resume opens that release's cached shell. The page URL carries the loaded build so ordinary assets use its pack. Workers install updates separately from activation and never call `skipWaiting`. Close all game tabs, then open the site's base URL to use the newest activated build. A URL with a build query intentionally selects that release.

Caches for previous releases are retained conservatively; no automatic cleanup can remove an active run's dependencies. Browser storage removal or eviction can still make a release unavailable. The UI preserves the profile and exposes export/recovery instead of silently changing the run. Profiles imported from another browser need their pinned pack present; otherwise the original browser remains the recovery/export source.

## Verification status

Automated tests execute the worker with Cache/Fetch boundary fixtures: complete installs, bad hashes, interrupted readiness, missing-file repair, offline shell/speech requests, and coexistence of different releases. Profile tests cover release-pin export and legacy pinning. The build verifies every remaining runtime file; audio is no longer packaged.

A connected browser was unavailable. Published HTTPS installation, actual browser activation/offline reload, storage eviction, and mobile service-worker behavior have not been verified. Publication and art integration remain with the owner under the instruction to skip game-art tickets, including the integrated-MVP ticket.
