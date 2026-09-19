import test from "node:test";
import assert from "node:assert/strict";
import {
  battleRenderSize,
  BATTLE_CENTER,
  BATTLE_PLAY_BOUNDS as bounds,
  BATTLE_WORLD,
  BATTLE_VIEW,
} from "../src/battle-world";
import { CombatSimulation, type CombatRulesOptions } from "../src/combat-rules";
import { moveEnemy, advanceEnemyProjectiles } from "../src/enemy-attacks";
import { splitEnemy } from "../src/overmind";
import { OVERMIND_BALANCE } from "../content/balance/enemies";
const options: CombatRulesOptions = {
  wave: 1,
  totalWaves: 10,
  difficulty: "standard",
  hp: 100,
  maxHp: 100,
  salvage: 0,
  medkits: 1,
  ammo: [],
  activeAmmoIds: [],
  modules: [],
  seed: 42,
};
function fixture(wave = 1) {
  const sim = new CombatSimulation({ ...options, wave });
  sim.state.spawnCooldownMs = 0;
  sim.advance(1000 / 60);
  sim.state.spawned = sim.state.spawnTotal;
  sim.state.enemies[0].speed = 0;
  sim.state.enemies[0].x = BATTLE_CENTER.x;
  sim.state.enemies[0].y = BATTLE_CENTER.y;
  sim.state.shotCooldownMs = 1e9;
  sim.state.bolts = [];
  sim.state.shots = [];
  return sim;
}
test("arena is two viewports wide and tall with walkable ground inside the fence", () => {
  assert.equal(BATTLE_WORLD.width, BATTLE_VIEW.width * 2);
  assert.equal(BATTLE_WORLD.height, BATTLE_VIEW.height * 2);
  assert.equal(bounds.right - bounds.left, 2371);
  assert.equal(bounds.bottom - bounds.top, 1185);
  assert.deepEqual(new CombatSimulation(options).state.marine, BATTLE_CENTER);
});
test("marine traverses the expanded world and stops inside all four edges", () => {
  const sim = fixture(4);
  for (let i = 0; i < 150; i++) sim.advance(100, { x: 1, y: 1 });
  assert.equal(sim.state.marine.x, bounds.right - 20);
  assert.equal(sim.state.marine.y, bounds.bottom - 20);
  const restored = new CombatSimulation({
    ...options,
    wave: 4,
    restore: sim.serialize(),
  });
  assert.deepEqual(restored.state.marine, sim.state.marine);
  for (let i = 0; i < 180; i++) restored.advance(100, { x: -1, y: -1 });
  assert.equal(restored.state.marine.x, bounds.left + 20);
  assert.equal(restored.state.marine.y, bounds.top + 20);
});
test("edge spawns stay within the arena and at least 360 units away from the marine", () => {
  for (let seed = 0; seed < 80; seed++) {
    const sim = new CombatSimulation({ ...options, seed });
    sim.state.marine = {
      x: seed % 2 ? bounds.left + 20 : bounds.right - 20,
      y: bounds.top + 20,
    };
    sim.state.spawnCooldownMs = 0;
    sim.advance(1000 / 60);
    const enemy = sim.state.enemies[0];
    assert.ok(enemy.x >= bounds.left && enemy.x <= bounds.right);
    assert.ok(enemy.y >= bounds.top && enemy.y <= bounds.bottom);
    assert.ok(
      Math.hypot(enemy.x - sim.state.marine.x, enemy.y - sim.state.marine.y) >=
        359,
    );
  }
});
test("player and enemy projectiles survive beyond the former screen boundaries", () => {
  const sim = fixture();
  sim.state.marine = { x: 1800, y: 1000 };
  sim.state.enemies[0].x = 2050;
  sim.state.enemies[0].y = 1000;
  sim.state.shotCooldownMs = 0;
  sim.advance(1000 / 60);
  assert.ok(sim.state.bolts.length > 0);
  assert.ok(sim.state.bolts[0].x > 1800);
  sim.state.enemyProjectiles = [
    { id: 1, x: 1700, y: 1000, vx: 180, vy: 0, damage: 10, remainingMs: 7000 },
  ];
  advanceEnemyProjectiles(sim.state, 100, 1);
  assert.equal(sim.state.enemyProjectiles.length, 1);
  sim.state.enemyProjectiles[0].x = BATTLE_WORLD.width - 1;
  advanceEnemyProjectiles(sim.state, 100, 1);
  assert.equal(sim.state.enemyProjectiles.length, 0);
});
test("chargers and spawned children respect the new arena edges", () => {
  const sim = fixture();
  const enemy = sim.state.enemies[0];
  Object.assign(enemy, {
    kind: "charger",
    x: bounds.right - 25,
    y: 1000,
    attack: { phase: "active", remainingMs: 550, dx: 1, dy: 0, hit: false },
  });
  moveEnemy(enemy, sim.state, 100, 1, 1);
  assert.equal(enemy.x, bounds.right - enemy.radius);
  const children = splitEnemy(enemy, sim.state);
  assert.ok(
    children.every(
      (e) => e.x > 960 && e.y > 540 && e.x <= bounds.right - e.radius,
    ),
  );
});
test("boss and marine start together near the arena center, inside one viewport", () => {
  const sim = new CombatSimulation({ ...options, wave: 10 });
  sim.state.spawnCooldownMs = 0;
  sim.advance(1000 / 60);
  const boss = sim.state.enemies[0];
  assert.ok(boss.boss);
  assert.equal(boss.x, BATTLE_CENTER.x);
  assert.equal(sim.state.marine.y, OVERMIND_BALANCE.marineSpawnY);
  assert.ok(Math.abs(sim.state.marine.y - boss.y) < BATTLE_VIEW.height / 2);
});

test("combat applies custom arena outlines to movement and spawn placement", async () => {
  const { canWalk } = await import("../src/camp-world");
  const boundaries = {
    version: 1 as const,
    outline: [
      { x: 800, y: 400 },
      { x: 1800, y: 400 },
      { x: 1800, y: 1100 },
      { x: 800, y: 1100 },
    ],
    blocked: [],
  };
  const sim = new CombatSimulation({ ...options, boundaries });
  sim.state.shotCooldownMs = 1e9;
  for (let i = 0; i < 400; i++) sim.advance(1000 / 60, { x: 1, y: 0 });
  assert.ok(sim.state.marine.x < 1800);
  assert.ok(sim.state.marine.x > 1790);
  assert.ok(sim.state.enemies.every((enemy) => canWalk(enemy, boundaries)));
});

test("battle backing canvas has a bounded pixel budget on large Retina screens", () => {
  for (const [width, height, dpr] of [
    [1920, 1080, 2],
    [3840, 2160, 2],
    [1440, 900, 2],
    [390, 844, 3],
  ]) {
    const size = battleRenderSize(width, height, dpr);
    assert.ok(size.width * size.height <= 1280 * 720 * 4);
    assert.ok(Math.abs(size.width / size.height - width / height) < 0.003);
  }
  assert.deepEqual(battleRenderSize(1920, 1080, 2), {
    width: 2560,
    height: 1440,
  });
  assert.deepEqual(battleRenderSize(1280, 720, 1), {
    width: 1280,
    height: 720,
  });
});
