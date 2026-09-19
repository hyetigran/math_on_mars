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
