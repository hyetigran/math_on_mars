# Connected town development

Requires Node 24 and existing installed dependencies. In two terminals run `pnpm dev:town-api` and `pnpm dev:connected`. Open `http://127.0.0.1:5185/connected-town.html`. Create a parent username/password, add a cadet, and open the saved House in the two-camera scene. A second browser session can sign in to the same parent and load the same cadet town. Child email accounts are not used.

The API stores its database in ignored `.town-data/development.sqlite`. Restarting it preserves accounts and towns. Override `TOWN_DATABASE` for an isolated database; the API port defaults to 5186, with `TOWN_ORIGIN` defaulting to `http://127.0.0.1:5185`. If changing ports/origin, update the frontend proxy consistently. Do not commit database files or test credentials. This is a loopback development setup, not a public deployment.

Run `pnpm test:town-api` for API ownership/session checks, `pnpm build:connected` for the isolated browser build, and the existing regression suite for the battle game. Tests must use a temporary or in-memory database. Production account recovery and legacy-profile migration are outside this slice.

A server snapshot supplies the connected House’s level, occupancy and capacity. Local upgrade previews are disabled in connected mode; the static prototype remains available separately. Loading/connection errors do not invent local town state or write to existing battle profiles. Device handoff and town mutations follow in later tickets.
