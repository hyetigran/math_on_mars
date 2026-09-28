import test from "node:test";
import assert from "node:assert/strict";
import { QUESTION_BANK, bankQuestion } from "../src/question-bank";
import {
  makeQuestions,
  makeAnswerChoices,
  isCorrect,
  parseNumericAnswer,
} from "../src/questions";
import type { Grade } from "../src/types";

const grades: Grade[] = ["K", "1", "2", "3", "4", "5"];

test("every fixed bank item has traceable provenance and four nearby distinct choices", () => {
  assert.equal(
    new Set(QUESTION_BANK.map((q) => q.id)).size,
    QUESTION_BANK.length,
  );
  for (const item of QUESTION_BANK) {
    const q = bankQuestion(item);
    assert.ok(
      q.source!.url.startsWith("https://im.kendallhunt.com/k5/teachers/"),
    );
    assert.equal(q.source!.license, "CC BY 4.0");
    for (const value of [
      item.skill,
      item.source.original,
      item.source.changes,
      item.source.problem,
    ])
      assert.ok(value.length > 0);
    const choices = makeAnswerChoices(q);
    assert.equal(choices.length, 4);
    assert.equal(
      choices.filter((value) => isCorrect(value, q.answer)).length,
      1,
    );
    const values = choices.map((value) => parseNumericAnswer(value)!);
    assert.equal(new Set(values.map(([n, d]) => `${n}/${d}`)).size, 4);
    for (const [n, d] of values) {
      assert.ok(n >= 0);
      assert.ok(
        Math.abs(n / d - q.answer[0] / q.answer[1]) <=
          3 / q.choiceDenominator! + 1e-10,
      );
    }
  }
});

test("all grades exhaust their fixed deck before repeating and support 20 distinct questions", () => {
  for (const grade of grades) {
    const bank = QUESTION_BANK.filter((q) => q.grade === grade);
    assert.ok(bank.length >= 20);
    const deck = bank.map(
      (_, i) => makeQuestions(grade, i + 1, "bank-audit", 1)[0],
    );
    assert.deepEqual(
      new Set(deck.map((q) => q.id)),
      new Set(bank.map((q) => q.id)),
    );
    assert.deepEqual(
      makeQuestions(grade, bank.length + 1, "bank-audit", 1)[0],
      deck[0],
    );
    for (let count = 1; count <= 20; count++) {
      const wave = makeQuestions(grade, 3, "bank-audit", count);
      assert.equal(new Set(wave.map((q) => q.id)).size, count);
      for (const q of wave)
        assert.deepEqual(
          q,
          bankQuestion(bank.find((item) => item.id === q.id)!),
        );
    }
  }
});

test("printed arithmetic and missing-number equations agree with bank answers", () => {
  const numeric = "(?:\\d+ \\d+/\\d+|\\d+/\\d+|\\d+(?:\\.\\d+)?)";
  const operand = `(${numeric}|\\?)`;
  const equation = new RegExp(`^${operand} ([+−×÷]) ${operand} = ${operand}$`);
  const value = (text: string): number => {
    if (text.includes(" ")) {
      const [whole, part] = text.split(" ");
      return Number(whole) + value(part);
    }
    if (text.includes("/")) {
      const [n, d] = text.split("/").map(Number);
      return n / d;
    }
    return Number(text);
  };
  let checked = 0;
  for (const item of QUESTION_BANK) {
    let prompt = item.prompt.replace(/^What is /, "").replace(/\?$/, " = ?");
    // Restore an equation's existing unknown marker.
    prompt = prompt.replace(/=  = \?$/, "= ?");
    const match = equation.exec(prompt);
    if (!match || match.slice(1).filter((x) => x === "?").length !== 1)
      continue;
    const [, left, op, right, result] = match;
    const apply = (a: number, b: number) =>
      op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : a / b;
    const answer = item.answer[0] / item.answer[1];
    const actual = apply(
      left === "?" ? answer : value(left),
      right === "?" ? answer : value(right),
    );
    const expected = result === "?" ? answer : value(result);
    assert.ok(Math.abs(actual - expected) < 1e-9, item.id);
    checked++;
  }
  assert.ok(checked >= 60, `Only ${checked} printed equations checked`);
});
