import { AMMO_TYPES, type Ammo, type RunState } from "./types";

export function qaControls(run: RunState): string {
  const equipped = run.activeAmmoIds.map((id) =>
    run.ammo.find((a) => a.id === id),
  );
  return `<details class="qa-controls"><summary>QA · Jump to wave</summary>
    <form id="qa-wave-form">
      <p>Restart any wave at full health. Replaces owned ammo; keeps upgrades and salvage.</p>
      <label>Wave <select name="wave">${Array.from({ length: run.totalWaves }, (_, i) => `<option value="${i + 1}" ${run.wave === i + 1 ? "selected" : ""}>${i + 1}${i + 1 === run.totalWaves ? " · Boss" : ""}</option>`).join("")}</select></label>
      ${Array.from({ length: 4 }, (_, i) => {
        const ammo = equipped[i];
        const selected = ammo?.legendary ? "Omni" : (ammo?.type ?? "");
        return `<div class="qa-ammo-row"><label>Ammo ${i + 1}<select name="ammo-${i}">${["", ...AMMO_TYPES, "Omni"].map((type) => `<option value="${type}" ${selected === type ? "selected" : ""}>${type === "Omni" ? "Legendary Omni" : type || "None"}</option>`).join("")}</select></label><label>Rarity<select name="tier-${i}">${["White", "Green", "Blue", "Purple"].map((name, tier) => `<option value="${tier + 1}" ${(ammo?.tier ?? 1) === tier + 1 ? "selected" : ""}>${name}</option>`).join("")}</select></label></div>`;
      }).join("")}
      <p>Omni is always purple. Empty slots use no special ammo.</p>
      <button type="submit" class="button secondary">Jump to wave</button>
    </form></details>`;
}

export function bindQAControls(
  root: HTMLElement,
  jump: (wave: number, ammo: Omit<Ammo, "id">[]) => void,
): void {
  const form = root.querySelector<HTMLFormElement>("#qa-wave-form")!;
  const updateTiers = () => {
    for (let i = 0; i < 4; i++) {
      const type = (form.elements.namedItem(`ammo-${i}`) as HTMLSelectElement)
        .value;
      const tier = form.elements.namedItem(`tier-${i}`) as HTMLSelectElement;
      tier.disabled = !type || type === "Omni";
      if (type === "Omni") tier.value = "4";
    }
  };
  form.addEventListener("change", updateTiers);
  updateTiers();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const ammo: Omit<Ammo, "id">[] = [];
    for (let i = 0; i < 4; i++) {
      const type = data.get(`ammo-${i}`) as string;
      if (!type) continue;
      ammo.push(
        type === "Omni"
          ? { type: "Piercing", tier: 4, legendary: true }
          : {
              type: type as Ammo["type"],
              tier: Number(data.get(`tier-${i}`)) as Ammo["tier"],
            },
      );
    }
    jump(Number(data.get("wave")), ammo);
  });
}
