import test from "node:test";
import assert from "node:assert/strict";
import { RunSession } from "../src/session";
import { ProfileRepository } from "../src/persistence";

test("grades 2–3 expose exact bounded practice and preserve first attempts through corrections", () => {
  for (const grade of ["2", "3"] as const) {
    for (let seed = 0; seed < 40; seed++) {
      const data = new Map<string, string>();
      const repository = new ProfileRepository({
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => {
          data.set(key, value);
        },
      });
      const id = `grade-${grade}-${seed}`;
      const session = new RunSession(
        [
          {
            id,
            name: "Learner",
            grade,
            handedness: "left",
            history: [],
            victories: 0,
          },
        ],
        repository,
      );
      session.start(id, grade);
      session.finishWave(id, { hp: 100, salvage: 8, medkits: 1 });
      const initial = session.profile(id).activeRun!;
      assert.equal(initial.quiz!.remainingMs, 40000);
      const questions = initial.quiz!.questions;
      assert.equal(questions.length, 5);
      for (const q of questions) {
        assert.ok(q.source?.url.includes(`grade-${grade}`));
        assert.ok(
          q.answer[0] >= 0 && q.answer[0] <= (grade === "2" ? 100 : 1000),
        );
        session.submit(id, q.id, "999", 30000);
      }
      session.chooseReward(
        id,
        session.profile(id).activeRun!.quiz!.rewardChoices![0].id,
      );
      const resumed = new RunSession(repository.load(), repository);
      assert.deepEqual(
        resumed.profile(id).activeRun!.quiz!.questions,
        JSON.parse(JSON.stringify(questions)),
      );
      for (const q of questions) resumed.correct(id, q.id, String(q.answer[0]));
      assert.ok(
        repository
          .load()[0]
          .history.every((h) => !h.correctInitially && h.corrected),
      );
      assert.equal(resumed.profile(id).activeRun!.quiz!.rewardQuality, "white");
    }
  }
});
