export const ENEMY_BALANCE = {
  spitter: {
    windupMs: 800,
    cooldownMs: 2400,
    projectileSpeed: 180,
    damage: 10,
    range: 230,
    projectileLifeMs: 7000,
  },
  charger: {
    windupMs: 1200,
    activeMs: 550,
    cooldownMs: 2300,
    speed: 420,
    damage: 18,
  },
} as const;

export const ENEMY_SPAWNS = {
  cycleLength: 4,
  spitter: { standardWave: 3, shortWave: 2, cycleIndex: 1 },
  charger: { standardWave: 5, shortWave: 3, cycleIndex: 2 },
} as const;

export const SPLITTER_BALANCE = {
  standardWave: 6,
  shortWave: 4,
  cycleIndex: 3,
  children: 2,
  childHpFraction: 0.3,
  childRadius: 14,
  childSpeedMultiplier: 1.2,
};

export const OVERMIND_BALANCE = {
  cooldownMs: 2200,
  windupMs: 1200,
  slamDurationMs: 1100,
  slamRadius: 240,
  slamDamage: 16,
  fanCount: 7,
  fanSpread: Math.PI * 0.75,
  summonLimit: 4,
  summonsPerAttack: 2,
  summonHp: 35,
  summonSpeed: 70,
};
