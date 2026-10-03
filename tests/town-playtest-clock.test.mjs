import test from "node:test";
import assert from "node:assert/strict";
import { createPlaytestClock } from "../server/town-playtest-clock.mjs";
import {
  initializeTown,
  applyTownCommand,
  reconcileTown,
} from "../server/town-model.mjs";

test("a paused playtest clock advances real construction and crop rules", () => {
  const clock = createPlaytestClock(1000);
  const town = initializeTown(
    { version: 1, houseLevel: 1, adults: 2, houseCapacity: 2 },
    clock.now(),
  );
  applyTownCommand(town, { action: "build", plotId: "garden" }, clock.now());
  reconcileTown(town, clock.now());
  assert.equal(town.plots.garden.building, null);
  clock.advance({ seconds: 10, requestId: "complete-build" });
  reconcileTown(town, clock.now());
  assert.equal(town.plots.garden.building, "greenhouse");
  for (const command of [
    { action: "unlock-seed", crop: "lettuce" },
    { action: "assign-worker", plotId: "garden", workerId: "adult-1" },
    { action: "select-crop", plotId: "garden", crop: "lettuce" },
    { action: "upgrade-house" },
  ])
    applyTownCommand(town, command, clock.now());
  clock.advance({ seconds: 3600, requestId: "one-growing-hour" });
  reconcileTown(town, clock.now());
  assert.deepEqual(town.resources, {
    blocks: 20,
    parts: 5,
    credits: 50,
    food: 30,
  });
  assert.equal(town.foodTotals.harvested, 8);
  assert.equal(town.foodTotals.meals, 2);
  assert.equal(town.houseLevel, 2);
  assert.equal(town.houseCapacity, 4);
  const before = structuredClone(town);
  clock.advance({ seconds: 3600, requestId: "one-growing-hour" });
  reconcileTown(town, clock.now());
  assert.deepEqual(town, before);
});

test("invalid or conflicting time steps cannot move the clock", () => {
  const clock = createPlaytestClock(0);
  for (const seconds of [-1, 0, 0.5, NaN, Infinity, 172801])
    assert.throws(() => clock.advance({ seconds, requestId: "invalid" }));
  assert.throws(() => clock.advance({ seconds: 10 }));
  assert.equal(clock.now(), 0);
  clock.advance({ seconds: 10, requestId: "first" });
  assert.throws(() => clock.advance({ seconds: 20, requestId: "first" }));
  assert.equal(clock.now(), 10000);
  const other = createPlaytestClock(0);
  assert.equal(other.now(), 0);
});
