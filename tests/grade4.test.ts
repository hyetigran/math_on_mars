import test from "node:test";
import assert from "node:assert/strict";
import { RunSession } from "../src/session";
import { ProfileRepository } from "../src/persistence";

test("grade 4 validates fraction drafts without penalties and restores exact fraction tasks", () => {
  for (let seed = 0; seed < 30; seed++) {
    const data = new Map<string, string>();
    const repository = new ProfileRepository({
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        data.set(key, value);
      },
    });
    const id = `four-${seed}`;
    const session = new RunSession(
      [
        {
          id,
          name: "Learner",
          grade: "4",
          handedness: "left",
          history: [],
          victories: 0,
        },
      ],
      repository,
    );
    session.start(id, "4");
    session.finishWave(id, { hp: 100, salvage: 8, medkits: 1 });
    const questions = session.profile(id).activeRun!.quiz!.questions;
    assert.match(questions[2].prompt, /equivalent/);
    for (const q of questions) {
      const n = q.prompt.match(/\d+/g)!.map(Number);
      if (q.prompt.includes("equivalent"))
        assert.equal(q.answer[0], (n[0] * n[2]) / n[1]);
      else if (q.prompt.includes("×")) assert.equal(q.answer[0], n[0] * n[1]);
      else assert.equal(q.answer[0] * n[1], (n[0] + n[2]) * q.answer[1]);
    }
    session.submit(id, questions[0].id, String(questions[0].answer[0]), 5000);
    const before = session.profiles;
    for (const invalid of ["", "1/", "1/0", "1/2/3", ".", "2x"])
      assert.ok(session.submit(id, questions[1].id, invalid, 20000));
    assert.deepEqual(session.profiles, before);
    session.checkpoint(id, { elapsedMs: 8000, draft: "1/" });
    const restored = new RunSession(repository.load(), repository);
    const quiz = restored.profile(id).activeRun!.quiz!;
    assert.deepEqual(quiz.questions, JSON.parse(JSON.stringify(questions)));
    assert.equal(quiz.draft, "1/");
    assert.equal(quiz.remainingMs, 22000);
    for (let i = 1; i < 5; i++) {
      const [n, d] = questions[i].answer;
      restored.submit(
        id,
        questions[i].id,
        i === 4 ? "99999" : `${n * 2}/${d * 2}`,
        9000,
      );
    }
    restored.chooseReward(
      id,
      restored.profile(id).activeRun!.quiz!.rewardChoices![0].id,
    );
    const originalQuality = restored.profile(id).activeRun!.quiz!.rewardQuality;
    const last = questions[4];
    restored.correct(id, last.id, `${last.answer[0]}/${last.answer[1]}`);
    const saved = repository.load()[0];
    assert.deepEqual(
      saved.history.map((h) => h.correctInitially),
      [true, true, true, true, false],
    );
    assert.ok(saved.history.every((h) => h.corrected));
    assert.equal(saved.activeRun!.quiz!.rewardQuality, originalQuality);
  }
});
