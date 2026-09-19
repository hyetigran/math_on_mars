import { LUCK_BALANCE } from "../content/balance/luck";
import {
  type Module,
  type Modifier,
  type Stat,
  type Quality,
  type RunState,
  uid,
} from "./types";

export const STAT_CAPS: Record<Stat, number> = {
  damage: 0.6,
  attackSpeed: 0.6,
  projectileSpeed: 0.5,
  moveSpeed: 0.35,
  pickupRadius: 1,
  healing: 0.75,
  maxHp: 100,
  armor: 20,
  luck: LUCK_BALANCE.maximum,
};
export function modifiers(module: Module): Modifier[] {
  return [
    { stat: module.stat, value: module.value },
    ...(module.additionalModifiers ?? []),
  ];
}
export function moduleTotal(modules: Module[], stat: Stat): number {
  return Math.min(
    STAT_CAPS[stat],
    modules
      .flatMap(modifiers)
      .filter((m) => m.stat === stat)
      .reduce((sum, m) => sum + m.value, 0),
  );
}
type Variant = { name: string; modifiers: Modifier[] };
const variant = (name: string, ...entries: [Stat, number][]): Variant => ({
  name,
  modifiers: entries.map(([stat, value]) => ({ stat, value })),
});
const CATALOG: Variant[] = [
  variant(
    "Rapid Overclock",
    ["attackSpeed", 0.06],
    ["damage", 0.06],
    ["projectileSpeed", 0.08],
  ),
  variant(
    "Ballistic Overclock",
    ["damage", 0.08],
    ["attackSpeed", 0.04],
    ["projectileSpeed", 0.08],
  ),
  variant(
    "Accelerator Overclock",
    ["projectileSpeed", 0.12],
    ["damage", 0.06],
    ["attackSpeed", 0.04],
  ),
  variant("Integrity Shield", ["maxHp", 10], ["armor", 2], ["healing", 0.1]),
  variant("Plating Shield", ["armor", 2], ["maxHp", 10], ["healing", 0.1]),
  variant("Recovery Shield", ["healing", 0.15], ["maxHp", 10], ["armor", 2]),
  variant(
    "Drive Thruster",
    ["moveSpeed", 0.05],
    ["pickupRadius", 0.15],
    ["attackSpeed", 0.05],
  ),
  variant(
    "Tractor Thruster",
    ["pickupRadius", 0.2],
    ["moveSpeed", 0.04],
    ["attackSpeed", 0.04],
  ),
  variant(
    "Strafe Thruster",
    ["moveSpeed", 0.07],
    ["armor", 1],
    ["projectileSpeed", 0.06],
  ),
  variant(
    "Restorative Med-service",
    ["healing", 0.12],
    ["maxHp", 8],
    ["pickupRadius", 0.12],
  ),
  variant(
    "Rescue Med-service",
    ["maxHp", 12],
    ["healing", 0.08],
    ["moveSpeed", 0.03],
  ),
  variant(
    "Field Med-service",
    ["armor", 1],
    ["healing", 0.12],
    ["attackSpeed", 0.04],
  ),
  variant(
    "Cannon Targeting",
    ["damage", 0.07],
    ["projectileSpeed", 0.1],
    ["pickupRadius", 0.1],
  ),
  variant(
    "Lead Targeting",
    ["projectileSpeed", 0.14],
    ["damage", 0.04],
    ["moveSpeed", 0.03],
  ),
  variant(
    "Pursuit Targeting",
    ["moveSpeed", 0.04],
    ["damage", 0.05],
    ["projectileSpeed", 0.08],
  ),
  variant("Lucky Salvage", ["luck", 0.1], ["pickupRadius", 0.12], ["armor", 1]),
  variant(
    "Collector Salvage",
    ["pickupRadius", 0.2],
    ["armor", 1],
    ["maxHp", 8],
  ),
  variant(
    "Shell Salvage",
    ["maxHp", 12],
    ["pickupRadius", 0.12],
    ["damage", 0.04],
  ),
  variant(
    "Pulse Salvage",
    ["attackSpeed", 0.05],
    ["pickupRadius", 0.12],
    ["healing", 0.08],
  ),
];
/** Store exact, positive gains at offer creation; legacy single-stat modules retain their values. */
export function moduleCandidates(
  quality: Quality,
  wave: number,
  owned: Module[],
): Module[] {
  const count = quality === "purple" ? 3 : quality === "blue" ? 2 : 1;
  const rotated = [
    ...CATALOG.slice(wave % CATALOG.length),
    ...CATALOG.slice(0, wave % CATALOG.length),
  ];
  rotated.sort(
    (a, b) =>
      Number(owned.some((m) => m.name === a.name)) -
      Number(owned.some((m) => m.name === b.name)),
  );
  const eligible = rotated.flatMap((item) => {
    const gains = item.modifiers.slice(0, count).map((m) => ({
      stat: m.stat,
      value: Math.min(
        m.value * (quality === "white" ? 0.5 : 1),
        STAT_CAPS[m.stat] - moduleTotal(owned, m.stat),
      ),
    }));
    if (gains.some((m) => m.value <= 1e-9)) return [];
    return [
      {
        id: uid("module"),
        name: item.name,
        ...gains[0],
        additionalModifiers: gains.slice(1),
        quality,
      },
    ];
  });
  return eligible;
}

export function rewardModules(
  quality: Quality,
  wave: number,
  owned: Module[],
): Module[] {
  const eligible = moduleCandidates(quality, wave, owned);
  const first = eligible[0];
  const different = eligible.find((m) => m.stat !== first?.stat);
  const third = eligible.find((m) => m !== first && m !== different);
  if (!first || !different || !third)
    throw new Error("No three useful reward variants available.");
  return [first, different, third];
}

export function installModule(
  run: Pick<RunState, "modules" | "hp" | "maxHp">,
  module: Module,
): void {
  const before = moduleTotal(run.modules, "maxHp");
  run.modules.push(module);
  const gain = moduleTotal(run.modules, "maxHp") - before;
  run.maxHp += gain;
  run.hp += gain;
}
