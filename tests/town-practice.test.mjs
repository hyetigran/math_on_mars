import test from "node:test";
import assert from "node:assert/strict";
import { initializeTown, applyTownCommand } from "../server/town-model.mjs";
import {
  practiceTopics,
  practiceBank,
  practiceSummary,
} from "../server/town-practice.mjs";
const town = () =>
  initializeTown({ version: 1, houseLevel: 1, houseCapacity: 2, adults: 2 }, 0);
const answer = (q) => q.answer.join("/");
test("eligible bank sets require corrections and award full saved credit exactly once", () => {
  const s = town(),
    topic = practiceTopics[0];
  assert.throws(
    () => applyTownCommand(s, { action: "begin-practice", topic: topic.id }, 0),
    /eligible/,
  );
  applyTownCommand(s, { action: "set-topics", topics: [topic.id] }, 0);
  applyTownCommand(s, { action: "begin-practice", topic: topic.id }, 0);
  const p = s.practiceAttempts[s.currentPracticeId];
  assert.equal(p.reward, Math.min(5, topic.count) * 240000);
  const first = practiceBank.find((q) => q.id === p.questionIds[0]);
  applyTownCommand(
    s,
    {
      action: "answer-practice",
      attemptId: p.id,
      questionId: first.id,
      value: "999999",
    },
    0,
  );
  assert.equal(p.firstAttempts[first.id], false);
  assert.equal(s.constructionCredit, 0);
  for (const id of p.questionIds)
    applyTownCommand(
      s,
      {
        action: "answer-practice",
        attemptId: p.id,
        questionId: id,
        value: answer(practiceBank.find((q) => q.id === id)),
      },
      0,
    );
  assert.equal(s.constructionCredit, p.reward);
  assert.equal(p.completed, true);
  assert.equal(p.firstAttempts[first.id], false);
  assert.throws(
    () =>
      applyTownCommand(
        s,
        {
          action: "answer-practice",
          attemptId: p.id,
          questionId: first.id,
          value: answer(first),
        },
        0,
      ),
    /awaiting/,
  );
  const restored = initializeTown(JSON.parse(JSON.stringify(s)), 999999999);
  assert.equal(restored.constructionCredit, p.reward);
  assert.equal(
    practiceSummary(s).attempt.questions[0].source.author,
    "Illustrative Mathematics",
  );
  assert.equal("answer" in practiceSummary(s).attempt.questions[0], false);
});
test("short topics normalize credit and cycle distinct bank questions before repeats", () => {
  const s = town(),
    topic = practiceTopics.find((t) => t.count < 5);
  applyTownCommand(s, { action: "set-topics", topics: [topic.id] }, 0);
  for (let n = 0; n < 2; n++) {
    applyTownCommand(s, { action: "begin-practice", topic: topic.id }, 0);
    const p = s.practiceAttempts[s.currentPracticeId];
    assert.equal(p.reward, topic.count * 240000);
    assert.equal(p.repeated, n > 0);
    assert.equal(new Set(p.questionIds).size, topic.count);
    for (const id of p.questionIds)
      applyTownCommand(
        s,
        {
          action: "answer-practice",
          attemptId: p.id,
          questionId: id,
          value: answer(practiceBank.find((q) => q.id === id)),
        },
        0,
      );
  }
  assert.equal(s.constructionCredit, 2 * topic.count * 240000);
  assert.throws(
    () =>
      applyTownCommand(
        s,
        { action: "set-topics", topics: ["missing-topic"] },
        0,
      ),
    /topic/,
  );
});
