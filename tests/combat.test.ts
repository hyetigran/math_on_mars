import test from "node:test";
import assert from "node:assert/strict";
import {
  CombatSimulation,
  migrateCombatSave,
  type CombatRulesOptions,
} from "../src/combat-rules";
import type {
  CombatEnemySaveV2,
  CombatSaveV1,
  CombatShotSave,
} from "../src/types";

const STEP = 1000 / 60;
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
function enemy(id: number, x: number, y: number): CombatEnemySaveV2 {
  return {
    id,
    x,
    y,
    hp: 1000,
    maxHp: 1000,
    speed: 0,
    radius: 24,
    boss: false,
    slowRemainingMs: 0,
    slowAmount: 0,
    burnRemainingDamage: 0,
    burnRate: 0,
  };
}
function fixture(enemies: CombatEnemySaveV2[]): CombatSimulation {
  const sim = new CombatSimulation(options);
  sim.state.spawned = enemies.length;
  sim.state.spawnTotal = enemies.length;
  sim.state.enemies = enemies;
  sim.state.nextEnemyId = enemies.length + 1;
  sim.state.shotCooldownMs = 1e6;
  return sim;
}
function shot(overrides: Partial<CombatShotSave> = {}): CombatShotSave {
  return {
    id: 1,
    baseDamage: 18,
    chainRemaining: 0,
    chainStarted: false,
    chainVisited: [],
    burnFunds: 0,
    frost: 0,
    fiery: 0,
    ...overrides,
  };
}

test("automatic shots hit a southeast Drifter from the actual muzzle", () => {
  const sim = fixture([enemy(1, 680, 470)]);
  sim.state.shotCooldownMs = 0;
  for (let i = 0; i < 30; i++) sim.advance(STEP);
  assert.equal(sim.state.enemies[0].hp, 982);
});

test("five pellets share one chain and its four jumps follow the preceding target", () => {
  const sim = fixture(
    [530, 640, 750, 860, 970].map((x, i) => enemy(i + 1, x, 270)),
  );
  sim.state.shots = [shot({ chainRemaining: 4, frost: 4 })];
  sim.state.bolts = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    shotId: 1,
    x: 480,
    y: 270,
    vx: 5600,
    vy: 0,
    damage: 5.76,
    pierce: 0,
    hitIds: [],
  }));
  sim.advance(STEP);
  assert.ok(Math.abs(sim.state.enemies[0].hp - (1000 - 5 * 5.76)) < 1e-8);
  for (const target of sim.state.enemies.slice(1)) {
    assert.equal(target.hp, 996.4);
    assert.equal(target.slowRemainingMs, 2000);
  }
  assert.equal(sim.drainChainFlashes().length, 4);
});

test("a chain cannot bridge a gap larger than 120 world units", () => {
  const sim = fixture([enemy(1, 530, 270), enemy(2, 651, 270)]);
  sim.state.shots = [shot({ chainRemaining: 4 })];
  sim.state.bolts = [
    {
      id: 1,
      shotId: 1,
      x: 480,
      y: 270,
      vx: 5600,
      vy: 0,
      damage: 18,
      pierce: 0,
      hitIds: [],
    },
  ];
  sim.advance(STEP);
  assert.equal(sim.state.enemies[1].hp, 1000);
  assert.equal(sim.drainChainFlashes().length, 0);
});

test("burn damage across five pellets never exceeds one funded shot reservoir", () => {
  const sim = fixture(
    Array.from({ length: 5 }, (_, i) => enemy(i + 1, 150, 70 + i * 80)),
  );
  sim.state.shots = [shot({ fiery: 4, burnFunds: 16.2 })];
  sim.state.bolts = sim.state.enemies.map((target, i) => ({
    id: i + 1,
    shotId: 1,
    x: 100,
    y: target.y,
    vx: 5600,
    vy: 0,
    damage: 5.76,
    pierce: 0,
    hitIds: [],
  }));
  sim.advance(STEP);
  assert.ok(
    Math.abs(
      sim.state.enemies.reduce(
        (sum, target) => sum + target.burnRemainingDamage,
        0,
      ) - 16.2,
    ) < 1e-8,
  );
  const initialHp = sim.state.enemies.reduce(
    (sum, target) => sum + target.hp,
    0,
  );
  for (let i = 0; i < 181; i++) sim.advance(STEP);
  const finalHp = sim.state.enemies.reduce((sum, target) => sum + target.hp, 0);
  assert.ok(Math.abs(initialHp - finalHp - 16.2) < 1e-8);
  assert.equal(
    sim.state.enemies.reduce(
      (sum, target) => sum + target.burnRemainingDamage,
      0,
    ),
    0,
  );
});

test("an unfunded weak hit cannot refresh a pre-existing strong burn", () => {
  const target = enemy(1, 150, 70);
  target.burnRemainingDamage = 9;
  target.burnRate = 5;
  const sim = fixture([target]);
  sim.state.shots = [shot({ fiery: 1, burnFunds: 0 })];
  sim.state.bolts = [
    {
      id: 1,
      shotId: 1,
      x: 100,
      y: 70,
      vx: 5600,
      vy: 0,
      damage: 1,
      pierce: 0,
      hitIds: [],
    },
  ];
  sim.advance(STEP);
  assert.equal(target.burnRate, 5);
  assert.ok(Math.abs(target.burnRemainingDamage - (9 - 5 / 60)) < 1e-8);
});

