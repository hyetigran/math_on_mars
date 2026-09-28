import test from "node:test";
import assert from "node:assert/strict";
import { RunSession } from "../src/session";
import { AMMO_TYPES } from "../src/types";

function setup(enabled = true) {
  const session = new RunSession([], { commit() {} }, enabled);
  const id = session.createProfile("QA");
  session.start(id, "3");
  return { session, id };
}

test("QA is disabled by default and rejects invalid wave/loadout without mutation", () => {
  const disabled = setup(false);
  assert.throws(
    () => disabled.session.jumpToWaveForQA(disabled.id, 2, []),
    /development/,
  );
  const { session, id } = setup();
  const before = session.profiles;
  for (const wave of [0, 11, 1.5, NaN])
    assert.throws(() => session.jumpToWaveForQA(id, wave, []));
  assert.throws(() =>
    session.jumpToWaveForQA(
      id,
      2,
      AMMO_TYPES.map((type) => ({ type, tier: 1 })),
    ),
  );
  assert.deepEqual(session.profiles, before);
});

test("QA jumps forward and backward, resets between-wave state, and equips all types and rarities", () => {
  const { session, id } = setup();
  session.finishWave(id, { hp: 25, salvage: 17, medkits: 1 });
  const history = session.profile(id).history;
  for (const type of AMMO_TYPES) {
    session.jumpToWaveForQA(
      id,
      10,
      [1, 2, 3, 4].map((tier) => ({ type, tier: tier as 1 | 2 | 3 | 4 })),
    );
    const run = session.profile(id).activeRun!;
    assert.equal(run.wave, 10);
    assert.equal(run.phase, "combat");
    assert.equal(run.hp, run.maxHp);
    assert.equal(run.salvage, 17);
    assert.equal(run.quiz, undefined);
    assert.equal(run.combatSave, undefined);
    assert.equal(run.waveLoot, undefined);
    assert.equal(run.ammoCapacity, 4);
    assert.deepEqual(
      run.activeAmmoIds,
      run.ammo.map((a) => a.id),
    );
    assert.deepEqual(
      run.ammo.map((a) => a.tier),
      [1, 2, 3, 4],
    );
  }
  session.jumpToWaveForQA(id, 1, [
    { type: "Piercing", tier: 4, legendary: true },
  ]);
  assert.equal(session.profile(id).activeRun!.ammo[0].legendary, true);
  assert.equal(session.profile(id).activeRun!.wave, 1);
  session.jumpToWaveForQA(id, 2, []);
  assert.deepEqual(session.profile(id).activeRun!.activeAmmoIds, []);
  assert.deepEqual(session.profile(id).history, history);
});

test("QA quiz jump applies currency and trinkets atomically without fake practice", () => {
  const { session, id } = setup();
  session.setQuizSettings(id, {
    secondsPerQuestion: 8,
    questionsPerWave: 3,
    answerType: "multiple-choice",
  });
  session.start(id, "3");
  session.jumpToWaveForQA(id, 2, [], {
    section: "quiz",
    salvage: 123,
    trinkets: [{ name: "Integrity Shield", quality: "purple" }],
  });
  let run = session.profile(id).activeRun!;
  assert.equal(run.phase, "quiz");
  assert.equal(run.salvage, 123);
  assert.equal(run.maxHp, 110);
  assert.equal(run.hp, 110);
  assert.equal(run.modules[0].name, "Integrity Shield");
  assert.equal(run.modules[0].quality, "purple");
  assert.equal(run.quiz!.questions.length, 3);
  assert.equal(run.quiz!.remainingMs, 24000);
  assert.equal(run.quiz!.answerType, "multiple-choice");
  assert.equal(session.profile(id).history.length, 0);
  const before = session.profiles;
  for (const options of [
    { salvage: -1 },
    { salvage: NaN },
    { salvage: 1.5 },
    { salvage: 1000001 },
    {
      clearTrinkets: true,
      trinkets: [{ name: "unknown", quality: "purple" as const }],
    },
  ])
    assert.throws(() => session.jumpToWaveForQA(id, 1, [], options));
  assert.throws(() =>
    session.jumpToWaveForQA(id, run.totalWaves, [], { section: "quiz" }),
  );
  assert.deepEqual(session.profiles, before);
  session.jumpToWaveForQA(id, 1, [], {
    section: "quiz",
    salvage: 0,
    clearTrinkets: true,
  });
  run = session.profile(id).activeRun!;
  assert.equal(run.salvage, 0);
  assert.equal(run.hp, 100);
  assert.equal(run.maxHp, 100);
  assert.deepEqual(run.modules, []);
  assert.deepEqual(run.quiz!.attempts, []);
});

test("repeating a QA quiz keeps earlier attempt history separate", () => {
  const { session, id } = setup();
  session.jumpToWaveForQA(id, 1, [], { section: "quiz" });
  const first = session.profile(id).activeRun!.quiz!.questions[0];
  session.submit(id, first.id, "9999", 1000);
  session.jumpToWaveForQA(id, 1, [], { section: "quiz" });
  const second = session.profile(id).activeRun!.quiz!.questions[0];
  assert.notEqual(first.id, second.id);
  session.submit(id, first.id, "0", 1000);
  assert.equal(session.profile(id).activeRun!.quiz!.index, 0);
  session.submit(id, second.id, "9999", 1000);
  assert.equal(
    new Set(session.profile(id).history.map((h) => h.occurrenceId)).size,
    2,
  );
});
