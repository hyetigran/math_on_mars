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

test("Piercing and Multi Shot combine at every tier without consuming cartridges", () => {
  for (const tier of [1, 2, 3, 4] as const) {
    const ammo = [
      { id: "piercing", type: "Piercing" as const, tier },
      { id: "multi", type: "Multi Shot" as const, tier },
    ];
    const sim = new CombatSimulation({
      ...options,
      ammo,
      activeAmmoIds: ["piercing", "multi"],
      ammoCapacity: 2,
    });
    sim.state.enemies = [enemy(1, 850, 270)];
    sim.state.spawned = 1;
    sim.state.spawnTotal = 1;
    sim.state.nextEnemyId = 2;
    sim.advance(STEP);
    assert.equal(sim.state.bolts.length, tier + 1);
    const total = sim.state.bolts.reduce((sum, bolt) => sum + bolt.damage, 0);
    assert.ok(Math.abs(total - 18 * [1.15, 1.3, 1.45, 1.6][tier - 1]) < 1e-8);
    assert.ok(sim.state.bolts.every((bolt) => bolt.pierce === tier));
    assert.deepEqual(sim.snapshot().ammoInventory!.ammo, ammo);
  }
});

test("every Electric Chain tier restores its in-flight budget and hits each nearby target once", () => {
  for (const tier of [1, 2, 3, 4] as const) {
    const settings = {
      ...options,
      ammo: [{ id: "chain", type: "Electric Chain" as const, tier }],
      activeAmmoIds: ["chain"],
    };
    const sim = new CombatSimulation(settings);
    sim.state.enemies = Array.from({ length: 6 }, (_, i) =>
      enemy(i + 1, 620 + i * 45, 270),
    );
    sim.state.spawned = 6;
    sim.state.spawnTotal = 6;
    sim.state.nextEnemyId = 7;
    sim.advance(STEP);
    assert.equal(sim.state.shots[0].chainRemaining, tier);
    assert.equal(sim.state.shots[0].chainStarted, false);
    sim.state.shotCooldownMs = 1e6;
    const restored = new CombatSimulation({
      ...settings,
      restore: sim.serialize(),
    });
    let flashes = 0;
    for (let i = 0; i < 25; i++) {
      sim.advance(STEP);
      restored.advance(STEP);
      flashes += restored.drainChainFlashes().length;
    }
    assert.deepEqual(restored.serialize(), sim.serialize());
    assert.equal(flashes, tier);
    assert.equal(restored.state.enemies[0].hp, 982);
    for (let i = 1; i <= tier; i++)
      assert.equal(restored.state.enemies[i].hp, 996.4);
    for (let i = tier + 1; i < 6; i++)
      assert.equal(restored.state.enemies[i].hp, 1000);
  }
});

test("Electric Chain adds no extra damage against an isolated boss", () => {
  const sim = fixture([{ ...enemy(1, 530, 270), boss: true }]);
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
  assert.equal(sim.state.enemies[0].hp, 982);
  assert.equal(sim.drainChainFlashes().length, 0);
});

test("Frost and Fiery tiers retain exact status reservoirs and tick progress across resume", () => {
  for (const tier of [1, 2, 3, 4] as const) {
    for (const boss of [false, true]) {
      const sim = fixture([{ ...enemy(1, 530, 270), boss }]);
      const budget = 18 * [0.3, 0.45, 0.6, 0.9][tier - 1];
      sim.state.shots = [shot({ frost: tier, fiery: tier, burnFunds: budget })];
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
      const target = sim.state.enemies[0];
      assert.equal(
        target.slowAmount,
        [0.2, 0.25, 0.3, 0.4][tier - 1] * (boss ? 0.5 : 1),
      );
      assert.equal(target.slowRemainingMs, 2000);
      assert.ok(Math.abs(target.burnRemainingDamage - budget) < 1e-8);
      sim.advance(7);
      const resumed = new CombatSimulation({
        ...options,
        restore: sim.serialize(),
      });
      for (let i = 0; i < 181; i++) {
        sim.advance(STEP);
        resumed.advance(STEP);
      }
      assert.deepEqual(resumed.serialize(), sim.serialize());
      assert.equal(resumed.state.enemies[0].slowRemainingMs, 0);
      assert.equal(resumed.state.enemies[0].burnRemainingDamage, 0);
      assert.ok(Math.abs(resumed.state.enemies[0].hp - (982 - budget)) < 1e-7);
    }
  }
});

