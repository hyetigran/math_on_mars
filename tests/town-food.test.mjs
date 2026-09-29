import test from "node:test";
import assert from "node:assert/strict";
import {
  initializeTown,
  reconcileTown,
  applyTownCommand,
} from "../server/town-model.mjs";
import { foodSummary } from "../server/town-food.mjs";
function farm() {
  const s = initializeTown(
    { version: 1, houseLevel: 1, adults: 2, houseCapacity: 2 },
    0,
  );
  applyTownCommand(s, { action: "build", plotId: "garden" }, 0);
  reconcileTown(s, 10000);
  applyTownCommand(s, { action: "unlock-seed", crop: "lettuce" }, 10000);
  applyTownCommand(
    s,
    { action: "assign-worker", plotId: "garden", workerId: "adult-1" },
    10000,
  );
  applyTownCommand(
    s,
    { action: "select-crop", plotId: "garden", crop: "lettuce" },
    10000,
  );
  return s;
}
test("one-time seed purchase, discrete harvests and once-only household meals", () => {
  const s = farm();
  assert.equal(s.resources.credits, 50);
  assert.throws(
    () =>
      applyTownCommand(s, { action: "unlock-seed", crop: "lettuce" }, 10000),
    /unlocked/,
  );
  reconcileTown(s, 3610000);
  assert.equal(s.resources.food, 30);
  assert.equal(s.foodTotals.harvested, 8);
  assert.equal(s.foodTotals.meals, 2);
  reconcileTown(s, 3610000);
  assert.equal(s.resources.food, 30);
  assert.equal(foodSummary(s).reserve, 30);
  assert.equal(foodSummary(s).reserveTarget, 48);
  assert.equal(s.resources.credits, 50);
});
test("full storage holds harvest outside inventory then resumes after meals free room", () => {
  const s = farm();
  s.resources.food = 72;
  reconcileTown(s, 1810000);
  assert.equal(s.resources.food, 72);
  assert.equal(s.farms.garden.held, 4);
  reconcileTown(s, 3600000);
  assert.equal(s.resources.food, 70);
  assert.equal(s.farms.garden.held, 4);
  reconcileTown(s, 7200000);
  assert.equal(s.resources.food, 72);
  assert.equal(s.farms.garden.held, 0);
});
test("worker and utility pauses preserve progress; emergency meals protect residents", () => {
  const s = farm();
  reconcileTown(s, 910000);
  applyTownCommand(
    s,
    { action: "assign-worker", plotId: "garden", workerId: null },
    910000,
  );
  reconcileTown(s, 1810000);
  assert.equal(s.farms.garden.remaining, 900000);
  applyTownCommand(
    s,
    { action: "assign-worker", plotId: "garden", workerId: "adult-1" },
    1810000,
  );
  s.utilities.power = 0;
  reconcileTown(s, 2710000);
  assert.equal(s.farms.garden.remaining, 900000);
  applyTownCommand(s, { action: "restore-utilities" }, 2710000);
  reconcileTown(s, 3610000);
  assert.equal(s.foodTotals.harvested, 4);
  s.resources.food = 0;
  applyTownCommand(
    s,
    { action: "assign-worker", plotId: "garden", workerId: null },
    3610000,
  );
  reconcileTown(s, 7200000);
  assert.equal(s.foodTotals.emergencyMeals, 2);
  assert.equal(s.adults, 2);
});
test("workers cannot occupy multiple jobs and malformed inputs cannot change farming state", () => {
  const s = farm();
  applyTownCommand(s, { action: "build", plotId: "market" }, 10000);
  reconcileTown(s, 20000);
  assert.throws(
    () =>
      applyTownCommand(
        s,
        { action: "assign-worker", plotId: "market", workerId: "adult-1" },
        20000,
      ),
    /assigned/,
  );
  assert.throws(
    () =>
      applyTownCommand(
        s,
        { action: "assign-worker", plotId: "garden", workerId: "adult-99" },
        20000,
      ),
    /adult/,
  );
  assert.throws(
    () =>
      applyTownCommand(
        s,
        { action: "select-crop", plotId: "garden", crop: "unknown" },
        20000,
      ),
    /crop/,
  );
  assert.throws(
    () =>
      applyTownCommand(
        s,
        { action: "assign-worker", plotId: "edge", workerId: "adult-2" },
        20000,
      ),
    /completed/,
  );
});

test("serialized farming state resumes without replaying harvests or meals", () => {
  let s = farm();
  reconcileTown(s, 3610000);
  s = initializeTown(JSON.parse(JSON.stringify(s)), 3610000);
  reconcileTown(s, 3610000);
  assert.equal(s.resources.food, 30);
  reconcileTown(s, 7210000);
  assert.equal(s.resources.food, 36);
  assert.equal(s.foodTotals.harvested, 16);
  assert.equal(s.foodTotals.meals, 4);
});
