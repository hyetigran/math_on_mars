/** Frost and Fiery v1; burn duration is derived from funded damage / rate. */
export const STATUS_BALANCE = {
  slowFractions: [0, 0.2, 0.25, 0.3, 0.4],
  bossSlowMultiplier: 0.5,
  slowDurationMs: 2000,
  burnFractions: [0, 0.3, 0.45, 0.6, 0.9],
  burnDurationSeconds: 3,
  frostColor: 0x90eaff,
  burnColor: 0xffa052,
} as const;