test("Omni applies each effect once and capacity stabilizes firing rate only while equipped", () => {
  for (const capacity of [1, 2, 3, 4]) {
    const ammo = [
      {
        id: "omni",
        type: "Piercing" as const,
        tier: 4 as const,
        legendary: true,
      },
      { id: "normal", type: "Multi Shot" as const, tier: 4 as const },
    ];
    const sim = new CombatSimulation({
      ...options,
      ammo,
      ammoCapacity: capacity,
      activeAmmoIds: capacity > 1 ? ["omni", "normal"] : ["omni"],
    });
    assert.ok(
      Math.abs(sim.shotDelay - 520 / (1 + (capacity - 1) * 0.04)) < 1e-8,
    );
    sim.state.enemies = [enemy(1, 850, 270)];
    sim.state.spawned = 1;
    sim.state.spawnTotal = 1;
    sim.state.nextEnemyId = 2;
    sim.advance(STEP);
    assert.equal(sim.state.bolts.length, 5);
    assert.equal(sim.state.shots[0].chainRemaining, 4);
    assert.equal(sim.state.shots[0].frost, 4);
    assert.equal(sim.state.shots[0].fiery, 4);
    assert.ok(Math.abs(sim.state.shots[0].burnFunds - 16.2) < 1e-8);
    const ordinary = new CombatSimulation({
      ...options,
      ammo,
      ammoCapacity: capacity,
      activeAmmoIds: ["normal"],
    });
    assert.equal(ordinary.shotDelay, 520);
  }
});

test("each scheduled ammo bag cycle yields all five valid types before refilling", () => {
  for (const seed of [42, 1000, 12345, 999999]) {
    const sim = fixture(
      Array.from({ length: 20 }, (_, i) => ({
        ...enemy(i + 1, 900, 500),
        hp: 0,
      })),
    );
    sim.state.rngState = seed;
    sim.advance(STEP);
    const ammo = sim.snapshot().ammoInventory!.ammo;
    assert.equal(ammo.length, 5);
    assert.deepEqual(
      new Set(ammo.map((a) => a.type)),
      new Set(["Piercing", "Multi Shot", "Electric Chain", "Frost", "Fiery"]),
    );
    assert.ok(ammo.every((a) => a.tier >= 1 && a.tier <= 4));
  }
});

test("Charger retains its full warning and locked direction across mid-windup resume", () => {
  const sim = fixture([
    {
      ...enemy(1, 700, 270),
      kind: "charger",
      attack: { phase: "windup", remainingMs: 1200, dx: -1, dy: 0, hit: false },
    },
    enemy(2, 900, 500),
  ]);
  for (let i = 0; i < 60; i++) sim.advance(STEP);
  assert.equal(sim.state.enemies[0].x, 700);
  assert.equal(sim.state.enemies[0].attack!.phase, "windup");
  const restored = new CombatSimulation({
    ...options,
    restore: sim.serialize(),
  });
  for (let i = 0; i < 50; i++) {
    sim.advance(STEP);
    restored.advance(STEP);
  }
  assert.deepEqual(restored.serialize(), sim.serialize());
  assert.ok(restored.state.hp <= 82);
  assert.equal(restored.state.enemies[0].attack!.hit, true);
});

test("Spitter projectiles resume in flight and spend damage once", () => {
  const sim = fixture([
    {
      ...enemy(1, 700, 270),
      kind: "spitter",
      attack: { phase: "windup", remainingMs: 100, dx: -1, dy: 0, hit: false },
    },
    enemy(2, 900, 500),
  ]);
  for (let i = 0; i < 15; i++) sim.advance(STEP);
  assert.equal(sim.state.enemyProjectiles!.length, 1);
  const restored = new CombatSimulation({
    ...options,
    restore: sim.serialize(),
  });
  for (let i = 0; i < 90; i++) {
    sim.advance(STEP);
    restored.advance(STEP);
  }
  assert.deepEqual(restored.serialize(), sim.serialize());
  assert.equal(restored.state.hp, 90);
  assert.equal(restored.state.enemyProjectiles!.length, 0);
});

test("enemy projectiles are cleared on both wave victory and defeat", () => {
  for (const outcome of ["victory", "defeat"] as const) {
    const sim = fixture([
      { ...enemy(1, 900, 500), hp: outcome === "victory" ? 0 : 100 },
    ]);
    sim.state.enemyProjectiles = [
      { id: 1, x: 100, y: 100, vx: 1, vy: 0, damage: 10, remainingMs: 2000 },
    ];
    sim.state.nextEnemyProjectileId = 2;
    if (outcome === "defeat") sim.state.hp = 0;
    sim.advance(STEP);
    assert.equal(sim.outcome, outcome);
    assert.deepEqual(sim.state.enemyProjectiles, []);
  }
});

