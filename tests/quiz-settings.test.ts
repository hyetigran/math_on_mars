import test from "node:test";
import assert from "node:assert/strict";
import { RunSession } from "../src/session";
import { decodeProfiles, ProfileRepository } from "../src/persistence";
import {
  makeQuestions,
  makeAnswerChoices,
  isCorrect,
  parseNumericAnswer,
} from "../src/questions";
import { GRADES } from "../src/types";

function setup(seconds = 45, count = 3) {
  const data = new Map<string, string>();
  const repository = new ProfileRepository({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  });
  const session = new RunSession([], repository);
  const id = session.createProfile("Cadet");
  session.setQuizSettings(id, {
    secondsPerQuestion: seconds,
    questionsPerWave: count,
  });
  session.start(id, "3");
  session.finishWave(id, { hp: 100, salvage: 8, medkits: 1 });
  return { session, id, repository };
}

test("settings persist and are captured for the mission, not changed mid-quiz", () => {
  const { session, id, repository } = setup();
  session.setQuizSettings(id, { secondsPerQuestion: 90, questionsPerWave: 7 });
  const restored = new RunSession(repository.load(), repository);
  const quiz = restored.profile(id).activeRun!.quiz!;
  assert.equal(quiz.questions.length, 3);
  assert.equal(quiz.remainingMs, 135000);
  restored.start(id, "K");
  restored.finishWave(id, { hp: 100, salvage: 8, medkits: 1 });
  assert.equal(restored.profile(id).activeRun!.quiz!.questions.length, 7);
  assert.equal(restored.profile(id).activeRun!.quiz!.remainingMs, 630000);
});

test("one shared timer carries across questions; pause and stale checkpoints preserve it", () => {
  const { session, id, repository } = setup();
  const first = session.profile(id).activeRun!.quiz!.questions[0];
  session.checkpoint(id, {
    questionId: first.id,
    elapsedMs: 12000,
    draft: "2",
  });
  const restored = new RunSession(repository.load(), repository);
  assert.equal(restored.profile(id).activeRun!.quiz!.remainingMs, 123000);
  restored.setPaused(true);
  restored.submit(id, first.id, "999", 45000);
  assert.equal(restored.profile(id).activeRun!.quiz!.index, 0);
  restored.setPaused(false);
  restored.submit(id, first.id, "999", 50000);
  const next = restored.profile(id).activeRun!.quiz!;
  assert.equal(next.index, 1);
  assert.equal(next.elapsedMs, 50000);
  assert.equal(next.remainingMs, 85000);
  restored.checkpoint(id, {
    questionId: first.id,
    elapsedMs: 45000,
    draft: "999",
  });
  assert.deepEqual(restored.profile(id).activeRun!.quiz, next);
});

test("all configured questions settle, correct and award once with normalized timing", () => {
  for (const count of [1, 3, 7, 20]) {
    for (const seconds of [1, 45, 300]) {
      const { session, id, repository } = setup(seconds, count);
      for (let i = 0; i < count; i++) {
        const q = session.profile(id).activeRun!.quiz!.questions[i];
        session.submit(
          id,
          q.id,
          i === 0 ? "999" : `${q.answer[0]}/${q.answer[1]}`,
          (seconds * 1000 * (i + 1)) / 6,
        );
      }
      let run = repository.load()[0].activeRun!;
      assert.equal(run.phase, "correction");
      assert.equal(run.quiz!.rewardQuality, "blue");
      assert.equal(session.profile(id).history.length, count);
      const q = run.quiz!.questions[0];
      session.correct(id, q.id, `${q.answer[0]}/${q.answer[1]}`);
      run = session.profile(id).activeRun!;
      assert.equal(run.phase, "reward");
      assert.equal(run.quiz!.rewardQuality, "blue");
      const reward = run.quiz!.rewardChoices![0].id;
      session.chooseReward(id, reward);
      session.chooseReward(id, reward);
      assert.equal(repository.load()[0].activeRun!.modules.length, 1);
      session.nextWave(id);
      session.finishWave(id, { hp: 100, salvage: 8, medkits: 1 });
      assert.equal(
        session.profile(id).activeRun!.quiz!.questions.length,
        count,
      );
      assert.equal(session.profile(id).activeRun!.quiz!.elapsedMs, 0);
    }
  }
});

test("variable question counts cover every grade deterministically with distinct occurrence IDs", () => {
  for (const grade of GRADES)
    for (const count of [1, 3, 6, 20]) {
      const questions = makeQuestions(grade, 1, "settings-test", count);
      assert.equal(questions.length, count);
      assert.equal(new Set(questions.map((q) => q.id)).size, count);
      assert.deepEqual(
        questions,
        makeQuestions(grade, 1, "settings-test", count),
      );
    }
});

