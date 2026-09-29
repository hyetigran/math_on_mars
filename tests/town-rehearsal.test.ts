import test from "node:test";
import assert from "node:assert/strict";
import { TownRehearsal } from "../src/town-rehearsal";

test("a household builds a Greenhouse without overspending", () => {
  const town = new TownRehearsal();
  town.start("greenhouse");
  assert.equal(town.snapshot().blocks, 60);
  assert.equal(town.snapshot().parts, 15);
  town.advance(10);
  assert.equal(town.snapshot().greenhouse, true);
  assert.equal(town.snapshot().jobs.length, 0);
  assert.throws(() => town.start("greenhouse"));
});

test("one adult tends unlocked lettuce while two adults receive meals", () => {
  const town = new TownRehearsal();
  town.start("greenhouse");
  town.advance(10);
  town.unlockSeed();
  town.assignWorker(true);
  town.advance(3600);
  assert.equal(town.snapshot().food, 30);
  assert.equal(town.snapshot().reservedFood, 30);
  assert.equal(town.snapshot().reserveTarget, 48);
  assert.equal(town.snapshot().tradeCredits, 50);
  assert.equal(town.snapshot().availableAdults, 1);
  assert.throws(() => town.unlockSeed());
});

test("a corrected fixed-bank set earns credit once and shortens an upgrade", () => {
  const town = new TownRehearsal();
  town.start("house");
  const practice = town.beginPractice("K", "Add one");
  assert.ok(practice.questions.length > 0 && practice.questions.length <= 5);
  const first = practice.questions[0];
  assert.equal(town.answer(first.id, "999999"), false);
  assert.equal(town.snapshot().constructionCredit, 0);
  for (const q of practice.questions)
    town.answer(q.id, String(q.answer[0] / q.answer[1]));
  const earned = practice.questions.length * 240;
  assert.equal(town.snapshot().constructionCredit, earned);
  assert.throws(() => town.answer(first.id, "5"));
  town.applyCredit("house");
  assert.equal(town.snapshot().jobs[0].remaining, 3600 - earned);
  assert.equal(town.snapshot().constructionCredit, 0);
  assert.equal(town.practiceSnapshot()!.firstAttempts[first.id], false);
});

test("a full store holds a harvest until meals free space, without duplication", () => {
  const town = new TownRehearsal({ food: 4, foodCapacity: 4 });
  town.start("greenhouse");
  town.advance(10);
  town.unlockSeed();
  town.assignWorker(true);
  town.advance(1800);
  assert.equal(town.snapshot().food, 4);
  assert.equal(town.snapshot().heldHarvest, 4);
  assert.equal(town.snapshot().cropOperating, false);
  town.advance(1790);
  assert.equal(town.snapshot().food, 2);
  assert.equal(town.snapshot().heldHarvest, 4);
  town.advance(3600);
  assert.equal(town.snapshot().food, 4);
  assert.equal(town.snapshot().heldHarvest, 0);
});
test("shortage pauses crops while habitat meals keep residents safe", () => {
  const town = new TownRehearsal({ food: 0, power: 0 });
  town.start("greenhouse");
  town.advance(10);
  town.unlockSeed();
  town.assignWorker(true);
  town.advance(3590);
  assert.equal(town.snapshot().food, 0);
  assert.equal(town.snapshot().emergencyMeals, 2);
  assert.equal(town.snapshot().cropOperating, false);
  assert.equal(town.snapshot().availableAdults, 1);
  town.assignWorker(true);
  assert.equal(town.snapshot().availableAdults, 1);
  town.assignWorker(false);
  assert.equal(town.snapshot().availableAdults, 2);
});
test("invalid tuning and overspending are rejected without changing state", () => {
  assert.throws(() => new TownRehearsal({ cropSeconds: 0 }));
  assert.throws(() => new TownRehearsal({ adults: 3 }));
  const town = new TownRehearsal({ blocks: 0 });
  const before = town.snapshot();
  assert.throws(() => town.start("house"));
  assert.deepEqual(town.snapshot(), before);
});
test("topic decks exhaust before recycling and short topics have proportional awards", () => {
  const town = new TownRehearsal();
  const seen = new Set<string>();
  for (let set = 0; set < 5; set++) {
    const p = town.beginPractice("1", "Addition within 20");
    for (const q of p.questions) {
      if (seen.size < 21) assert.ok(!seen.has(q.id));
      seen.add(q.id);
      town.answer(q.id, `${q.answer[0]}/${q.answer[1]}`);
    }
    assert.equal(p.repeated, set === 4);
  }
  assert.equal(seen.size, 21);
});

test("restoring starter power resumes a shortage scenario without losing its history", () => {
  const town = new TownRehearsal({ food: 0, power: 0 });
  town.start("greenhouse");
  town.advance(10);
  town.unlockSeed();
  town.assignWorker(true);
  town.advance(3590);
  town.restoreStarterPower();
  town.advance(3600);
  assert.equal(town.snapshot().food, 6);
  assert.equal(town.snapshot().emergencyMeals, 2);
  assert.equal(town.snapshot().now, 7200);
  assert.equal(town.snapshot().tradeCredits, 50);
});
