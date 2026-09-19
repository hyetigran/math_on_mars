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
      if (grade === "5")
        assert.ok(questions.some((q) => q.prompt.includes("−")));
      else assert.ok(questions.some((q) => q.prompt.includes("ratio")));
      for (const question of questions) {
        const numbers = question.prompt.match(/\d+(?:\.\d+)?/g)!.map(Number);
        let numerator: number,
          denominator = 1;
        if (question.answerInput === "fraction") {
          const [a, b, c, d] = numbers;
          assert.ok(b > 0 && d > 0);
          if (grade === "5") {
            assert.notEqual(b, d);
            numerator =
              a * d + (question.prompt.includes("−") ? -c * b : c * b);
            denominator = b * d;
          } else {
            numerator = a * d;
            denominator = b * c;
          }
        } else if (grade === "5") {
          const [a, b] = numbers.map((value) => Math.round(value * 10));
          numerator = a + (question.prompt.includes("−") ? -b : b);
          denominator = 10;
        } else if (question.prompt.includes("ratio")) {
          numerator = numbers[1] * numbers[2];
          denominator = numbers[0];
        } else if (question.prompt.includes("Cost per")) {
          numerator = numbers[1];
          denominator = numbers[0];
        } else if (question.prompt.includes("×")) {
          numerator = numbers[1];
          denominator = numbers[0];
        } else numerator = numbers[1] - numbers[0];
        assert.equal(
          question.answer[0] * denominator,
          numerator * question.answer[1],
        );
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
