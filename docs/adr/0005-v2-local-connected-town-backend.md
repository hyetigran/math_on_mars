# Use a Node/SQLite service for the connected-town development slice

Status: implemented development architecture for #41, not a production hosting decision.

The existing game ships as a static application with local battle profiles. V2 town ownership and server timing need a service. The first runnable slice uses Node 24 with built-in SQLite, a versioned town document per cadet, and parent username/password sign-in. Cadets require neither emails nor separate credentials. Both browser sessions connect to the same authoritative database.

Passwords are salted and derived with asynchronous scrypt; opaque session tokens are hashed in storage, expire after a day, and are sent in HttpOnly SameSite=Strict cookies. Mutations require the configured browser origin. Sessions and cadet creation receipts persist in SQLite. Origin configuration is explicit; the development server binds loopback and is reached through the Vite API proxy. The service uses prepared queries and verifies parent ownership on town reads.

This intentionally avoids introducing a hosted provider, cloud account or production deployment as a prerequisite to demonstrating the first slice. Production hosting/TLS, account recovery, backups, abuse controls beyond the development rate limit, operational hardening and migration of local battle profiles remain separate decisions. Do not expose the development service publicly as a production account system. Existing battle persistence and static builds remain unchanged. Cross-device management leases are #42; this ticket adds no mutable town gameplay commands.

References: [Node SQLite](https://nodejs.org/api/sqlite.html), [Node crypto/scrypt](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback). Runtime APIs are exercised under the bundled Node 24 runtime.
