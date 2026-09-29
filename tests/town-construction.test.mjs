import test from "node:test";
import assert from "node:assert/strict";
import {
  initializeTown,
  reconcileTown,
  applyTownCommand,
} from "../server/town-model.mjs";
const starter = () =>
  initializeTown({ version: 1, houseLevel: 1, adults: 2, houseCapacity: 2 }, 0);
test("construction spends once, completes at the authoritative boundary, and preserves starter stocks", () => {
  const state = starter();
  applyTownCommand(state, { action: "build", plotId: "garden" }, 0);
  assert.equal(state.resources.blocks, 60);
  assert.equal(state.resources.parts, 15);
  assert.equal(state.resources.food, 24);
  assert.equal(state.utilities.power, 10);
  reconcileTown(state, 9999);
  assert.equal(state.plots.garden.building, null);
  reconcileTown(state, 10000);
  assert.equal(state.plots.garden.building, "greenhouse");
  assert.equal(state.jobs[0].status, "completed");
  reconcileTown(state, 20000);
  assert.equal(state.resources.blocks, 60);
});
test("fixed plots, two shared slots, cancellation refunds and rejects repeat cancellation", () => {
  const state = starter();
  applyTownCommand(state, { action: "build", plotId: "garden" }, 0);
  assert.throws(
    () => applyTownCommand(state, { action: "build", plotId: "garden" }, 0),
    /occupied/,
  );
  applyTownCommand(state, { action: "build", plotId: "market" }, 0);
  assert.throws(
    () => applyTownCommand(state, { action: "build", plotId: "edge" }, 0),
    /slots/,
  );
  const jobId = state.jobs[0].id;
  applyTownCommand(state, { action: "cancel", jobId }, 5000);
  assert.equal(state.resources.blocks, 60);
  assert.equal(state.jobs[0].status, "cancelled");
  assert.throws(
    () => applyTownCommand(state, { action: "cancel", jobId }, 5000),
    /running/,
  );
  applyTownCommand(state, { action: "build", plotId: "edge" }, 5000);
  assert.throws(
    () => applyTownCommand(state, { action: "build", plotId: "unknown" }, 5000),
    /plot/,
  );
  state.resources.blocks = 0;
  applyTownCommand(state, { action: "cancel", jobId: state.jobs[1].id }, 5000);
  state.resources.parts = 0;
  assert.throws(
    () => applyTownCommand(state, { action: "build", plotId: "market" }, 5000),
    /materials/,
  );
});
