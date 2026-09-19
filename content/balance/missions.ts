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

export function missionLengthForWaves(totalWaves: number): MissionLength {
  return totalWaves === MISSION_PRESETS.short.waves ? "short" : "standard";
}

/** Goblin Gutter src/data/balance.json timerCapBands; boss waves are untimed. */
export const WAVE_TIMER_BANDS = [
  { throughWave: 3, seconds: 30 },
  { throughWave: 9, seconds: 45 },
  { throughWave: 19, seconds: 60 },
] as const;
export function waveDurationMs(
  wave: number,
  totalWaves: number,
): number | null {
  if (wave === totalWaves || wave === 10 || wave === 20) return null;
  return (
    (WAVE_TIMER_BANDS.find((band) => wave <= band.throughWave)?.seconds ?? 60) *
    1000
  );
}
