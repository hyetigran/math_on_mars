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

function q(
  index: number,
  prompt: string,
  answer: [number, number],
  hint: string,
  explanation: string,
  visualCount?: number,
  answerInput: Question["answerInput"] = "number",
): Question {
  return {
    id: `q-${index}-${prompt.replace(/\W/g, "").slice(0, 10)}`,
    prompt,
    spoken: prompt,
    answerInput,
    answer,
    hint,
    explanation,
    visualCount,
  };
}

export function makeQuestions(
  grade: Grade,
  wave: number,
  profileSeed: string,
): Question[] {
  const seed = [...`${profileSeed}-${grade}-${wave}`].reduce(
    (sum, c) => (sum * 31 + c.charCodeAt(0)) >>> 0,
    7,
  );
  const rand = seeded(seed);
  return Array.from({ length: 5 }, (_, i) => {
    if (grade === "K") {
      const n = pickInt(rand, 0, 10);
      if (i === 1) {
        const other = ((n + pickInt(rand, 1, 9) - 1) % 10) + 1;
        return {
          ...q(
            i,
            "Which group has more energy cells? Enter the larger number.",
            [Math.max(n, other), 1],
            "Count each group. Choose the number that is larger.",
            `${Math.max(n, other)} is greater than ${Math.min(n, other)}.`,
          ),
          visualGroups: [n, other],
          speechClips: ["compare"],
          hintClips: ["compare-hint"],
        };
      }
      if (i === 2) {
        const a = pickInt(rand, 0, 5),
          b = pickInt(rand, 0, 5 - a);
        return {
          ...q(
            i,
            "How many energy cells are in both groups altogether?",
            [a + b, 1],
            "Count the first group, then count on through the second group.",
            `${a} plus ${b} equals ${a + b}.`,
          ),
          visualGroups: [a, b],
          speechClips: ["compose"],
          hintClips: ["compose-hint"],
        };
      }
      if (i === 3) {
        const total = pickInt(rand, 0, 5),
          removed = pickInt(rand, 0, total);
        return {
          ...q(
            i,
            `${total} cells started. ${removed} were taken away. How many remain?`,
            [total - removed, 1],
            "Count the starting cells. Remove the cells taken away. Count what is left.",
            `${total} minus ${removed} equals ${total - removed}.`,
          ),
          visualGroups: [total, removed],
          visualGroupLabels: ["Starting cells", "Taken away"],
          speechClips: [
            "started",
            `n${total}`,
            "take-away",
            `n${removed}`,
            "remain",
          ],
          hintClips: ["decompose-hint"],
        };
      }
      return {
        ...q(
          i,
          "How many energy cells are there?",
          [n, 1],
          "Touch each cell once as you count.",
          `There are ${n} energy cells.`,
          n,
        ),
        speechClips: ["count"],
        hintClips: ["count-hint"],
      };
    }
    if (grade === "1") {
      const a = pickInt(rand, 2, 12);
      const b = pickInt(rand, 1, Math.min(8, 20 - a));
      if (i % 3 === 2)
        return {
          ...q(
            i,
            `${a} + ? = ${a + b}`,
            [b, 1],
            `Count up from ${a} to ${a + b}.`,
            `${a} plus ${b} equals ${a + b}.`,
          ),
          spoken: `What number added to ${a} makes ${a + b}?`,
          speechClips: ["missing", `n${a}`, "makes", `n${a + b}`],
          hintClips: ["missing-hint"],
        };
      if (i % 3 === 1)
        return {
          ...q(
            i,
            `${a + b} − ${a} = ?`,
            [b, 1],
            `Start at ${a + b} and count back ${a}.`,
            `${a + b} minus ${a} equals ${b}.`,
          ),
          spoken: `What is ${a + b} minus ${a}?`,
          speechClips: ["what", `n${a + b}`, "minus", `n${a}`],
          hintClips: ["subtract-hint"],
        };
      return {
        ...q(
          i,
          `${a} + ${b} = ?`,
          [a + b, 1],
          `Start at ${a} and count on ${b}.`,
          `${a} plus ${b} equals ${a + b}.`,
        ),
        spoken: `What is ${a} plus ${b}?`,
        speechClips: ["what", `n${a}`, "plus", `n${b}`],
        hintClips: ["add-hint"],
      };
    }
    if (grade === "2") {
      if (i === 2) {
        const value = pickInt(rand, 10, 99);
        const tens = Math.floor(value / 10);
        return q(
          i,
          `What is the value of the digit ${tens} in the tens place of ${value}?`,
          [tens * 10, 1],
          "The tens digit counts groups of ten.",
          `${value} has ${tens} tens and ${value % 10} ones. The digit ${tens} in the tens place is worth ${tens * 10}.`,
        );
      }
      if (i === 4) {
        const tens = pickInt(rand, 0, 9),
          ones = pickInt(rand, 0, 9);
        return q(
          i,
          `${tens} tens and ${ones} ones make what number?`,
          [tens * 10 + ones, 1],
          "Each ten is worth 10. Add the ones.",
          `${tens} tens is ${tens * 10}; adding ${ones} ones makes ${tens * 10 + ones}.`,
        );
      }
      const a = pickInt(rand, 0, 100);
      const subtract = i % 2 === 1;
      const b = pickInt(rand, 0, subtract ? a : 100 - a);
      return subtract
        ? q(
            i,
            `${a} − ${b} = ?`,
            [a - b, 1],
            "Subtract the tens, then the ones. Regroup a ten if needed.",
            `${a} minus ${b} equals ${a - b}.`,
          )
        : q(
            i,
            `${a} + ${b} = ?`,
            [a + b, 1],
            "Add the ones and tens. Regroup ten ones as one ten if needed.",
            `${a} plus ${b} equals ${a + b}.`,
          );
    }
    if (grade === "3") {
      const a = pickInt(rand, 1, 10);
      const b = pickInt(rand, 0, 10);
      return i % 2
        ? q(
            i,
            `${a * b} ÷ ${a} = ?`,
            [b, 1],
            `Think: ${a} times what equals ${a * b}?`,
            `${a * b} divided by ${a} equals ${b}.`,
          )
        : q(
            i,
            `${a} × ${b} = ?`,
            [a * b, 1],
            `Use ${a} groups of ${b}.`,
            `${a} times ${b} equals ${a * b}.`,
          );
    }
    if (grade === "4") {
      if (i === 2) {
        const denominator = pickInt(rand, 2, 10);
        const numerator = pickInt(rand, 1, denominator - 1);
        const scale = pickInt(rand, 2, 5);
        return q(
          i,
          `Complete the equivalent fraction: ${numerator}/${denominator} = ?/${denominator * scale}. Enter the missing numerator.`,
          [numerator * scale, 1],
          `The denominator was multiplied by ${scale}. Multiply the numerator by the same number.`,
          `${numerator}/${denominator} equals ${numerator * scale}/${denominator * scale}, because both parts were multiplied by ${scale}.`,
        );
      }
      if (i % 2) {
        const d = pickInt(rand, 3, 8);
        const a = pickInt(rand, 1, d - 1);
        const b = pickInt(rand, 1, d - a);
        return q(
          i,
          `${a}/${d} + ${b}/${d} = ?`,
          fraction(a + b, d),
          "Keep the denominator and add the numerators.",
          `${a} plus ${b} is ${a + b}, so the answer is ${a + b}/${d}.`,
          undefined,
          "fraction",
        );
      }
      const a = pickInt(rand, 12, 35);
      const b = pickInt(rand, 3, 9);
      return q(
        i,
        `${a} × ${b} = ?`,
        [a * b, 1],
        "Break the larger factor into tens and ones.",
        `${a} times ${b} equals ${a * b}.`,
      );
    }
    if (grade === "5") {
      if (i % 2) {
        const first = pickInt(rand, 11, 49),
          second = pickInt(rand, 11, 39);
        const subtract = i === 3;
        const a = subtract ? Math.max(first, second) : first;
        const b = subtract ? Math.min(first, second) : second;
        const result = subtract ? a - b : a + b;
        return q(
          i,
          `${(a / 10).toFixed(1)} ${subtract ? "−" : "+"} ${(b / 10).toFixed(1)} = ?`,
          fraction(result, 10),
          "Line up the decimal points and work in tenths.",
          `${a} tenths ${subtract ? "minus" : "plus"} ${b} tenths is ${result} tenths, or ${(result / 10).toFixed(1)}.`,
        );
      }
      let d1 = pickInt(rand, 2, 9);
      let d2 = 2 + ((d1 - 2 + pickInt(rand, 1, 7)) % 8);
      let n1 = pickInt(rand, 1, d1 - 1),
        n2 = pickInt(rand, 1, d2 - 1);
      const subtract = i === 2;
      if (subtract && n1 * d2 < n2 * d1) {
        [n1, n2] = [n2, n1];
        [d1, d2] = [d2, d1];
      }
      const result = n1 * d2 + (subtract ? -n2 * d1 : n2 * d1);
      return q(
        i,
        `${n1}/${d1} ${subtract ? "−" : "+"} ${n2}/${d2} = ?`,
        fraction(result, d1 * d2),
        "Find a common denominator first.",
        `Rewrite the fractions as ${n1 * d2}/${d1 * d2} and ${n2 * d1}/${d1 * d2}. ${subtract ? "Subtract" : "Add"} the numerators to get ${result}/${d1 * d2}.`,
        undefined,
        "fraction",
      );
    }
    if (i === 4) {
      const fuel = pickInt(rand, 1, 6),
        coolant = pickInt(rand, 1, 6),
        scale = pickInt(rand, 2, 6);
      return q(
        i,
        `Fuel and coolant use the ratio ${fuel}:${coolant}. For ${fuel * scale} fuel cells, how many coolant cells?`,
        [coolant * scale, 1],
        `Multiply both parts of the ratio by the same number.`,
        `${fuel * scale} is ${scale} times ${fuel}, so coolant is ${scale} times ${coolant}, or ${coolant * scale}.`,
      );
    }
    if (i === 3) {
      const x = pickInt(rand, 2, 12),
        factor = pickInt(rand, 2, 9);
      return q(
        i,
        `${factor} × x = ${factor * x}. x = ?`,
        [x, 1],
        `Undo multiplication by dividing both sides by ${factor}.`,
        `${factor * x} divided by ${factor} is ${x}, so x equals ${x}.`,
      );
    }
    if (i % 3 === 0) {
      const x = pickInt(rand, 2, 12);
      const add = pickInt(rand, 2, 9);
      return q(
        i,
        `x + ${add} = ${x + add}.  x = ?`,
        [x, 1],
        `Undo plus ${add} by subtracting ${add}.`,
        `Subtract ${add} from both sides, so x equals ${x}.`,
      );
    }
    if (i % 3 === 1) {
      const units = pickInt(rand, 2, 6);
      const value = pickInt(rand, 2, 9);
      return q(
        i,
        `${units} fuel cells cost ${units * value} credits. Cost per cell?`,
        [value, 1],
        `Divide ${units * value} by ${units}.`,
        `The unit rate is ${value} credits per cell.`,
      );
    }
    const d1 = pickInt(rand, 2, 5);
    const d2 = pickInt(rand, 2, 5);
    return q(
      i,
      `1/${d1} ÷ 1/${d2} = ?`,
      fraction(d2, d1),
      "Multiply by the reciprocal of the second fraction.",
      `1/${d1} times ${d2}/1 equals ${d2}/${d1}.`,
      undefined,
      "fraction",
    );
  });
}
