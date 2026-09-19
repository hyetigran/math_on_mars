# Deployment

The game is published from committed `main` to GitHub Pages at:

https://hyetigran.github.io/math_on_mars/

`.github/workflows/deploy-pages.yml` installs the locked dependencies with Node 22 and pnpm 12.4.1, checks formatting, runs tests, builds the game and offline manifest, and publishes only `dist/`. A failed check prevents deployment. Pushes to `main` deploy automatically; the workflow also supports manual runs from GitHub Actions.

Local uncommitted changes and temporary asset folders are not deployed. Vite uses relative asset URLs so the game and service worker work under the repository subdirectory. HTTPS is required for offline play. Keep `sw.js` and `offline-manifest.json` beside `index.html` when using another static host.

Open the game online for its first installation. Cadet profiles and practice history are stored in the current browser and origin, so localhost profiles do not automatically transfer to the published site.

To restore a previous release, revert the relevant commits on `main` and let the workflow publish the result.

GitHub reference: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
