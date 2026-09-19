import test from "node:test";
import assert from "node:assert/strict";
import { makeQuestions } from "../src/questions";
import { RunSession } from "../src/session";
import type { Grade } from "../src/types";

const grades: Grade[] = ["K", "1", "2", "3", "4", "5"];
const content = (questions: ReturnType<typeof makeQuestions>) =>
  questions.map(({ id: _id, ...question }) => question);

test("new missions use their own questions, while replaying a mission preserves the quiz", () => {
  for (const grade of grades) {
    let session = new RunSession([], { commit() {} });
    const id = session.createProfile("Same learner");
    const quizzes = [];
    for (let mission = 0; mission < 2; mission++) {
      session.start(id, grade);
      const profiles = session.profiles;
      // Fixed distinct mission IDs make this regression test reproducible.
      profiles[0].activeRun!.id = `mission-${mission}`;
      session = new RunSession(profiles, { commit() {} });
      const replay = new RunSession(profiles, { commit() {} });
      const outcome = { hp: 100, salvage: 8, medkits: 1 };
      session.finishWave(id, outcome);
      replay.finishWave(id, outcome);
      const questions = session.profile(id).activeRun!.quiz!.questions;
      assert.deepEqual(
        questions,
        replay.profile(id).activeRun!.quiz!.questions,
      );
      assert.deepEqual(
        content(questions),
        content(makeQuestions(grade, 1, `mission-${mission}`)),
      );
      quizzes.push(content(questions));
    }
    assert.notDeepEqual(
      quizzes[0],
      quizzes[1],
      `Grade ${grade} repeated its quiz`,
    );
  }
});

test("question order varies while retaining each grade's five-question skill mix", () => {
  for (const grade of grades) {
    const orders = new Set<string>();
    for (let mission = 0; mission < 20; mission++) {
      const questions = makeQuestions(grade, 1, `mission-${mission}`);
      const slots = questions.map((q) => Number(q.id.split("-")[1]));
      assert.deepEqual([...slots].sort(), [0, 1, 2, 3, 4]);
      orders.add(slots.join());
    }
    assert.ok(orders.size > 1, `Grade ${grade} always uses the same order`);
  }
});
