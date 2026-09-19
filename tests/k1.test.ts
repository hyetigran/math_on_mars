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
    if (grade === "K") {
      assert.equal(
        questions.filter((q) => q.visualCount !== undefined).length,
        2,
      );
      assert.equal(
        questions.filter((q) => q.visualGroups?.length === 2).length,
        3,
      );
      for (const q of questions) {
        const groups = q.visualGroups;
        const expected =
          q.visualCount ??
          (q.prompt.includes("more")
            ? Math.max(...groups!)
            : q.prompt.includes("altogether")
              ? groups![0] + groups![1]
              : groups![0] - groups![1]);
        assert.equal(q.answer[0], expected);
        if (q.prompt.includes("altogether") || q.prompt.includes("taken away"))
          assert.ok(expected >= 0 && expected <= 5);
      }
    } else {
      assert.equal(
        questions.filter(
          (q) => q.prompt.includes("+ ") && !q.prompt.includes("+ ?"),
        ).length,
        2,
      );
      assert.equal(questions.filter((q) => q.prompt.includes("−")).length, 2);
      assert.equal(questions.filter((q) => q.prompt.includes("+ ?")).length, 1);
      for (const q of questions) {
        const numbers = q.prompt.match(/\d+/g)!.map(Number);
        const expected = q.prompt.includes("−")
          ? numbers[0] - numbers[1]
          : q.prompt.includes("+ ?")
            ? numbers[1] - numbers[0]
            : numbers[0] + numbers[1];
        assert.deepEqual(q.answer, [expected, 1]);
      }
    }
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
    assert.ok(history.every((h) => !h.correctInitially && h.corrected));
    assert.equal(restored.profile(id).activeRun!.quiz!.rewardQuality, "white");
  }
});
