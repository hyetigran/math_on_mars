import type { AmmoType } from "./types";

export function ammoArtKey(type: AmmoType, legendary = false) {
  if (legendary) return "ammo_legendary_omni" as const;
  return (
    {
      Piercing: "ammo_piercing",
      "Multi Shot": "ammo_multi_shot",
      "Electric Chain": "ammo_electric_chain",
      Frost: "ammo_frost",
      Fiery: "ammo_fiery",
    } as const
  )[type];
}

// Modules in each family can affect different stats: artwork follows the family.
export function moduleArtKey(name: string) {
  const family = name.split(" ").at(-1) ?? "";
  const families = {
    Overclock: "trinket_overclock_chip",
    Shield: "trinket_shield_capacitor",
    Thruster: "trinket_thruster_coupler",
    "Med-service": "trinket_med_service_module",
    Targeting: "trinket_targeting_module",
    Salvage: "trinket_salvage_module",
  } as const;
  return (
    families[family as keyof typeof families] ?? "trinket_shield_capacitor"
  );
}
