import { LUCK_BALANCE } from "../content/balance/luck";
import type { Tier } from "./types";

const boundedLuck = (luck: number) =>
  Math.max(0, Math.min(LUCK_BALANCE.maximum, luck));
export const chestDropChance = (luck: number): number =>
  LUCK_BALANCE.chestChance * (1 + boundedLuck(luck));
export const bonusSalvage = (luck: number, roll: number): number =>
  Number(roll < boundedLuck(luck) * LUCK_BALANCE.bonusSalvageChancePerLuck);
export const luckyShopTier = (tier: Tier, luck: number, roll: number): Tier =>
  Math.min(
    4,
    tier +
      Number(roll < boundedLuck(luck) * LUCK_BALANCE.shopUpgradeChancePerLuck),
  ) as Tier;

/** Stable per offer, including across reloads; independent of catalog rotation. */
export function shopLuckRoll(key: string): number {
  let hash = 2166136261;
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  return (hash >>> 0) / 4294967296;
}
