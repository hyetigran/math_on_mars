import test from "node:test";
import assert from "node:assert/strict";
import { CombatSimulation, COMBAT_STEP_MS as STEP } from "../src/combat-rules";
import {
  CombatInterpolation,
  combatCameraLerp,
} from "../src/combat-interpolation";

function simulation(): CombatSimulation {
  const sim = new CombatSimulation({
    wave: 1,
    totalWaves: 10,
    difficulty: "standard",
    hp: 100,
    maxHp: 100,
    salvage: 0,
    medkits: 0,
    ammo: [],
    activeAmmoIds: [],
    modules: [],
    seed: 42,
  });
  sim.state.spawnCooldownMs = sim.state.shotCooldownMs = 1e9;
  return sim;
}

test("catch-up frames interpolate the last two steps without changing gameplay or saves", () => {
  const sim = simulation(),
    control = simulation();
  const view = new CombatInterpolation(sim.state);
  const start = sim.state.marine.x;
  sim.advance(STEP * 2.5, { x: 1, y: 0 }, view.capture);
  control.advance(STEP * 2.5, { x: 1, y: 0 });
  assert.ok(
    Math.abs(
      view.marine(view.alpha).x - (start + (sim.moveSpeed * STEP * 1.5) / 1000),
    ) < 1e-8,
  );
  for (let i = 0; i < 10; i++) view.marine(view.alpha);
  assert.deepEqual(sim.serialize(), control.serialize());
});

test("enemy and both projectile types interpolate actual simulation movement", () => {
  const sim = simulation();
  sim.state.enemies.push({
    id: 1,
    x: 1500,
    y: 900,
    speed: 100,
    hp: 1000,
    maxHp: 1000,
    radius: 24,
    boss: false,
    slowRemainingMs: 0,
    slowAmount: 0,
    burnRemainingDamage: 0,
    burnRate: 0,
  });
  sim.state.bolts.push({
    id: 1,
    shotId: 1,
    x: 1100,
    y: 600,
    vx: 120,
    vy: 0,
    damage: 1,
    pierce: 0,
    hitIds: [],
  });
  sim.state.enemyProjectiles = [
    { id: 1, x: 1000, y: 500, vx: 100, vy: 0, damage: 1, remainingMs: 5000 },
  ];
  const view = new CombatInterpolation(sim.state);
  const entities = [
    sim.state.enemies[0],
    sim.state.bolts[0],
    sim.state.enemyProjectiles[0],
  ];
  const before = entities.map((e) => ({ x: e.x, y: e.y }));
  sim.advance(STEP * 1.5, { x: 0, y: 0 }, view.capture);
  assert.equal(sim.state.bolts.length, 1);
  assert.equal(sim.state.enemyProjectiles.length, 1);
  for (const [i, entity] of entities.entries()) {
    const position = view.entity(entity, view.alpha);
    assert.ok(Math.abs(position.x - (before[i].x + entity.x) / 2) < 1e-8);
    assert.ok(Math.abs(position.y - (before[i].y + entity.y) / 2) < 1e-8);
    assert.notEqual(position.x, before[i].x);
  }
});

test("new, restored, and replaced positions have no stale history or shared mutable poses", () => {
  const sim = simulation();
  const restored = new CombatSimulation({
    wave: 1,
    totalWaves: 10,
    difficulty: "standard",
    hp: 100,
    maxHp: 100,
    salvage: 0,
    medkits: 0,
    ammo: [],
    activeAmmoIds: [],
    modules: [],
    seed: 42,
    restore: sim.serialize(),
  });
  const view = new CombatInterpolation(restored.state);
  assert.deepEqual(view.marine(view.alpha), restored.state.marine);
  const old = { ...restored.state.marine };
  view.capture();
  // Custom-boundary movement replaces this object rather than mutating it.
  restored.state.marine = { x: old.x + 4, y: old.y - 2 };
  assert.deepEqual(view.marine(0.5), { x: old.x + 2, y: old.y - 1 });
  const newborn = { x: 123, y: 456 };
  assert.deepEqual(view.entity(newborn, 0.5), newborn);
  assert.deepEqual(view.marine(1), restored.state.marine);
  assert.deepEqual(old, sim.state.marine);
});

test("camera settles by the same amount over equal elapsed time at different refresh rates", () => {
  for (const hz of [30, 60, 90, 120, 144, 165]) {
    let distance = 100;
    for (let i = 0; i < hz; i++) distance *= 1 - combatCameraLerp(1000 / hz);
    assert.ok(Math.abs(distance - 100 * Math.pow(0.85, 60)) < 1e-8);
  }
  assert.equal(combatCameraLerp(0), 0);
  assert.ok(combatCameraLerp(1000) < 1);
});
