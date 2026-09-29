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

test("occupied House upgrades only at completion and applies capacity and utility demand once", () => {
  let s = starter();
  applyTownCommand(s, { action: "upgrade-house" }, 0);
  assert.equal(s.resources.blocks, 40);
  assert.equal(s.resources.parts, 10);
  assert.equal(s.houseLevel, 1);
  assert.equal(s.houseCapacity, 2);
  assert.equal(s.adults, 2);
  s = initializeTown(JSON.parse(JSON.stringify(s)), 1);
  reconcileTown(s, 3599999);
  assert.equal(s.houseLevel, 1);
  assert.equal(s.housePowerDemand, 0);
  reconcileTown(s, 3600000);
  assert.equal(s.houseLevel, 2);
  assert.equal(s.plots.home.level, 2);
  assert.equal(s.houseCapacity, 4);
  assert.equal(s.adults, 2);
  assert.equal(s.housePowerDemand, 1);
  reconcileTown(s, 7200000);
  assert.equal(s.housePowerDemand, 1);
  assert.throws(
    () => applyTownCommand(s, { action: "upgrade-house" }, 7200000),
    /level/,
  );
});
test("upgrade shares slots and cancellation preserves the occupied original House", () => {
  const s = starter();
  applyTownCommand(s, { action: "upgrade-house" }, 0);
  applyTownCommand(s, { action: "build", plotId: "garden" }, 0);
  assert.throws(
    () => applyTownCommand(s, { action: "build", plotId: "market" }, 0),
    /slots/,
  );
  applyTownCommand(s, { action: "cancel", jobId: s.jobs[0].id }, 1000);
  assert.equal(s.resources.blocks, 60);
  assert.equal(s.resources.parts, 15);
  assert.equal(s.houseLevel, 1);
  assert.equal(s.houseCapacity, 2);
  assert.equal(s.adults, 2);
  assert.equal(s.plots.home.building, "house");
});

test("credit shortens a chosen job, retains surplus, and cannot be refunded by cancellation", () => {
  const s = starter();
  applyTownCommand(s, { action: "upgrade-house" }, 0);
  s.constructionCredit = 1200000;
  const id = s.jobs[0].id;
  applyTownCommand(
    s,
    { action: "spend-credit", jobId: id, expectedRevision: s.revision },
    0,
  );
  assert.equal(s.jobs[0].endsAt, 2400000);
  assert.equal(s.constructionCredit, 0);
  assert.equal(s.houseLevel, 1);
  applyTownCommand(s, { action: "cancel", jobId: id }, 1);
  assert.equal(s.constructionCredit, 0);
  assert.equal(s.resources.blocks, 80);
  applyTownCommand(s, { action: "build", plotId: "garden" }, 1);
  s.constructionCredit = 1200000;
  applyTownCommand(
    s,
    {
      action: "spend-credit",
      jobId: s.jobs[1].id,
      expectedRevision: s.revision,
    },
    1,
  );
  assert.equal(s.constructionCredit, 1190000);
  assert.equal(s.plots.garden.building, "greenhouse");
  assert.throws(
    () =>
      applyTownCommand(
        s,
        {
          action: "spend-credit",
          jobId: s.jobs[1].id,
          expectedRevision: s.revision,
        },
        1,
      ),
    /running/,
  );
});
test("stale revisions and simultaneous natural completion do not spend credit", () => {
  const s = starter();
  applyTownCommand(s, { action: "build", plotId: "garden" }, 0);
  s.constructionCredit = 20000;
  const id = s.jobs[0].id,
    revision = s.revision;
  assert.throws(
    () =>
      applyTownCommand(
        s,
        { action: "spend-credit", jobId: id, expectedRevision: revision - 1 },
        0,
      ),
    /changed/,
  );
  reconcileTown(s, 10000);
  assert.throws(
    () =>
      applyTownCommand(
        s,
        { action: "spend-credit", jobId: id, expectedRevision: revision },
        10000,
      ),
    /changed/,
  );
  assert.equal(s.constructionCredit, 20000);
  assert.throws(
    () =>
      applyTownCommand(
        s,
        {
          action: "spend-credit",
          jobId: "missing",
          expectedRevision: s.revision,
        },
        10000,
      ),
    /running/,
  );
});
