/** Main weapon and movement tuning. Distances are arena world units. */
export const COMBAT_BALANCE = {
  weaponRange: 320,
  projectileSpeed: 560,
  baseDamage: 18,
  shotDelayMs: 520,
  marineSpeed: 220,
  multiShotSpreadRadians: 0.12,
  multiShotDamage: [1, 1.15, 1.3, 1.45, 1.6],
  maxProjectiles: 160,
  screenEdgeInset: 24,
} as const;
