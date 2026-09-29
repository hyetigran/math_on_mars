import lower from "../content/questions/im-lower.json" with { type: "json" };
import upper from "../content/questions/im-upper.json" with { type: "json" };
import attribution from "../content/questions/attribution.json" with { type: "json" };
import { isCorrect } from "../src/numeric-answer.ts";
import { randomUUID } from "node:crypto";
import { requireRule } from "./town-rules.mjs";
export const practiceBank = [...lower, ...upper];
export const practiceTopics = [
  ...new Set(practiceBank.map((q) => `${q.grade}:${q.skill}`)),
].map((id) => {
  const pool = practiceBank.filter((q) => `${q.grade}:${q.skill}` === id);
  return {
    id,
    grade: pool[0].grade,
    skill: pool[0].skill,
    count: pool.length,
    reward: Math.min(5, pool.length) * 240000,
  };
});
export function initializePractice(s) {
  if (s.version < 5)
    Object.assign(s, {
      version: 5,
      eligibleTopics: [],
      constructionCredit: 0,
      practiceCursors: {},
      practiceAttempts: {},
      currentPracticeId: null,
    });
}
export function practiceSummary(s) {
  const attempt = s.practiceAttempts[s.currentPracticeId];
  return {
    topics: practiceTopics,
    eligibleTopics: s.eligibleTopics,
    credit: s.constructionCredit,
    attempt: attempt
      ? {
          ...attempt,
          questions: attempt.questionIds.map((id) => {
            const q = practiceBank.find((q) => q.id === id);
            return {
              id,
              prompt: q.prompt,
              hint: q.hint,
              answerInput: q.answerInput,
              explanation: attempt.corrected.includes(id)
                ? q.explanation
                : null,
              source: { ...attribution, ...q.source },
            };
          }),
        }
      : null,
  };
}
export function applyPracticeCommand(s, input) {
  if (input.action === "set-topics") {
    requireRule(
      Array.isArray(input.topics) &&
        input.topics.length <= practiceTopics.length &&
        input.topics.every((id) => practiceTopics.some((t) => t.id === id)),
      "Choose valid eligible topics",
    );
    s.eligibleTopics = [...new Set(input.topics)];
  } else if (input.action === "begin-practice") {
    requireRule(
      s.eligibleTopics.includes(input.topic),
      "Choose an eligible topic",
    );
    requireRule(
      !s.currentPracticeId || s.practiceAttempts[s.currentPracticeId].completed,
      "Finish the current practice set first",
    );
    const topic = practiceTopics.find((t) => t.id === input.topic),
      pool = practiceBank.filter(
        (q) => `${q.grade}:${q.skill}` === input.topic,
      );
    const cursor = s.practiceCursors[input.topic] ?? 0,
      count = Math.min(5, pool.length);
    const questionIds = Array.from(
      { length: count },
      (_, i) => pool[(cursor + i) % pool.length].id,
    );
    const id = randomUUID();
    s.practiceAttempts[id] = {
      id,
      topic: input.topic,
      questionIds,
      reward: topic.reward,
      repeated: cursor + count > pool.length,
      firstAttempts: {},
      corrected: [],
      completed: false,
    };
    s.practiceCursors[input.topic] = cursor + count;
    s.currentPracticeId = id;
  } else if (input.action === "answer-practice") {
    const p = Object.hasOwn(s.practiceAttempts, input.attemptId)
      ? s.practiceAttempts[input.attemptId]
      : null;
    requireRule(
      p &&
        !p.completed &&
        p.questionIds.includes(input.questionId) &&
        !p.corrected.includes(input.questionId),
      "Question is not awaiting an answer",
    );
    requireRule(
      typeof input.value === "string" && input.value.length <= 18,
      "Enter a number or fraction",
    );
    const question = practiceBank.find((q) => q.id === input.questionId),
      correct = isCorrect(input.value, question.answer);
    if (!Object.hasOwn(p.firstAttempts, question.id))
      p.firstAttempts[question.id] = correct;
    if (correct) p.corrected.push(question.id);
    if (p.corrected.length === p.questionIds.length) {
      p.completed = true;
      s.constructionCredit += p.reward;
    }
  } else return false;
  return true;
}
