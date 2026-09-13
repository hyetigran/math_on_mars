# System patterns

Status: proposed architecture; no runtime implementation exists yet. Consult [ARCHITECTURE.md](../ARCHITECTURE.md) before changing these contracts.

- One responsive static browser application: Phaser combat rendering and semantic HTML math/menu controls.
- RunSession coordinates authoritative commands and phase transitions. Views send commands and render state.
- Plain, serializable game rules are separate from rendering, browser APIs, persistence, and narration.
- Combat, progression, practice, rewards, history, catalog, and persistence have explicit responsibilities.
- Local profile transactions preserve initial answers, rewards, correction state, and inventory consistently. Stable action IDs prevent duplicate settlement.
- Save/resume restores the same timer, question instances, original answers, correction queue, offers, RNG, and combat state. Paused time does not advance play.
- The correction phase follows reward selection and blocks caches/shop/next wave until complete. Empty correction queues continue directly.
- Keep content, asset, and rule versions pinned for resumable runs. Installed static assets and authored questions avoid runtime generation dependencies.
- Touch and keyboard invoke the same commands. Mobile layouts preserve game rules and keep controls readable.

Future tests should cover timer boundaries, timeout continuation, first-pass/correction separation, duplicate commands, interrupted saves, ammo merging/forge, and complete browser flows. Historical design calculations are not current runtime tests.