test("Spitters and Chargers enter the documented standard and short waves", () => {
  for (const totalWaves of [10, 6]) {
    for (const wave of [1, 2, 3, 4, 5]) {
      const sim = new CombatSimulation({ ...options, wave, totalWaves });
      sim.state.shotCooldownMs = 1e6;
      for (let spawn = 0; spawn < 3; spawn++) {
        sim.state.spawnCooldownMs = 0;
        sim.advance(STEP);
      }
      const kinds = new Set(sim.state.enemies.map((e) => e.kind));
      assert.equal(kinds.has("spitter"), wave >= (totalWaves === 6 ? 2 : 3));
      assert.equal(kinds.has("charger"), wave >= (totalWaves === 6 ? 3 : 5));
    }
  }
});

test("a dying Splitter creates exactly two weaker children that must be cleared", () => {
  const sim = fixture([{ ...enemy(1, 700, 300), kind: "splitter", hp: 0 }]);
  sim.advance(STEP);
  assert.equal(sim.outcome, null);
  assert.equal(sim.state.enemies.length, 2);
  assert.ok(
    sim.state.enemies.every(
      (e) => e.kind === "mini" && e.maxHp === 300 && e.radius === 14,
    ),
  );
  assert.equal(new Set(sim.state.enemies.map((e) => e.id)).size, 2);
  const restored = new CombatSimulation({
    ...options,
    restore: sim.serialize(),
  });
  for (const child of restored.state.enemies) child.hp = 0;
  restored.advance(STEP);
  assert.equal(restored.outcome, "victory");
  assert.equal(restored.state.enemies.length, 0);
});

test("Overmind slam, fan, and bounded summons survive resumed combat", () => {
  for (const pattern of ["slam", "fan", "summon"] as const) {
    const boss = {
      ...enemy(1, 480, 170),
      boss: true,
      kind: "overmind" as const,
      bossAttack: {
        pattern,
        phase: "windup" as const,
        remainingMs: 100,
        dx: 0,
        dy: 1,
        hit: false,
        summons: 0,
      },
    };
    const sim = fixture([boss]);
    const restored = new CombatSimulation({
      ...options,
      restore: sim.serialize(),
    });
    for (let i = 0; i < 100; i++) {
      sim.advance(STEP);
      restored.advance(STEP);
    }
    assert.deepEqual(restored.serialize(), sim.serialize());
    if (pattern === "slam") {
      assert.equal(sim.state.hp, 84);
      assert.equal(sim.state.enemies[0].bossAttack!.pattern, "fan");
    }
    if (pattern === "fan") assert.ok(sim.state.hp < 100);
    if (pattern === "summon") {
      assert.equal(
        sim.state.enemies.filter((e) => e.kind === "mini").length,
        2,
      );
      assert.equal(sim.state.enemies[0].bossAttack!.summons, 2);
      Object.assign(sim.state.enemies[0].bossAttack!, {
        pattern: "summon",
        phase: "windup",
        remainingMs: 0,
        summons: 4,
      });
      sim.advance(STEP);
      assert.equal(
        sim.state.enemies.filter((e) => e.kind === "mini").length,
        2,
      );
    }
    sim.state.enemies[0].hp = 0;
    sim.advance(STEP);
    assert.equal(sim.outcome, "victory");
    assert.deepEqual(sim.state.enemies, []);
    assert.deepEqual(sim.state.enemyProjectiles, []);
  }
});

test("mission presets tune Short counts and put Overmind only on the final wave", () => {
  const standard = new CombatSimulation({ ...options, totalWaves: 10 });
  const short = new CombatSimulation({ ...options, totalWaves: 6 });
  assert.ok(short.state.spawnTotal < standard.state.spawnTotal);
  for (const totalWaves of [6, 10]) {
    const boss = new CombatSimulation({
      ...options,
      wave: totalWaves,
      totalWaves,
    });
    boss.advance(100);
    assert.equal(boss.state.spawnTotal, 1);
    assert.equal(boss.state.enemies[0].kind, "overmind");
    const splitter = new CombatSimulation({
      ...options,
      wave: totalWaves === 6 ? 4 : 6,
      totalWaves,
    });
    splitter.state.shotCooldownMs = 1e6;
    for (let i = 0; i < 4; i++) {
      splitter.state.spawnCooldownMs = 0;
      splitter.advance(STEP);
    }
    assert.equal(splitter.state.enemies[3].kind, "splitter");
  }
});
