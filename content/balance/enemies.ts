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
