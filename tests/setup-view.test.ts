import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("mission setup stays grade-only", () => {
  const source = readFileSync("src/main.ts", "utf8");
  assert.doesNotMatch(source, /name="difficulty"/);
  assert.doesNotMatch(source, /name="mission"/);
  assert.doesNotMatch(source, /Choose your math track, combat difficulty/);
});
