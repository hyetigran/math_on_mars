import { AMMO_BALANCE } from "../content/balance/ammo";
import { AMMO_TYPES, uid, type AmmoInventory, type RunState } from "./types";

export interface ForgePreview {
  runId: string;
  revision: number;
  ingredientIds: string[];
}
export function canForge(run: RunState): boolean {
  return (
    !run.forgedOmni &&
    !run.ammo.some((a) => a.legendary) &&
    AMMO_TYPES.every((type) =>
      run.ammo.some((a) => !a.legendary && a.type === type && a.tier === 4),
    )
  );
}
export function previewForge(run: RunState): ForgePreview {
  return {
    runId: run.id,
    revision: run.interactionRevision ?? 0,
    ingredientIds: AMMO_TYPES.flatMap((type) => {
      const item = run.ammo.find(
        (a) => !a.legendary && a.type === type && a.tier === 4,
      );
      return item ? [item.id] : [];
    }),
  };
}
export function retainedForgeLoadout(run: RunState, ids: string[]): string[] {
  return run.activeAmmoIds
    .filter((id) => !ids.includes(id))
    .slice(0, run.ammoCapacity - 1);
}
export function applyForge(run: RunState, preview: ForgePreview): boolean {
  if (
    !canForge(run) ||
    preview.runId !== run.id ||
    preview.revision !== (run.interactionRevision ?? 0) ||
    preview.ingredientIds.length !== 5 ||
    new Set(preview.ingredientIds).size !== 5
  )
    return false;
  const items = preview.ingredientIds.map((id) =>
    run.ammo.find((a) => a.id === id),
  );
  if (
    !AMMO_TYPES.every((type) =>
      items.some((a) => a && !a.legendary && a.type === type && a.tier === 4),
    )
  )
    return false;
  const retained = retainedForgeLoadout(run, preview.ingredientIds);
  run.ammo = run.ammo.filter((a) => !preview.ingredientIds.includes(a.id));
  const omni = {
    id: uid("ammo"),
    type: "Piercing" as const,
    tier: 4 as const,
    legendary: true,
  };
  run.ammo.push(omni);
  run.activeAmmoIds = [omni.id, ...retained];
  run.forgedOmni = true;
  return true;
}
export function omniEquipped(inventory: AmmoInventory): boolean {
  return inventory.ammo.some(
    (a) => a.legendary && inventory.activeAmmoIds.includes(a.id),
  );
}

export function omniRateBonus(inventory: AmmoInventory): number {
  return omniEquipped(inventory)
    ? Math.max(0, Math.min(3, inventory.ammoCapacity - 1)) *
        AMMO_BALANCE.omniRatePerExtraSlot
    : 0;
}
