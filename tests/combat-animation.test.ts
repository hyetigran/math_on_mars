import test from "node:test";
import assert from "node:assert/strict";
import { marineAnimation } from "../src/combat-aim";
test("retreating marine runs in travel direction instead of playing forward attack backwards", () => {
  assert.deepEqual(marineAnimation("w", "e", true, "e"), {
    direction: "w",
    motion: "run",
  });
  assert.deepEqual(marineAnimation("e", "e", true, "w"), {
    direction: "e",
    motion: "run-attack",
  });
  assert.deepEqual(marineAnimation(undefined, "e", true, "w"), {
    direction: "e",
    motion: "attack",
  });
});
