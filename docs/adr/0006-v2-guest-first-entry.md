# Guest-first play with optional parent access

Status: accepted and implemented for #65, September 30, 2026.

The root route is a landing page. Play opens the town at `/play` without requiring a parent account. `/play/battle` opens the existing battle experience; `/parents` contains the protected parent dashboard. Parent sign-in is a shared dialog reached from the landing navigation or base menu and retains the current route and town.

This supersedes the mandatory parent entry implied by ADR-0004. Parent ownership remains the boundary for linked towns and protected practice settings. A new guest town has an independent owner and a long-lived opaque HttpOnly cookie, distinct from the parent session. Server timers, command receipts and the single management device rule apply equally to guests. A guest can select a name and K–5 practice grade; it cannot change parent settings or list parent cadets. Missing or revoked guest access never grants access by knowing a town ID.

Signing in does not implicitly claim a guest town. An explicit action in the parent dashboard links the whole town as a new cadet, retaining its ID, resources, jobs and receipts. The move, durable retry receipt and revocation of guest sessions commit in one database transaction. Existing parent cadets are preserved. Account switching therefore cannot silently move a town between parents.

Guest access lasts one year unless linked, and depends on retaining this browser's cookie. Clearing browser data loses anonymous access; linking enables recovery by signing in on another device. Linked parent sessions retain the current one-day duration. The local Node/SQLite service and production limitations of ADR-0005 still apply. This is not a new production identity provider or a migration of local battle profiles.

Both Vite builds include concrete HTML entry points for landing, play, parents and battle, so direct links can be served by static hosts supporting directory index pages. `/api` still requires the town service; static hosting alone provides the landing and existing battle game. Service workers bypass the API and preserve the separate battle HTML for offline launches. The old connected-town diagnostic UI is available only with `?legacy=1`.
