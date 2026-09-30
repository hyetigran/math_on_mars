# Connected town development

Requires Node 24 and existing installed dependencies. In two terminals run `pnpm dev:town-api` and `pnpm dev:connected`. Open `http://127.0.0.1:5185/`. **Play** creates or resumes a guest town at `/play`; parent sign-in is optional in the top-right landing navigation and base Menu. `/parents` hosts parent sign-in, cadet selection/creation and explicit guest-town linking. `/play/battle` opens the existing local battle game with a return-to-town link. Battle profiles remain separate from town cadets.

A guest can save an explorer name and practice grade inside the base. Progress is stored on the server; this browser's HttpOnly guest cookie remembers access for one year. Clearing the cookie loses anonymous access. A parent can sign in and explicitly **Save this town to my account** to add it as a new cadet, keeping all existing cadets. Sign-in alone never moves or replaces guest progress. Linking revokes anonymous access and persists a retry receipt. A second browser can then sign in to the parent account to continue the same town.

Both the default and connected builds include the root, `/play/`, `/parents/` and `/play/battle/` HTML entry points. Serve directory index pages for direct links and forward `/api` to the service with the matching `TOWN_ORIGIN`. Static hosting alone cannot run connected towns. `connected-town.html` redirects to the landing page; `connected-town.html?legacy=1` retains the older diagnostic UI for regression testing. See ADR-0006 for the updated entry and ownership boundary.

The API stores its database in ignored `.town-data/development.sqlite`. Restarting it preserves accounts and towns. Override `TOWN_DATABASE` for an isolated database; the API port defaults to 5186, with `TOWN_ORIGIN` defaulting to `http://127.0.0.1:5185`. If changing ports/origin, update the frontend proxy consistently. Do not commit database files or test credentials. This is a loopback development setup, not a public deployment.

Run `pnpm test:town-api` for API ownership/session checks, `pnpm build:connected` for the isolated browser build, and the existing regression suite for the battle game. Tests must use a temporary or in-memory database. Production account recovery and legacy-profile migration are outside this slice.

A server snapshot supplies the connected House’s level, occupancy and capacity. Local upgrade previews are disabled in connected mode; the static prototype remains available separately. Loading/connection errors do not invent local town state or write to existing battle profiles. Construction and production are available through the management controls below.

## Device handoff

Each open tab has its own management identity. A new town or a lease whose session has expired/revoked is acquired automatically in Play. Otherwise select **Manage here / take over** to acquire the town's sole management lease. The server increments a durable generation on each takeover; every town mutation must match both the active tab/session and generation. Old tabs can read but their changes are rejected immediately by the service. Opening a town never takes management away from another device with a live session. Reloading into a new tab identity may require an explicit takeover.

The town motto is a harmless persistent preference for exercising the command path. Command receipts and state changes commit together, so retrying after a lost response returns the same result without applying the command twice. Receipts survive service restarts. A stale takeover retry cannot reacquire a lease after another device takes over. Offline controls disable changes and reconnect refreshes the authoritative lease and state before enabling them. Battle play is unchanged.

## First construction loop

The connected town migrates its starter snapshot to version 2 on load: two adults, 80 blocks, 20 parts, 60 credits, 24 food, 10 capacity per utility and two construction slots. Three authored ordinary plots are available around the starter House. Build a Greenhouse for 20 blocks and 5 parts over ten server seconds. Overview and walking views show its frame during construction and completed model afterward. Browser time never advances construction.

Cancellation discloses its material refund and loss of progress before the action; it frees the plot and slot. Completed Greenhouses expose worker and crop controls. Command receipts and lease checks cover construction/cancellation, and authoritative reads reconcile completion exactly once. Existing connected saves receive the starter economy without replacing their cadet or preference.


## Farming and household meals

