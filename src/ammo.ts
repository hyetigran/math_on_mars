import { AMMO_BALANCE } from "../content/balance/ammo";
import {
  AMMO_TYPES,
  uid,
  type Ammo,
  type AmmoInventory,
  type RunState,
} from "./types";

/** Ownership includes equipped cartridges; acquisition never displaces a loadout. */
export function acquireAmmo(run: AmmoInventory, items: Ammo[]): void {
  for (const item of items) {
    if (run.ammo.some((a) => a.id === item.id)) continue;
    const ownedType = run.ammo.some((a) => a.type === item.type);
    run.ammo.push(item);
    if (!ownedType && run.activeAmmoIds.length < run.ammoCapacity)
      run.activeAmmoIds.push(item.id);
  }
}

export function createChoiceCache(run: RunState): void {
  if (run.choiceCache) return;
  run.choiceCache = {
    id: uid("cache"),
    kind: "choice",
    options: [
      ...AMMO_TYPES.map((type) => ({
        id: uid("option"),
        kind: "ammo" as const,
        sellPrice: AMMO_BALANCE.cachePairSale,
        ammo: [
          { id: uid("ammo"), type, tier: 3 as const },
          { id: uid("ammo"), type, tier: 3 as const },
        ],
      })),
      {
        id: uid("option"),
        kind: "module",
        sellPrice: AMMO_BALANCE.cacheModuleSale,
        module: {
          id: uid("module"),
          name: "Field Plating",
          stat: "armor",
          value: 2,
          quality: "green",
        },
      },
    ],
  };
}

export const ammoSellPrice = (ammo: Ammo): number =>
  AMMO_BALANCE.sellPrices[ammo.tier - 1];
export interface MergePreview {
  runId: string;
  revision: number;
  pairs: [string, string][];
}
export function previewMerges(
  run: RunState,
  type?: Ammo["type"],
  tier?: number,
): MergePreview {
  const pairs: [string, string][] = [];
  for (const ammoType of AMMO_TYPES) {
    if (type && ammoType !== type) continue;
    for (let level = 1; level <= 3; level++) {
      if (tier && level !== tier) continue;
      const matching = run.ammo.filter(
        (a) => !a.legendary && a.type === ammoType && a.tier === level,
      );
      for (let i = 0; i + 1 < matching.length; i += 2)
        pairs.push([matching[i].id, matching[i + 1].id]);
    }
  }
  return { runId: run.id, revision: run.interactionRevision ?? 0, pairs };
}
export function applyMerges(run: RunState, preview: MergePreview): boolean {
  if (
    preview.runId !== run.id ||
    preview.revision !== (run.interactionRevision ?? 0)
  )
    return false;
  const inputs = preview.pairs.flat();
  if (!inputs.length || new Set(inputs).size !== inputs.length) return false;
  const pairs = preview.pairs.map((ids) =>
    ids.map((id) => run.ammo.find((a) => a.id === id)),
  );
  if (
    pairs.some(
      (pair) =>
        pair.length !== 2 ||
        pair.some((a) => !a || a.legendary || a.tier >= 4) ||
        pair[0]!.type !== pair[1]!.type ||
        pair[0]!.tier !== pair[1]!.tier,
    )
  )
    return false;
  for (const pair of pairs) {
    const first = pair[0]!;
    const second = pair[1]!;
    const activeIndex = run.activeAmmoIds.findIndex(
      (id) => id === first.id || id === second.id,
    );
    const result: Ammo = {
      id: uid("ammo"),
      type: first.type,
      tier: (first.tier + 1) as 2 | 3 | 4,
    };
    run.ammo = run.ammo.filter((a) => a.id !== first.id && a.id !== second.id);
    run.ammo.push(result);
    run.activeAmmoIds = run.activeAmmoIds.filter(
      (id) => id !== first.id && id !== second.id,
    );
    if (activeIndex >= 0) run.activeAmmoIds.splice(activeIndex, 0, result.id);
  }
  return true;
}

/** Tuning v1: weighted tiers progress with waves; one saved bag cycle covers all types. */
export function ammoDropTier(wave: number, roll: number): Ammo["tier"] {
  const weights = AMMO_BALANCE.tierWeights.find(
    (entry) => wave <= entry.throughWave,
  )!.weights;
  let threshold = 0;
  for (let i = 0; i < weights.length; i++) {
    threshold += weights[i];
    if (roll * 100 < threshold) return (i + 1) as Ammo["tier"];
  }
  return 4;
}
export function drawAmmo(
  inventory: AmmoInventory,
  wave: number,
  random: () => number,
  id: string,
): Ammo {
  if (!inventory.ammoBag?.length) {
    inventory.ammoBag = [...AMMO_TYPES];
    for (let i = inventory.ammoBag.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [inventory.ammoBag[i], inventory.ammoBag[j]] = [
        inventory.ammoBag[j],
        inventory.ammoBag[i],
      ];
    }
  }
  return {
    id,
    type: inventory.ammoBag.pop()!,
    tier: ammoDropTier(wave, random()),
  };
}
