import test from "node:test";
import assert from "node:assert/strict";
import { RunSession } from "../src/session";
import { ProfileRepository } from "../src/persistence";

test("grade 5 preserves exact decimal and fraction work across reload", () => {
  for (const grade of ["5"] as const)
    for (let seed = 0; seed < 30; seed++) {
      const data = new Map<string, string>();
      const repository = new ProfileRepository({
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => {
          data.set(key, value);
        },
      });
      const id = `upper-${grade}-${seed}`;
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
      const questions = session.profile(id).activeRun!.quiz!.questions;
      for (const question of questions) {
        assert.ok(question.source?.url.includes("grade-5"));
        const [numerator, denominator] = question.answer;
        const before = session.profiles;
        session.submit(id, question.id, "1/0", 30000);
        assert.deepEqual(session.profiles, before);
        session.submit(
          id,
          question.id,
          seed % 2 ? "99999" : `${numerator * 2}/${denominator * 2}`,
          12000,
        );
      }
      session.chooseReward(
        id,
        session.profile(id).activeRun!.quiz!.rewardChoices![0].id,
      );
      const restored = new RunSession(repository.load(), repository);
      assert.deepEqual(
        restored.profile(id).activeRun!.quiz!.questions,
        JSON.parse(JSON.stringify(questions)),
      );
      if (seed % 2)
        for (const q of questions)
          restored.correct(id, q.id, `${q.answer[0]}/${q.answer[1]}`);
      const history = repository.load()[0].history;
      assert.ok(
        history.every(
          (h) => h.correctInitially === (seed % 2 === 0) && h.corrected,
        ),
      );
    }
});