test("mid-volley save restores shared budgets, burn reservoirs and fixed-step remainder", () => {
  const sim = fixture([enemy(1, 600, 270), enemy(2, 700, 270)]);
  sim.state.shots = [
    shot({ chainRemaining: 4, fiery: 4, frost: 4, burnFunds: 16.2 }),
  ];
  sim.state.bolts = [0, 1].map((i) => ({
    id: i + 1,
    shotId: 1,
    x: 400 - i * 50,
    y: 270,
    vx: 560,
    vy: 0,
    damage: 9,
    pierce: 4,
    hitIds: [],
  }));
  sim.state.nextBoltId = 3;
  sim.state.nextShotId = 2;
  sim.advance(7);
  for (let i = 0; i < 20; i++) sim.advance(STEP);
  assert.equal(sim.state.shots[0].chainStarted, true);
  assert.ok(sim.state.shots[0].burnFunds < 16.2);
  assert.ok(sim.state.enemies.some((target) => target.burnRemainingDamage > 0));
  const restored = new CombatSimulation({
    ...options,
    restore: sim.serialize(),
  });
  for (let i = 0; i < 90; i++) {
    sim.advance(STEP);
    restored.advance(STEP);
    assert.deepEqual(restored.serialize(), sim.serialize());
  }
});

test("version-one migration preserves old resources and burns without new legacy allowances", () => {
  const old: CombatSaveV1 = {
    version: 1,
    wave: 1,
    hp: 60,
    salvage: 7,
    medkits: 2,
    marine: { x: 300, y: 200 },
    spawned: 1,
    spawnTotal: 13,
    nextEnemyId: 2,
    rngState: 42,
    spawnCooldownMs: 100,
    shotCooldownMs: 50,
    enemies: [
      {
        id: 1,
        x: 600,
        y: 270,
        hp: 40,
        maxHp: 52,
        speed: 52,
        radius: 24,
        boss: false,
        slowRemainingMs: 500,
        slowAmount: 0.4,
        burnRemainingMs: 1200,
        burnDps: 5,
      },
    ],
    bolts: [
      {
        x: 400,
        y: 270,
        vx: 560,
        vy: 0,
        damage: 9,
        pierce: 3,
        hitIds: [],
        chain: 4,
        frost: 4,
        fiery: 4,
      },
    ],
  };
  const migrated = migrateCombatSave(old);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.hp, 60);
  assert.deepEqual(migrated.marine, old.marine);
  assert.equal(migrated.enemies[0].burnRemainingDamage, 6);
  assert.equal(migrated.enemies[0].slowRemainingMs, 500);
  assert.equal(migrated.shots[0].burnFunds, 0);
  assert.equal(migrated.shots[0].chainRemaining, 0);
  assert.equal(migrated.bolts[0].shotId, migrated.shots[0].id);
});

test("salvage stays on the ground until collected and remaining drops sweep on clear", () => {
  const sim = fixture([enemy(1, 100, 100), enemy(2, 800, 400)]);
  sim.state.enemies[0].hp = 0;
  sim.advance(STEP);
  assert.equal(sim.snapshot().salvage, 0);
  assert.equal(sim.serialize().pickups?.length, 1);
  const restored = new CombatSimulation({
    ...options,
    restore: sim.serialize(),
  });
  restored.state.marine = { x: 100, y: 100 };
  restored.advance(STEP);
  assert.equal(restored.snapshot().salvage, 1);
  restored.state.enemies[0].hp = 0;
  restored.advance(STEP);
  assert.equal(restored.outcome, "victory");
  assert.equal(restored.snapshot().salvage, 2);
  assert.deepEqual(restored.serialize().pickups, []);
});

test("secondary projectile speed and pickup radius modifiers affect combat", () => {
  const module = {
    id: "compound",
    name: "Compound",
    stat: "damage" as const,
    value: 0.1,
    quality: "purple" as const,
    additionalModifiers: [
      { stat: "projectileSpeed" as const, value: 0.5 },
      { stat: "pickupRadius" as const, value: 1 },
    ],
  };
  const sim = new CombatSimulation({ ...options, modules: [module] });
  sim.state.enemies = [enemy(1, 680, 270)];
  sim.state.spawned = 1;
  sim.state.nextEnemyId = 3;
  sim.state.pickups = [{ id: 2, x: 560, y: 270, value: 1 }];
  sim.advance(STEP);
  assert.equal(sim.snapshot().salvage, 1);
  assert.ok(
    Math.abs(Math.hypot(sim.state.bolts[0].vx, sim.state.bolts[0].vy) - 840) <
      1e-8,
  );
  assert.ok(Math.abs(sim.state.bolts[0].damage - 19.8) < 1e-8);
});

test("scheduled ammo contents and shuffle bag survive resume and wave-clear sweep", () => {
  const sim = fixture([
    enemy(1, 900, 500),
    enemy(2, 900, 500),
    enemy(3, 900, 500),
    enemy(4, 900, 500),
  ]);
  sim.state.enemies[3].hp = 0;
  sim.advance(STEP, { x: 0, y: 0 });
  const saved = sim.serialize();
  const drop = saved.pickups!.find((p) => p.id === 4)!;
  assert.ok(drop.ammo);
  assert.equal(saved.ammoInventory!.ammoBag!.length, 4);
  const resumed = new CombatSimulation({ ...options, restore: saved });
  assert.deepEqual(resumed.serialize(), saved);
  for (const target of resumed.state.enemies) target.hp = 0;
  resumed.advance(STEP, { x: 0, y: 0 });
  assert.equal(resumed.outcome, "victory");
  assert.deepEqual(resumed.snapshot().ammoInventory!.ammo, [drop.ammo]);
  assert.deepEqual(resumed.snapshot().ammoInventory!.activeAmmoIds, [
    drop.ammo!.id,
  ]);
  assert.equal(resumed.serialize().pickups!.length, 0);
});
