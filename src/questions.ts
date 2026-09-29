import { QUESTION_BANK, bankQuestion } from "./question-bank";
import type { Grade, Question } from "./types";

import { gcd, fraction } from "./numeric-answer";
export { parseNumericAnswer, isCorrect } from "./numeric-answer";

/** Stable options across rerenders, with exactly one numerically correct answer. */
export function makeAnswerChoices(question: Question): string[] {
  const [n, d] = fraction(...question.answer);
  // Preserve the task's units even when its answer simplifies (e.g. 5/10).
  const taskDenominator = question.choiceDenominator ?? d;
  const denominator = (d * taskDenominator) / gcd(d, taskDenominator);
  const numerator = n * (denominator / d);
  const candidates = new Map<string, [number, number]>();
  for (const offset of [0, -1, 1, -2, 2, -3, 3]) {
    if (numerator >= 0 && numerator + offset < 0) continue;
    const value = fraction(numerator + offset, denominator);
    candidates.set(value.join("/"), value);
    if (candidates.size === 4) break;
  }
  const choices = [...candidates.values()].map(([numerator, denominator]) => {
    if (denominator === 1) return String(numerator);
    if (question.answerInput !== "fraction") {
      let factor = denominator;
      while (factor % 2 === 0) factor /= 2;
      while (factor % 5 === 0) factor /= 5;
      if (factor === 1) return String(numerator / denominator);
    }
    return `${numerator}/${denominator}`;
  });
  const seed = [...question.id].reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    7,
  );
  const random = seeded(seed);
  for (let i = choices.length - 1; i > 0; i--) {
    const j = pickInt(random, 0, i);
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pickInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

/** Select fixed, attributed items; only their order changes between missions. */
export function makeQuestions(
  grade: Grade,
  wave: number,
  missionSeed: string,
  count = 5,
): Question[] {
  if (!Number.isInteger(count) || count < 1 || count > 20)
    throw new Error("Choose 1–20 questions per wave.");
  if (!Number.isInteger(wave) || wave < 1)
    throw new Error("Choose a valid wave.");
  const deck = QUESTION_BANK.filter((item) => item.grade === grade);
  if (deck.length < count)
    throw new Error("Not enough sourced questions for this grade.");
  const seed = [...`${missionSeed}-${grade}`].reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    7,
  );
  const random = seeded(seed);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = pickInt(random, 0, i);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const offset = (wave - 1) * count;
  return Array.from({ length: count }, (_, index) =>
    bankQuestion(deck[(offset + index) % deck.length]),
  );
}
