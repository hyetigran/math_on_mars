# Connected town development

Requires Node 24 and existing installed dependencies. In two terminals run `pnpm dev:town-api` and `pnpm dev:connected`. Open `http://127.0.0.1:5185/connected-town.html`. Create a parent username/password, add a cadet, and open the saved House in the two-camera scene. A second browser session can sign in to the same parent and load the same cadet town. Child email accounts are not used.

The API stores its database in ignored `.town-data/development.sqlite`. Restarting it preserves accounts and towns. Override `TOWN_DATABASE` for an isolated database; the API port defaults to 5186, with `TOWN_ORIGIN` defaulting to `http://127.0.0.1:5185`. If changing ports/origin, update the frontend proxy consistently. Do not commit database files or test credentials. This is a loopback development setup, not a public deployment.

Run `pnpm test:town-api` for API ownership/session checks, `pnpm build:connected` for the isolated browser build, and the existing regression suite for the battle game. Tests must use a temporary or in-memory database. Production account recovery and legacy-profile migration are outside this slice.

A server snapshot supplies the connected House’s level, occupancy and capacity. Local upgrade previews are disabled in connected mode; the static prototype remains available separately. Loading/connection errors do not invent local town state or write to existing battle profiles. Construction and production follow in later tickets.

## Device handoff

Each open tab has its own management identity. Select **Manage here / take over** to acquire the town's sole management lease. The server increments a durable generation on each takeover; every town mutation must match both the active tab/session and generation. Old tabs can read but their changes are rejected immediately by the service. Opening a town alone never takes management away from another device.

The town motto is a harmless persistent preference for exercising the command path. Command receipts and state changes commit together, so retrying after a lost response returns the same result without applying the command twice. Receipts survive service restarts. A stale takeover retry cannot reacquire a lease after another device takes over. Offline controls disable changes and reconnect refreshes the authoritative lease and state before enabling them. Battle play is unchanged.

## First construction loop

The connected town migrates its starter snapshot to version 2 on load: two adults, 80 blocks, 20 parts, 60 credits, 24 food, 10 capacity per utility and two construction slots. Three authored ordinary plots are available around the starter House. Build a Greenhouse for 20 blocks and 5 parts over ten server seconds. Overview and walking views show its frame during construction and completed model afterward. Browser time never advances construction.

Cancellation discloses its material refund and loss of progress before the action; it frees the plot and slot. Completed Greenhouses expose their information panel; farming controls are the next slice. Command receipts and lease checks cover construction/cancellation, and authoritative reads reconcile completion exactly once. Existing connected saves receive the starter economy without replacing their cadet or preference.
