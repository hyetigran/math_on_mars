import { ammoDropTier } from "./ammo";
import { moduleCandidates, modifiers, moduleTotal, STAT_CAPS } from "./modules";
import {
  AMMO_TYPES,
  QUALITY_ORDER,
  uid,
  type RunState,
  type ShopItem,
} from "./types";
export const rerollPrice = (run: RunState): number =>
  2 + (run.shop?.paidRerolls ?? 0);
function createOffer(run: RunState, slot: number): ShopItem {
  if (slot === 0 && run.ammoCapacity < 4)
    return {
      id: uid("offer"),
      kind: "expand",
      title: "Ammo Expander",
      price: [8, 16, 24][run.ammoCapacity - 1],
    };
  const seed =
    run.wave +
    (run.shop?.round ?? 0) * 4 +
    (run.shop?.paidRerolls ?? 0) * 7 +
    slot;
  if (slot === 2) {
    const ammoType = AMMO_TYPES[seed % AMMO_TYPES.length];
    const ammoTier = ammoDropTier(run.wave, ((seed * 37) % 100) / 100);
    return {
      id: uid("offer"),
      kind: "ammo",
      title: `${ammoType} Ammo`,
      ammoType,
      ammoTier,
      price: [6, 10, 18, 30][ammoTier - 1],
    };
  }
  const quality = QUALITY_ORDER[seed % 4];
  const module = moduleCandidates(quality, seed, run.modules)[0];
  if (slot === 3 || !module)
    return { id: uid("offer"), kind: "medkit", title: "Med-gel", price: 5 };
  return {
    id: uid("offer"),
    kind: "module",
    title: module.name,
    price: [6, 9, 14, 20][QUALITY_ORDER.indexOf(quality)],
    module,
  };
}
export function usefulOffer(run: RunState, item: ShopItem): boolean {
  if (item.kind === "expand") return run.ammoCapacity < 4;
  if (item.kind === "repair") return run.hp < run.maxHp;
  if (item.kind === "module")
    return (
      !!item.module &&
      modifiers(item.module).every(
        (m) =>
          m.value > 0 &&
          m.value <=
            STAT_CAPS[m.stat] - moduleTotal(run.modules, m.stat) + 1e-9,
      )
    );
  return true;
}
export function createShop(run: RunState): void {
  run.shop = { round: 0, paidRerolls: 0, offers: [] };
  run.shopBought = [];
  run.shop.offers = Array.from({ length: 4 }, (_, slot) =>
    createOffer(run, slot),
  );
}
/** Older saves retain the offers/empty slots they previously displayed. */
export function migrateShop(run: RunState): void {
  if (run.shop) return;
  run.shop = {
    round: 0,
    paidRerolls: 0,
    offers: [
      {
        id: "expand",
        kind: "expand",
        title: "Ammo Expander",
        price: [8, 16, 24][run.ammoCapacity - 1] ?? 24,
      },
      { id: "medkit", kind: "medkit", title: "Med-gel", price: 5 },
      {
        id: "ammo",
        kind: "ammo",
        title: `${AMMO_TYPES[run.wave % 5]} Ammo`,
        price: 6,
        ammoType: AMMO_TYPES[run.wave % 5],
      },
      { id: "repair", kind: "repair", title: "Suit Repair", price: 4 },
    ],
  };
  refreshShop(run);
}
export function refreshShop(run: RunState): void {
  if (!run.shop) return;
  if (run.shopBought.length === 4) {
    run.shop.round++;
    run.shopBought = [];
    run.shop.offers = Array.from({ length: 4 }, (_, slot) =>
      createOffer(run, slot),
    );
  } else {
    run.shop.offers = run.shop.offers.map((offer, slot) =>
      run.shopBought.includes(offer.id) || usefulOffer(run, offer)
        ? offer
        : createOffer(run, slot),
    );
  }
}
export function rerollShop(run: RunState): string {
  if (!run.shop) return "Shop is unavailable.";
  const price = rerollPrice(run);
  if (run.salvage < price) return "Not enough salvage yet.";
  const eligible = run.shop.offers.map(
    (o, i) =>
      !run.shopBought.includes(o.id) && !(i === 0 && run.ammoCapacity === 1),
  );
  if (!eligible.some(Boolean)) return "No offers can be rerolled.";
  run.salvage -= price;
  run.shop.paidRerolls++;
  run.shop.offers = run.shop.offers.map((o, i) =>
    eligible[i] ? createOffer(run, i) : o,
  );
  return "Unpurchased offers refreshed.";
}
export function shopOffers(run: RunState) {
  return (run.shop?.offers ?? []).map((o) => ({
    ...o,
    disabled: !usefulOffer(run, o),
    detail:
      o.kind === "expand"
        ? `Active ammo ${run.ammoCapacity}/4 → ${Math.min(4, run.ammoCapacity + 1)}/4`
        : o.kind === "medkit"
          ? "Carry one extra heal into combat"
          : o.kind === "repair"
            ? "Restore 30 Suit Integrity"
            : o.kind === "ammo"
              ? `Add one ${QUALITY_ORDER[(o.ammoTier ?? 1) - 1]} T${o.ammoTier ?? 1} cartridge`
              : "Passive module",
    purchased: run.shopBought.includes(o.id),
  }));
}
