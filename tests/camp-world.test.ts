import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  campCamera,
  CAMP_WIDTH,
  CAMP_HEIGHT,
  CAMP_SPAWN,
  CAMP_PORTAL,
  canWalk,
  facing,
  moveInCamp,
  nearPortal,
  type Point,
} from "../src/camp-world";

test("zoomed camera fills wide and portrait screens even at the world edges", () => {
  for (const [width, height] of [
    [1280, 720],
    [2560, 1080],
    [390, 844],
  ]) {
    for (const focus of [
      CAMP_SPAWN,
      CAMP_PORTAL,
      { x: 0, y: 0 },
      { x: CAMP_WIDTH, y: CAMP_HEIGHT },
    ]) {
      const { scale, offsetX, offsetY } = campCamera(width, height, focus);
      assert.ok(offsetX <= 0 && offsetY <= 0);
      assert.ok(offsetX + CAMP_WIDTH * scale >= width - 0.001);
      assert.ok(offsetY + CAMP_HEIGHT * scale >= height - 0.001);
      assert.ok(scale > Math.max(width / CAMP_WIDTH, height / CAMP_HEIGHT));
    }
  }
});

test("camp spawn and portal are reachable ground; roofs and scenery are blocked", () => {
  assert.ok(canWalk(CAMP_SPAWN));
  assert.ok(canWalk(CAMP_PORTAL));
  for (const point of [
    { x: 365, y: 544 },
    { x: 382, y: 293 },
    { x: 1171, y: 323 },
    { x: 780, y: 476 },
    { x: 1170, y: 665 },
    { x: 0, y: 0 },
  ])
    assert.equal(canWalk(point), false);
});

test("diagonal walking is normalized and large frame gaps cannot teleport the marine", () => {
  const straight = moveInCamp(CAMP_SPAWN, { x: 1, y: 0 }, 1 / 60);
  const diagonal = moveInCamp(CAMP_SPAWN, { x: 1, y: 1 }, 1 / 60);
  const distance = (point: { x: number; y: number }) =>
    Math.hypot(point.x - CAMP_SPAWN.x, point.y - CAMP_SPAWN.y);
  assert.ok(Math.abs(distance(straight) - distance(diagonal)) < 0.001);
  assert.ok(distance(moveInCamp(CAMP_SPAWN, { x: 1, y: 0 }, 10)) <= 8.251);
});

test("the path around the heater reaches the portal without crossing scenery", () => {
  let position = { ...CAMP_SPAWN };
  for (const target of [
    { x: 790, y: 560 },
    { x: 925, y: 560 },
    { x: 925, y: 365 },
    { x: 787, y: 365 },
    CAMP_PORTAL,
  ]) {
    for (
      let frame = 0;
      frame < 200 &&
      Math.hypot(position.x - target.x, position.y - target.y) > 3;
      frame++
    ) {
      position = moveInCamp(
        position,
        { x: target.x - position.x, y: target.y - position.y },
        1 / 60,
      );
      assert.ok(canWalk(position));
    }
    assert.ok(
      Math.hypot(position.x - target.x, position.y - target.y) < 4,
      JSON.stringify(position),
    );
  }
  assert.ok(nearPortal(position));
  assert.equal(nearPortal(CAMP_SPAWN), false);
});

test("movement cannot cross the heater and stationary input preserves position", () => {
  let position = { ...CAMP_SPAWN };
  for (let frame = 0; frame < 180; frame++)
    position = moveInCamp(position, { x: 0, y: -1 }, 1 / 60);
  assert.ok(position.y >= 548);
  assert.deepEqual(moveInCamp(position, { x: 0, y: 0 }, 1), position);
});

test("all eight inputs use the corresponding baked sprite direction", () => {
  for (const [x, y, expected] of [
    [0, -1, "n"],
    [1, -1, "ne"],
    [1, 0, "e"],
    [1, 1, "se"],
    [0, 1, "s"],
    [-1, 1, "sw"],
    [-1, 0, "w"],
    [-1, -1, "nw"],
  ] as const)
    assert.equal(facing(x, y), expected);
});

test("base camp uses cache-safe v005 unarmed sprites in every direction", () => {
  const animations = JSON.parse(
    readFileSync(
      "src/assets/characters/marine/runtime/marine-v005-r3.json",
      "utf8",
    ),
  ) as Array<{
    direction: string;
    image: string;
    source: string;
    idleSource: string;
    idleImage: string;
    jumpSource: string;
    jumpImage: string;
    runningJumpSource: string;
    runningJumpImage: string;
    frameCount: number;
    framePivots: Point[];
    idlePivot: Point;
    jumpFrameCount: number;
    jumpDisplayScale: number;
    jumpPivots: Point[];
    runningJumpFrameCount: number;
    runningJumpDisplayScale: number;
    runningJumpPivots: Point[];
  }>;
  assert.deepEqual(
    animations.map(({ direction }) => direction),
    ["n", "ne", "e", "se", "s", "sw", "w", "nw"],
  );
  for (const animation of animations) {
    assert.match(
      animation.source,
      /^src\/assets\/characters\/marine\/sprites\//,
    );
    assert.match(
      animation.idleSource,
      /^src\/assets\/characters\/marine\/sprites\//,
    );
    assert.match(animation.image, /^walk-v005-r3-/);
    assert.match(animation.idleImage, /^idle-v005-r3-/);
    assert.match(
      animation.jumpSource,
      /^src\/assets\/characters\/marine\/sprites\//,
    );
    assert.match(animation.jumpImage, /^jump-v005-r3-/);
    assert.match(
      animation.runningJumpSource,
      /^src\/assets\/characters\/marine\/sprites\//,
    );
    assert.match(animation.runningJumpImage, /^run-jump-v005-r3-/);
    assert.equal(animation.frameCount, 16);
    assert.equal(animation.framePivots.length, animation.frameCount);
    assert.equal(animation.jumpFrameCount, 10);
    assert.ok(animation.jumpDisplayScale > 1);
    assert.equal(animation.jumpPivots.length, animation.jumpFrameCount);
    assert.equal(animation.runningJumpFrameCount, 13);
    assert.equal(animation.runningJumpDisplayScale, animation.jumpDisplayScale);
    assert.equal(
      animation.runningJumpPivots.length,
      animation.runningJumpFrameCount,
    );
    assert.ok(animation.idlePivot.x >= 0 && animation.idlePivot.x <= 1);
    assert.ok(animation.idlePivot.y >= 0 && animation.idlePivot.y <= 1);
  }
  assert.match(
    readFileSync("src/assets/campAssets.ts", "utf8"),
    /marine-v005-r3\.json/,
  );
  assert.match(
    readFileSync("src/base-camp.ts", "utf8"),
    /event\.code === "Space"/,
  );
});
