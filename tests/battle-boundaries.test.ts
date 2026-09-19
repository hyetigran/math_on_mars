import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultBattleBoundaries,
  validateBattleBoundaries,
  moveInBattle,
  placeInBattle,
} from "../src/battle-boundaries";
import { BATTLE_CENTER } from "../src/battle-world";
import { canWalk } from "../src/camp-world";

test("arena editor validates geometry in arena coordinates and protects spawn", () => {
  const layout = defaultBattleBoundaries();
  assert.equal(validateBattleBoundaries(layout), null);
  layout.blocked.push([
    { x: 1100, y: 500 },
    { x: 1400, y: 500 },
    { x: 1400, y: 900 },
    { x: 1100, y: 900 },
  ]);
  assert.match(validateBattleBoundaries(layout)!, /spawn/);
  layout.blocked = [];
  layout.outline[0].x = -1;
  assert.match(validateBattleBoundaries(layout)!, /inside the image/);
});
test("custom boundaries stop movement across thin walls and recover outside actors", () => {
  const layout = defaultBattleBoundaries();
  layout.blocked.push([
    { x: 500, y: 200 },
    { x: 503, y: 200 },
    { x: 503, y: 1000 },
    { x: 500, y: 1000 },
  ]);
  const next = moveInBattle({ x: 490, y: 400 }, { x: 520, y: 420 }, layout);
  assert.ok(next.x < 500);
  assert.ok(Math.abs(next.y - 420) < 1e-6);
  const placed = placeInBattle({ x: 501, y: 450 }, layout);
  assert.ok(canWalk(placed, layout));
  assert.deepEqual(placeInBattle(BATTLE_CENTER, layout), BATTLE_CENTER);
});
