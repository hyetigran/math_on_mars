# Town mechanics playtest

Issue #82. Run `pnpm dev:playtest` with Node 24, then open <http://127.0.0.1:5190/play/>. This uses the connected town, its actual server rules and existing placeholder models. It starts its own in-memory database and a paused authoritative clock. Restarting the runner discards the test towns; ordinary `.town-data` saves are never opened.

The base has one occupied starter House and three empty, outlined, selectable plots. The standalone `/town-prototype.html` remains an art/camera experiment with decorative prebuilt scenery; use `/play/` for this mechanics test.

The HUD follows the user's supplied city-builder references: House level/upgrade progress at top left, free adult workers and free construction slots at top center, resources stacked at top right, Settings and Build/Inventory at bottom right, and Attack at bottom left. The Buildings modal uses horizontal preview cards with plot locations, costs, build times and a resource footer. Selecting a building or empty plot opens a small nonmodal action tray. Inventory explicitly says that storage is not yet available.

The level badge represents the implemented House level. Town-wide XP, neighborhood milestones, building storage, additional housing construction, immigration, trade, research, crafting and the wider building catalog are not implemented by this change.

## First playthrough

1. Open Build / Inventory. Build a Greenhouse on Garden: blocks go from 80 to 60 and parts from 20 to 15; one of two construction slots is busy.
2. Close the modal and select +10s. The Greenhouse completes and frees its slot.
3. Open Build / Inventory. Assign worker, unlock lettuce once for 10 credits, and Plant lettuce. One adult remains free.
4. Start the House upgrade for 40 blocks and 10 parts. Its level/capacity remain 1/2 until completion.
5. Close the modal and select +1h. Two four-portion harvests and two household meals leave 30 food. The House becomes level 2, capacity 4; population remains two.
6. Open Practice, complete a fixed-bank set and correct mistakes. Credit stays banked until applied to a running project. Use a fresh test town or start another Greenhouse to test surplus credit.

Time buttons provide +10 seconds, +10 minutes, +30 minutes, +1 hour and +1 day. These change server time; opening the menu or waiting does not move it. Snapshots, management, construction, farming and practice use the same API as connected play. Clock steps have retry receipts and reject malformed, backward or greater-than-48-hour individual steps. Parent sessions still expire after one simulated day; guest towns are convenient for long time jumps.

Only the playtest Vite mode shows clock controls. Only this loopback runner exposes `/api/playtest/time`, with origin validation for time changes. The ordinary town service and production builds retain their normal clocks. Battle still uses its separate local profile; Attack tests navigation rather than a town/battle equipment link.

## Verification

- Unit/API regression coverage: construction and cancellation, occupied upgrades, credit spending, worker/utility pauses, held harvest, meals, practice corrections, 48-hour absence policy, guest isolation and persistent command receipts.
- New clock tests advance the real town model and verify exact construction, crop and household totals, unchanged state on replay, invalid-step rejection and isolated clocks.
- Browser playthrough: Build → advance → assign → unlock → plant → upgrade → advance; live HUD totals and completed appearance match the server. Inventory, Settings, camera controls and Escape checked manually.
- Layout checked at desktop, 320px/390px portrait and short landscape viewports; horizontal card scrolling stays within the modal. Physical-device, 200% browser zoom and RTL checks are not verified.
