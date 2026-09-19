import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultBoundaries,
  validateBoundaries,
  loadBoundaries,
  BOUNDARIES_KEY,
} from "../src/camp-boundaries";
import { CAMP_SPAWN, canWalk, moveInCamp } from "../src/camp-world";

test("editable defaults keep spawn and portal walkable", () => {
  assert.equal(validateBoundaries(defaultBoundaries()), null);
  const first = defaultBoundaries();
  first.outline[0].x = 0;
  assert.notEqual(defaultBoundaries().outline[0].x, 0);
});

test("custom drawn shapes control walking and collision", () => {
  const layout = defaultBoundaries();
  layout.blocked = [
    [
      { x: 795, y: 600 },
      { x: 820, y: 600 },
      { x: 820, y: 640 },
      { x: 795, y: 640 },
    ],
  ];
  assert.equal(validateBoundaries(layout), null);
  assert.equal(canWalk({ x: 800, y: 616 }, layout), false);
  assert.deepEqual(
    moveInCamp(CAMP_SPAWN, { x: 1, y: 0 }, 0.05, layout),
    CAMP_SPAWN,
  );
  layout.blocked = [];
  assert.ok(
    moveInCamp(CAMP_SPAWN, { x: 1, y: 0 }, 0.05, layout).x > CAMP_SPAWN.x,
  );
});

test("invalid imported shapes cannot replace playable boundaries", () => {
  for (const value of [
    null,
    {},
    { version: 2 },
    { version: 1, outline: [], blocked: [] },
  ])
    assert.ok(validateBoundaries(value));
  const layout = defaultBoundaries();
  layout.blocked = [
    [
      { x: 700, y: 600 },
      { x: 850, y: 650 },
      { x: 850, y: 600 },
      { x: 700, y: 650 },
    ],
  ];
  assert.match(validateBoundaries(layout)!, /cross/);
  layout.blocked = [
    [
      { x: 700, y: 600 },
      { x: 850, y: 600 },
      { x: 850, y: 650 },
      { x: 700, y: 650 },
    ],
  ];
  assert.match(validateBoundaries(layout)!, /spawn/);
  layout.blocked = [];
  layout.outline[0].x = NaN;
  assert.match(validateBoundaries(layout)!, /inside/);
});

test("saved layouts load, while corrupt or unavailable storage falls back safely", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let raw = JSON.stringify(defaultBoundaries());
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem(key: string) {
        assert.equal(key, BOUNDARIES_KEY);
        return raw;
      },
    },
  });
  try {
    assert.deepEqual(loadBoundaries(), defaultBoundaries());
    raw = "broken";
    assert.equal(loadBoundaries(), undefined);
    raw = "{}";
    assert.equal(loadBoundaries(), undefined);
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("denied");
      },
    });
    assert.equal(loadBoundaries(), undefined);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
