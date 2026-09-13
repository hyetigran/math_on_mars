import test from "node:test";
import assert from "node:assert/strict";
import { RunSession, timeQuality } from "../src/session";
import { ProfileRepository } from "../src/persistence";

function setup(grade: "K" | "3" = "3") {
  const data = new Map<string, string>();
  let fail = false;
  const repository = new ProfileRepository({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      if (fail) throw new Error("quota");
      data.set(key, value);
    },
  });
  const session = new RunSession([], repository);
  const id = session.createProfile("Test");
  session.start(id, grade);
  session.finishWave(id, { hp: 100, salvage: 8, medkits: 1 });
  return {
    session,
    id,
    repository,
    setFailure: (value) => {
      fail = value;
    },
  };
}
function answer(s: RunSession, id: string, correct: boolean, elapsed = 5000) {
  const quiz = s.profile(id).activeRun!.quiz!;
  const q = quiz.questions[quiz.index];
  return s.submit(
    id,
    q.id,
    correct ? `${q.answer[0]}/${q.answer[1]}` : "999",
    elapsed,
  );
}

test("paused and stale submissions cannot change quiz or history", () => {
  const { session, id } = setup();
  const before = session.profiles;
  session.setPaused(true);
  answer(session, id, false);
  assert.deepEqual(session.profiles, before);
  session.setPaused(false);
  const occurrence = session.profile(id).activeRun!.quiz!.questions[0].id;
  answer(session, id, true);
  session.submit(id, occurrence, "999", 6000);
  assert.equal(session.profile(id).activeRun!.quiz!.index, 1);
  assert.equal(session.profile(id).history.length, 1);
});
test("time boundaries, wrong deductions and mandatory answers after expiry", () => {
  assert.deepEqual([30000, 20001, 20000, 10001, 10000, 1, 0].map(timeQuality), [
    "purple",
    "purple",
    "blue",
    "blue",
    "green",
    "green",
    "white",
  ]);
  for (const wrong of [0, 1, 2, 3, 4, 5]) {
    const { session, id } = setup();
    for (let i = 0; i < 5; i++) answer(session, id, i >= wrong);
    assert.equal(
      session.profile(id).activeRun!.quiz!.rewardQuality,
      ["purple", "blue", "green", "white", "white", "white"][wrong],
    );
  }
  const { session, id } = setup();
  answer(session, id, true, 30000);
  assert.equal(session.profile(id).activeRun!.phase, "quiz");
  for (let i = 1; i < 5; i++) answer(session, id, true, 30000);
  assert.equal(session.profile(id).activeRun!.quiz!.rewardQuality, "white");
});
test("identical counting prompts correct the exact occurrence and preserve original accuracy", () => {
  const { session, id } = setup("K");
  for (let i = 0; i < 5; i++) answer(session, id, false);
  const reward = session.profile(id).activeRun!.quiz!.rewardChoices![0].id;
  session.chooseReward(id, reward);
  const first = session.profile(id).activeRun!.quiz!.attempts[0].question;
  session.correct(id, first.id, `${first.answer[0]}/${first.answer[1]}`);
  const profile = session.profile(id);
  assert.deepEqual(
    profile.history.map((h) => h.corrected),
    [true, false, false, false, false],
  );
  assert.ok(profile.history.every((h) => !h.correctInitially));
  session.nextWave(id);
  assert.equal(session.profile(id).activeRun!.phase, "correction");
  session.chooseReward(id, reward);
  assert.equal(session.profile(id).activeRun!.modules.length, 1);
});
test("failed reward commit is not published; retry awards once", () => {
  const { session, id, setFailure, repository } = setup();
  for (let i = 0; i < 5; i++) answer(session, id, false);
  const before = session.profiles;
  const reward = before[0].activeRun!.quiz!.rewardChoices![0].id;
  setFailure(true);
  assert.throws(() => session.chooseReward(id, reward));
  assert.deepEqual(session.profiles, before);
  setFailure(false);
  session.chooseReward(id, reward);
  session.chooseReward(id, reward);
  assert.equal(session.profile(id).activeRun!.modules.length, 1);
  assert.deepEqual(
    repository.load(),
    JSON.parse(JSON.stringify(session.profiles)),
  );
});
test("failed initial answer leaves timer/index/history durable and retryable", () => {
  const { session, id, setFailure } = setup();
  const before = session.profiles;
  setFailure(true);
  assert.throws(() => answer(session, id, true));
  assert.deepEqual(session.profiles, before);
  setFailure(false);
  answer(session, id, true);
  assert.equal(session.profile(id).history.length, 1);
});
test("fraction corrections resume with their draft and do not affect reward", () => {
  const { session, id, repository } = setup();
  for (let i = 0; i < 5; i++) answer(session, id, false);
  session.chooseReward(
    id,
    session.profile(id).activeRun!.quiz!.rewardChoices![0].id,
  );
  session.checkpoint(id, { correctionDraft: "1/3" });
  const restored = new RunSession(repository.load(), repository);
  assert.equal(restored.profile(id).activeRun!.quiz!.correctionDraft, "1/3");
  const before = restored.profile(id).activeRun!.quiz!.rewardQuality;
  const q = restored.profile(id).activeRun!.quiz!.attempts[0].question;
  restored.correct(id, q.id, `${q.answer[0]}/${q.answer[1]}`);
  assert.equal(restored.profile(id).activeRun!.quiz!.rewardQuality, before);
});

test("shop, equipped merge, forge, next wave and end stay behind committed commands", () => {
  const { session, id, repository } = setup();
  for (let wave = 1; wave <= 5; wave++) {
    if (wave > 1) session.finishWave(id, { hp: 100, salvage: 100, medkits: 1 });
    for (let i = 0; i < 5; i++) answer(session, id, true);
    session.chooseReward(
      id,
      session.profile(id).activeRun!.quiz!.rewardChoices![0].id,
    );
    const type = (
      ["Piercing", "Multi Shot", "Electric Chain", "Frost", "Fiery"] as const
    )[wave - 1];
    session.claimCache(id, type);
    session.merge(id, type, 3);
    if (wave < 5) session.nextWave(id);
  }
  session.forge(id);
  session.forge(id);
  const run = session.profile(id).activeRun!;
  assert.equal(run.ammo.filter((a) => a.legendary).length, 1);
  assert.equal(run.activeAmmoIds.length, 1);
  const restored = new RunSession(repository.load(), repository);
  assert.equal(
    restored.profile(id).activeRun!.ammo.filter((a) => a.legendary).length,
    1,
  );
  restored.nextWave(id);
  assert.equal(restored.profile(id).activeRun!.phase, "combat");
  restored.end(id, false);
  assert.equal(restored.profile(id).activeRun, undefined);
  assert.equal(restored.profile(id).history.length, 25);
});
