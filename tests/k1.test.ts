import test from "node:test";
import assert from "node:assert/strict";
import { RunSession } from "../src/session";
import { ProfileRepository } from "../src/persistence";

test("K–1 missions use exact deterministic text-only tasks and persistent correction history", () => {
  for (const grade of ["K", "1"] as const) {
    const data = new Map<string, string>();
    const repository = new ProfileRepository({
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        data.set(key, value);
      },
    });
    const session = new RunSession([], repository);
    const id = session.createProfile("Learner");
    session.start(id, grade);
    const before = session.profiles;
    const replay = new RunSession(before, { commit() {} });
    const outcome = { hp: 100, salvage: 8, medkits: 1 };
    session.finishWave(id, outcome);
    replay.finishWave(id, outcome);
    const questions = session.profile(id).activeRun!.quiz!.questions;
    assert.deepEqual(questions, replay.profile(id).activeRun!.quiz!.questions);
    assert.equal(questions.length, 5);
    assert.ok(
      questions.every((q) => q.source?.url.includes("im.kendallhunt.com")),
    );
    for (const q of questions) {
      session.submit(id, q.id, "999", 30000);
    }
    session.chooseReward(
      id,
      session.profile(id).activeRun!.quiz!.rewardChoices![0].id,
    );
    const restored = new RunSession(repository.load(), repository);
    for (const q of questions) restored.correct(id, q.id, String(q.answer[0]));
    const history = repository.load()[0].history;
    assert.equal(history.length, 5);
    assert.deepEqual(
      history.map((h) => h.source),
      questions.map((q) => q.source),
    );
    assert.ok(history.every((h) => !h.correctInitially && h.corrected));
    assert.equal(restored.profile(id).activeRun!.quiz!.rewardQuality, "white");
  }
});
