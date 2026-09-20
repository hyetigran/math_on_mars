# Deployment

The game is published from committed `main` to GitHub Pages at:

https://hyetigran.github.io/math_on_mars/

`.github/workflows/deploy-pages.yml` installs the locked dependencies with Node 22 and pnpm 12.4.1, checks formatting, runs tests, builds the game and offline manifest, and publishes only `dist/`. A failed check prevents deployment. Pushes to `main` deploy automatically; the workflow also supports manual runs from GitHub Actions.

Local uncommitted changes and temporary asset folders are not deployed. Vite uses relative asset URLs so the game and service worker work under the repository subdirectory. HTTPS is required for offline play. Keep `sw.js` and `offline-manifest.json` beside `index.html` when using another static host.

Offline installation runs in the background and never blocks arena entry. Open the game online for its first installation. Cadet profiles and practice history are stored in the current browser and origin, so localhost profiles do not automatically transfer to the published site.

To restore a previous release, revert the relevant commits on `main` and let the workflow publish the result.

GitHub reference: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

Boundary-editing controls are available only in development builds. Production entry regression: serve a production build with Vite preview, then run `GAME_URL=http://localhost:4173/?verifyOffline=1 node tests/arena-entry.browser.mjs` (set `CHROME_PATH` if Chrome is elsewhere). The check simulates stalled and failed offline installation and verifies arena entry, pause/resume, and absence of production editing controls.

Production hides all QA shortcuts, including quiz skipping. Phones and tablets require landscape orientation; portrait opens a blocking rotate prompt and pauses active missions. Rotate back and resume to continue. Touch controls appear on mobile devices or viewports up to 900 px wide, including after resizing. Wide desktop screens use keyboard controls.

Run `GAME_URL=http://localhost:4173/ node tests/production-ui.browser.mjs` against a production preview to verify desktop and mobile controls, portrait blocking and pausing, and the absence of QA controls on quiz, correction and pause screens.

The splash preloads and decodes camp and battle artwork, selected audio, and fonts before opening camp. Arena scenes reuse the decoded images. To check failed-download retry and repeated arena entry without networking, run `GAME_URL=http://localhost:4173/ node tests/splash-loading.browser.mjs` against a production preview.

Online reloads request fresh HTML instead of the offline shell. Verified worker updates activate without reloading an open mission; retained content-hashed assets keep existing pages working. Offline launches fall back to the installed pack, and explicit archived-build requests remain pinned. Run `node tests/offline-update.browser.mjs` to verify an upgrade with an open tab.

Combat rendering benchmark: `GAME_URL=http://localhost:4173/ node tests/combat-performance.browser.mjs`. This opt-in Chrome check uses a fresh profile at 1366×768, 2× display density and 4× CPU throttling, with background offline installation disabled to isolate drawing. It measures six seconds of wave-one frame timing; defaults require at least 55 FPS and p95 below 25 ms. Set `MIN_FPS` and `MAX_P95_MS` for the benchmark machine. It does not emulate a physical phone GPU or measure late-wave load.

September 19 rendering investigation: the published game's forced high-quality Canvas scaling yielded 51.7 FPS / 33.3 ms p95 in that check. Returning to normal browser smoothing yielded 59.5 FPS / 16.8 ms p95 in the local production build. A separate live-site comparison also reached roughly 60 FPS when changing only the smoothing filter. The original 4K arena asset and canvas pixel budget remain unchanged.
