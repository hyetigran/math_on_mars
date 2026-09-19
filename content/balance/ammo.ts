/** MVP ammo economy v1. Ammo drops and shop prices. */
export const AMMO_BALANCE = {
  version: 1,
  omniRatePerExtraSlot: 0.04,
  tierWeights: [
    { throughWave: 3, weights: [85, 15, 0, 0] },
    { throughWave: 6, weights: [45, 35, 20, 0] },
    { throughWave: Infinity, weights: [20, 30, 35, 15] },
  ],
  buyPrices: [6, 10, 18, 30],
  sellPrices: [2, 4, 8, 16],
} as const;
