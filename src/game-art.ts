import { itemAssets } from "./assets";
import { ammoArtKey, moduleArtKey } from "./item-art";
import type { ShopItem, Stat } from "./types";
export { ammoArtKey, moduleArtKey };

export function itemArt(key: keyof typeof itemAssets, className = ""): string {
  return `<img class="item-art ${className}" src="${itemAssets[key]}" alt="" aria-hidden="true" draggable="false">`;
}
export function offerArt(offer: ShopItem): string {
  if (offer.kind === "ammo") return itemArt(ammoArtKey(offer.ammoType));
  if (offer.kind === "module") return itemArt(moduleArtKey(offer.module.name));
  return itemArt(
    offer.kind === "expand"
      ? "trinket_ammo_expander"
      : offer.kind === "repair"
        ? "med_kit"
        : "med_gel",
  );
}
const icons = import.meta.glob("./assets/ui/icons/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
export function glyph(name: string): string {
  return `<span class="ui-glyph" aria-hidden="true">${icons[`./assets/ui/icons/${name}.svg`] ?? ""}</span>`;
}
export function statGlyph(stat: Stat): string {
  return glyph(
    {
      maxHp: "health",
      armor: "armor",
      damage: "damage",
      attackSpeed: "attack_speed",
      projectileSpeed: "projectile_speed",
      moveSpeed: "movement",
      pickupRadius: "pickup_radius",
      healing: "healing",
      luck: "luck",
    }[stat],
  );
}
export function decorateControls(root: ParentNode = document): void {
  const selectors: Record<string, string> = {
    "#pause-button": "pause",
    "#exit-mission, #pause-exit": "close",
    "#back-shop, #cancel-track, #home-button": "back",
    "#mirror-controls": "settings",
    "#confirm-forge, #forge-button": "forge",
    "#merge-all": "merge",
    "#reroll-shop, #retry-button": "reroll",
    '#resume-button, #correction-check, [data-reward], [data-key="check"]':
      "confirm",
    '[data-key="back"]': "backspace",
    ".ammo-action": "equip",
  };
  for (const [selector, icon] of Object.entries(selectors)) {
    root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (el.querySelector(".ui-glyph")) return;
      if (el.id === "pause-button" || el.dataset.key === "back")
        el.textContent = "";
      el.insertAdjacentHTML("afterbegin", glyph(icon));
    });
  }
  root
    .querySelectorAll<HTMLElement>("button, .ammo-chip")
    .forEach((el) => el.classList.add("mom-control"));
}
