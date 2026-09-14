export const MISSION_PRESETS = {
  standard: {
    waves: 10,
    baseEnemies: 10,
    enemiesPerWave: 3,
    maximumEnemies: 34,
  },
  short: { waves: 6, baseEnemies: 7, enemiesPerWave: 2, maximumEnemies: 19 },
} as const;
export type MissionLength = keyof typeof MISSION_PRESETS;
