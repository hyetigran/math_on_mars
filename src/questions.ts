import { QUESTION_BANK, bankQuestion } from "./question-bank";
import type { Grade, Question } from "./types";

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

function fraction(n: number, d = 1): [number, number] {
  const sign = d < 0 ? -1 : 1;
  const g = gcd(n, d);
  return [(n / g) * sign, Math.abs(d) / g];
}

export function parseNumericAnswer(value: string): [number, number] | null {
  const clean = value.trim();
  if (!clean || clean.length > 18) return null;
  if (/^-?\d+\/\d+$/.test(clean)) {
    const [n, d] = clean.split("/").map(Number);
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0)
      return null;
    return fraction(n, d);
  }
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(clean)) {
    const negative = clean.startsWith("-");
    const unsigned = negative ? clean.slice(1) : clean;
    const [whole, decimals = ""] = unsigned.split(".");
    const d = 10 ** decimals.length;
    const n = Number(whole || 0) * d + Number(decimals || 0);
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) return null;
    return fraction(negative ? -n : n, d);
  }
  return null;
}

export function isCorrect(value: string, expected: [number, number]): boolean {
  const parsed = parseNumericAnswer(value);
  return !!parsed && parsed[0] * expected[1] === expected[0] * parsed[1];
}

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