test("invalid settings are rejected by commands and profile imports", () => {
  const { session, id } = setup();
  const before = session.profiles;
  for (const settings of [
    { secondsPerQuestion: 0, questionsPerWave: 5 },
    { secondsPerQuestion: 301, questionsPerWave: 5 },
    { secondsPerQuestion: 1.5, questionsPerWave: 5 },
    { secondsPerQuestion: 30, questionsPerWave: 0 },
    { secondsPerQuestion: 30, questionsPerWave: 21 },
    { secondsPerQuestion: 30, questionsPerWave: 2.5 },
    { secondsPerQuestion: 8, questionsPerWave: 5, answerType: "unsupported" },
  ]) {
    assert.throws(() => session.setQuizSettings(id, settings));
    assert.throws(() =>
      decodeProfiles(
        JSON.stringify([{ ...before[0], quizSettings: settings }]),
      ),
    );
  }
  assert.deepEqual(session.profiles, before);
});

test("multiple choice settings survive reload and apply to the next mission", () => {
  const { session, id, repository } = setup();
  assert.equal(session.profile(id).activeRun!.quiz!.answerType, "input");
  session.setQuizSettings(id, {
    secondsPerQuestion: 8,
    questionsPerWave: 2,
    answerType: "multiple-choice",
  });
  const restored = new RunSession(repository.load(), repository);
  assert.equal(restored.profile(id).activeRun!.quiz!.answerType, "input");
  restored.start(id, "5");
  restored.finishWave(id, { hp: 100, salvage: 8, medkits: 1 });
  assert.equal(
    repository.load()[0].activeRun!.quiz!.answerType,
    "multiple-choice",
  );
  for (let index = 0; index < 2; index++) {
    const question = restored.profile(id).activeRun!.quiz!.questions[index];
    const correct = makeAnswerChoices(question).find((answer) =>
      isCorrect(answer, question.answer),
    )!;
    restored.submit(id, question.id, correct, (index + 1) * 1000);
  }
  assert.equal(repository.load()[0].activeRun!.phase, "reward");
  assert.equal(restored.profile(id).activeRun!.quiz!.remainingMs, 14000);
});

test("30,000 K–5 questions have four stable, distinct, nearby choices and exactly one correct answer", () => {
  const positions = new Set<number>();
  for (const grade of GRADES)
    for (let seed = 0; seed < 1000; seed++) {
      for (const question of makeQuestions(grade, 1, `choices-${seed}`)) {
        const choices = makeAnswerChoices(question);
        assert.equal(choices.length, 4);
        assert.equal(
          new Set(
            choices.map((answer) => parseNumericAnswer(answer)!.join("/")),
          ).size,
          4,
        );
        assert.equal(
          choices.filter((answer) => isCorrect(answer, question.answer)).length,
          1,
        );
        for (const value of choices) {
          const [n, d] = parseNumericAnswer(value)!;
          const [expectedN, expectedD] = question.answer;
          const unitDenominator = question.choiceDenominator!;
          // No negative distractors for nonnegative tasks; no jumps beyond three task units.
          assert.ok(n >= 0);
          assert.ok(
            Math.abs(n * expectedD - expectedN * d) * unitDenominator <=
              3 * d * expectedD,
          );
          assert.equal((n * unitDenominator) % d, 0);
        }
        assert.deepEqual(choices, makeAnswerChoices(question));
        positions.add(
          choices.findIndex((answer) => isCorrect(answer, question.answer)),
        );
      }
    }
  assert.equal(positions.size, 4);
});

test("small and simplified answers keep decimal and fraction distractors close", () => {
  const base = makeQuestions("5", 1, "nearby-regression")[0];
  for (const [answer, denominator, input, expected] of [
    [[1, 10], 10, "number", ["0", "0.1", "0.2", "0.3"]],
    [[1, 2], 10, "number", ["0.3", "0.4", "0.5", "0.6"]],
    [[1, 1], 10, "number", ["0.8", "0.9", "1", "1.1"]],
    [[0, 1], 10, "number", ["0", "0.1", "0.2", "0.3"]],
    [[1, 2], 4, "fraction", ["0", "1/4", "1/2", "3/4"]],
  ] as const) {
    assert.deepEqual(
      new Set(
        makeAnswerChoices({
          ...base,
          answer: [...answer],
          choiceDenominator: denominator,
          answerInput: input,
        }),
      ),
      new Set(expected),
    );
  }
});

test("legacy quizzes keep their shared timer and old profiles receive defaults on a new mission", () => {
  const { session, id, repository } = setup(30, 5);
  const profiles = session.profiles;
  delete profiles[0].quizSettings;
  delete profiles[0].activeRun!.quizSettings;
  delete profiles[0].activeRun!.quiz!.timeLimitMs;
  profiles[0].activeRun!.quiz!.remainingMs = 30000;
  const restored = new RunSession(
    decodeProfiles(JSON.stringify(profiles)),
    repository,
  );
  const q = restored.profile(id).activeRun!.quiz!.questions[0];
  restored.submit(id, q.id, "999", 12000);
  assert.equal(restored.profile(id).activeRun!.quiz!.remainingMs, 18000);
  restored.start(id, "3");
  restored.finishWave(id, { hp: 100, salvage: 8, medkits: 1 });
  assert.equal(restored.profile(id).activeRun!.quiz!.timeLimitMs, 40000);
  assert.equal(restored.profile(id).activeRun!.quiz!.questions.length, 5);
});