Version 3 adds individually assigned adult workers and farming state. Unlock lettuce once for 10 credits, assign an available adult to a completed Greenhouse, then select lettuce. Its recipe produces four edible portions every 30 growing minutes and replants without another seed payment. Workers cannot occupy multiple Greenhouses. Removing a worker or losing utility capacity pauses growth without discarding progress; starter utility restoration is available during shortages.

Meals consume one portion per adult each hour, with residents' water and oxygen needs reserved before crop production. The view separates housing occupancy from available/assigned adults and displays the one-day food reserve. A full store holds the complete harvest outside spendable inventory until the whole batch fits. Emergency habitat meals cover unmet consumption directly and never enter storage; residents do not die or leave. Server event reconciliation preserves meal/crop progress across reloads. The return policy below caps absent simulation and summarizes its results.


## Occupied House upgrade

Version 4 supports a level-2 House upgrade: 40 blocks, 10 parts and 60 minutes, using one of the same two construction slots. Level, appearance and capacity remain unchanged until server completion; then capacity becomes four with the same two residents and one additional unit of House power demand. The provisional utility increment is explicit in the server recipe. Cancellation returns materials and leaves the original occupied House intact. The existing second-level model appears in both views only on completion.

## Untimed town practice

Version 5 adds parent-selected eligible grade/topics from the existing attributed IM Kindergarten–Grade 5 bank. Changing eligibility requires the parent password again; passwords are excluded from durable command receipts and browser retry storage. Eligibility gates new sets; an already-started set retains its questions and reward if settings later change.

The cadet sees the reward before starting, answers without a timer, and corrects every mistake. First-attempt accuracy is retained, but corrections never reduce credit. Each set uses up to five distinct questions and earns four minutes per question; topic cursors exhaust the bank before cycling, and repeat sets are labelled. The bank is finite and is not a mastery assessment. Attempts, corrections and completion receipts persist; time credit can accumulate before construction and has no expiry, storage limit or daily cap. Battle quizzes are separate. Parent-assigned homework remains a later slice.

## Spend construction credit

Each running build or upgrade previews the available bank, applicable seconds, remaining duration and resulting completion time. Applying credit spends at most the authoritative remaining duration and keeps the surplus. The command validates the management lease and preview revision, commits the bank deduction and timer change together, and reconciles immediate completion once. Replayed receipts cannot charge again, including after handoff. Cancellation refunds materials only; applied credit stays spent.

## Returning after absence

Version 6 reconciles food and construction events chronologically. Production and consumption share a 48-hour allowance, then both freeze; running construction still finishes over the full elapsed absence. Held harvests, meal timing, worker assignments and utility limits survive the cutoff. Opening the connected town reconciles first and shows finished projects, harvests, stored-food meals, emergency meals and production pauses. It then renews the allowance. **Back to cadets**, hiding the tab and leaving the page end that visit; battle-only or cadet-list reads do not renew it.

Visible connected visits heartbeat every 15 seconds. A normal departure sends a keepalive leave request; if a tab crashes or loses connectivity, the last successful town contact anchors its allowance. Visit identities are session-bound, repeated opens return the original summary, and stale leave messages cannot renew an old allowance. The window is town-wide across browsers. Expired parent sessions require sign-in again on return.

Validation uses injected authoritative clocks, including zero, short and greater-than-48-hour absences, construction crossing the cutoff, utility changes at completion, and repeated/two-device reads. `node tests/town-loop.browser.mjs` starts an isolated local Vite/API fixture and runs the construct → staff → harvest → upgrade → practice/correct → accelerate → leave/return sequence in two headless Chrome browser contexts, including a 390px viewport. This is browser-session coverage on one computer; physical mobile-device testing and public deployment are not claimed. The development API remains loopback-only.


`node tests/guest-routing.browser.mjs` verifies landing, optional modal sign-in, guest persistence, explicit linking without replacing another cadet, battle navigation, browser history, deep links and narrow layouts. `node --test tests/guest-town.test.mjs` covers guest isolation, cookie role separation, pre-guest database migration, durable links and restart/retry behavior.
