import { MODULE_NAMES } from "./modules";
import type { QAJumpOptions } from "./session";
import type { Quality } from "./types";
import { AMMO_TYPES, type Ammo, type RunState } from "./types";

export function qaControls(run: RunState): string {
  const equipped = run.activeAmmoIds.map((id) =>
    run.ammo.find((a) => a.id === id),
  );
  return `<details class="qa-controls"><summary>QA · Jump to section</summary>
    <form id="qa-wave-form">
      <p>Choose a section and test loadout. Restarts at full health and replaces owned ammo.</p>
      <label>Wave <select name="wave">${Array.from({ length: run.totalWaves }, (_, i) => `<option value="${i + 1}" ${run.wave === i + 1 ? "selected" : ""}>${i + 1}${i + 1 === run.totalWaves ? " · Boss" : ""}</option>`).join("")}</select></label>
      <label>Section<select name="section"><option value="combat">Combat</option><option value="quiz">Quiz</option></select></label>
      <label>Salvage (currency)<input name="salvage" type="number" min="0" max="1000000" step="1" value="${run.salvage}" required></label>
      ${Array.from({ length: 4 }, (_, i) => {
        const ammo = equipped[i];
        const selected = ammo?.legendary ? "Omni" : (ammo?.type ?? "");
        return `<div class="qa-ammo-row"><label>Ammo ${i + 1}<select name="ammo-${i}">${["", ...AMMO_TYPES, "Omni"].map((type) => `<option value="${type}" ${selected === type ? "selected" : ""}>${type === "Omni" ? "Legendary Omni" : type || "None"}</option>`).join("")}</select></label><label>Rarity<select name="tier-${i}">${["White", "Green", "Blue", "Purple"].map((name, tier) => `<option value="${tier + 1}" ${(ammo?.tier ?? 1) === tier + 1 ? "selected" : ""}>${name}</option>`).join("")}</select></label></div>`;
      }).join("")}
      <p>Omni is always purple. Empty slots use no special ammo.</p>
      <fieldset><legend>Trinkets (upgrades)</legend><p>Currently installed: ${run.modules.length}</p>
      <label class="qa-checkbox"><input type="checkbox" name="clear-trinkets">Clear installed trinkets first</label>
      <p>Selected trinkets are added to installed upgrades. Stat caps still apply.</p>
      ${Array.from({ length: 4 }, (_, i) => `<div class="qa-ammo-row"><label>Trinket ${i + 1}<select name="trinket-${i}"><option value="">None</option>${MODULE_NAMES.map((name) => `<option>${name}</option>`).join("")}</select></label><label>Rarity<select name="trinket-quality-${i}">${["white", "green", "blue", "purple"].map((quality) => `<option value="${quality}">${quality}</option>`).join("")}</select></label></div>`).join("")}
      </fieldset>
      <p id="qa-error" role="alert"></p><button type="submit" class="button secondary">Jump to section</button>
    </form></details>`;
}

export function bindQAControls(
  root: HTMLElement,
  jump: (
    wave: number,
    ammo: Omit<Ammo, "id">[],
    options: QAJumpOptions,
  ) => void,
): void {
  const form = root.querySelector<HTMLFormElement>("#qa-wave-form")!;
  const updateTiers = () => {
    const wave = form.elements.namedItem("wave") as HTMLSelectElement;
    const section = form.elements.namedItem("section") as HTMLSelectElement;
    const finalWave = wave.selectedIndex === wave.options.length - 1;
    section.options[1].disabled = finalWave;
    if (finalWave) section.value = "combat";
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
    const trinkets: NonNullable<QAJumpOptions["trinkets"]> = [];
    for (let i = 0; i < 4; i++) {
      const name = String(data.get(`trinket-${i}`) ?? "");
      if (name)
        trinkets.push({
          name,
          quality: data.get(`trinket-quality-${i}`) as Quality,
        });
    }
    jump(Number(data.get("wave")), ammo, {
      section: data.get("section") as "combat" | "quiz",
      salvage: Number(data.get("salvage")),
      clearTrinkets: data.has("clear-trinkets"),
      trinkets,
    });
  });
}
