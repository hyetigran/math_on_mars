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
): Question {
  return {
    id: `q-${index}-${prompt.replace(/\W/g, "").slice(0, 10)}`,
    prompt,
    spoken: prompt,
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
        const a = pickInt(rand, 11, 49);
        const b = pickInt(rand, 11, 39);
        return q(
          i,
          `${(a / 10).toFixed(1)} + ${(b / 10).toFixed(1)} = ?`,
          fraction(a + b, 10),
          "Line up the decimal points.",
          `${(a / 10).toFixed(1)} plus ${(b / 10).toFixed(1)} equals ${((a + b) / 10).toFixed(1)}.`,
        );
      }
      const d1 = pickInt(rand, 2, 5);
      const d2 = pickInt(rand, 2, 5);
      return q(
        i,
        `1/${d1} + 1/${d2} = ?`,
        fraction(d1 + d2, d1 * d2),
        "Find a common denominator first.",
        `A common denominator is ${d1 * d2}; the sum is ${d1 + d2}/${d1 * d2}.`,
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
    );
  });
}
