import test from "node:test";
import assert from "node:assert/strict";
import {
  initializeTown,
  reconcileTown,
  applyTownCommand,
} from "../server/town-model.mjs";
import { visitTown, ABSENCE_LIMIT } from "../server/town-visits.mjs";
const start = () =>
  initializeTown({ version: 1, houseLevel: 1, houseCapacity: 2, adults: 2 }, 0);
const visit = (s, event, id, time) => {
  reconcileTown(s, time);
  return visitTown(s, { event, visitId: id }, "session-one", time);
};
test("production and consumption freeze after 48 hours while long construction completes", () => {
  const s = start();
  visit(s, "open", "first-visit", 0);
  applyTownCommand(s, { action: "upgrade-house" }, 0);
  s.jobs[0].endsAt = ABSENCE_LIMIT + 3600000;
  visit(s, "leave", "first-visit", 0);
  reconcileTown(s, ABSENCE_LIMIT + 7200000);
  assert.equal(s.houseLevel, 2);
  assert.equal(s.foodTotals.meals + s.foodTotals.emergencyMeals, 96);
  const totals = structuredClone(s.foodTotals);
  reconcileTown(s, ABSENCE_LIMIT * 3);
  assert.deepEqual(s.foodTotals, totals);
  const summary = visit(s, "open", "return-visit", ABSENCE_LIMIT * 3);
  assert.equal(summary.capped, true);
  assert.equal(summary.completedJobs, 1);
  assert.equal(summary.simulatedMs, ABSENCE_LIMIT);
  reconcileTown(s, ABSENCE_LIMIT * 3 + 3600000);
  assert.equal(s.foodTotals.emergencyMeals, totals.emergencyMeals + 2);
});
test("zero and short visits reconcile once, and stale leave or duplicate open cannot reset the allowance", () => {
  const s = start();
  const first = visit(s, "open", "first-visit", 0);
  assert.equal(first.simulatedMs, 0);
  visit(s, "leave", "first-visit", 0);
  const summary = visit(s, "open", "second-visit", 3600000);
  assert.equal(summary.meals, 2);
  const until = s.productionUntil;
  assert.deepEqual(visit(s, "open", "second-visit", 3600100), summary);
  assert.equal(s.productionUntil, until);
  assert.throws(() => visit(s, "leave", "first-visit", 3600200), /visit/);
  visit(s, "heartbeat", "second-visit", 3610000);
  assert.equal(s.productionUntil, 3610000 + ABSENCE_LIMIT);
});
test("held harvest, workforce and food reserve survive capped absence without duplicated output", () => {
  const s = start();
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
  visit(s, "open", "farm-visit", 10000);
  visit(s, "leave", "farm-visit", 10000);
  reconcileTown(s, 10000 + ABSENCE_LIMIT * 2);
  assert.ok(s.resources.food <= 72);
  assert.equal(s.adults, 2);
  assert.ok(s.farms.garden.held === 0 || s.farms.garden.held === 4);
  const snapshot = JSON.stringify(s);
  reconcileTown(s, 10000 + ABSENCE_LIMIT * 2);
  assert.equal(JSON.stringify(s), snapshot);
  const first = visit(s, "open", "device-one", 10000 + ABSENCE_LIMIT * 2);
  const food = s.resources.food;
  visit(s, "open", "device-two", 10000 + ABSENCE_LIMIT * 2);
  assert.equal(s.resources.food, food);
  assert.ok(first.harvested > 0);
});

test("construction events change utility eligibility at their chronological boundary", () => {
  const s = start();
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
  s.utilities.power = 2;
  applyTownCommand(s, { action: "upgrade-house" }, 10000);
  s.jobs.find((j) => j.building === "house").endsAt = 2700000;
  reconcileTown(s, 7200000);
  assert.equal(s.houseLevel, 2);
  assert.equal(s.foodTotals.harvested, 4);
  assert.equal(s.farms.garden.remaining, 910000);
  assert.equal(s.resources.food, 24);
});
