import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { RunSession } from "../src/session";
import { ProfileRepository } from "../src/persistence";
import { NARRATION_CLIPS } from "../src/narration";

test("K–1 missions use exact deterministic tasks, installed speech and persistent correction history", () => {
  const authored = JSON.parse(
    readFileSync("content/narration/k1-en.json", "utf8"),
  );
  for (const id of NARRATION_CLIPS) {
    assert.ok(authored[id]);
    assert.ok(existsSync(`public/audio/k1/${id}.mp3`));
    assert.ok(readFileSync(`public/audio/k1/${id}.mp3`).length > 1000);
  }
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
      assert.ok(questions[0].visualCount);
      assert.equal(questions[1].visualGroups!.length, 2);
      for (const q of questions)
        assert.equal(
          q.answer[0],
          q.visualCount ?? Math.max(...q.visualGroups!),
        );
    } else {
      assert.match(questions[0].prompt, /\+/);
      assert.match(questions[1].prompt, /−/);
      assert.match(questions[2].prompt, /\+ \?/);
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
      assert.ok(q.speechClips!.every((clip) => NARRATION_CLIPS.includes(clip)));
      assert.ok(q.hintClips!.every((clip) => NARRATION_CLIPS.includes(clip)));
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
