import type { CombatEnemySaveV2 } from "./types";

export function facingDirection(x: number, y: number): string {
  return ["e", "se", "s", "sw", "w", "nw", "n", "ne"][
    (Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8
  ];
}

/** Shared by the simulation and sprite so left-facing shots leave the left gun. */
export function combatAim(
  marine: { x: number; y: number },
  enemies: CombatEnemySaveV2[],
  range = Infinity,
) {
  const chest = { x: marine.x, y: marine.y - 16 };
  const target = enemies
    .filter(
      (e) => e.hp > 0 && Math.hypot(e.x - chest.x, e.y - chest.y) <= range,
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - chest.x, a.y - chest.y) -
          Math.hypot(b.x - chest.x, b.y - chest.y) || a.id - b.id,
    )[0];
  if (!target) return undefined;
  const angle = Math.atan2(target.y - chest.y, target.x - chest.x);
  const origin = {
    x: chest.x + Math.cos(angle) * 28,
    y: chest.y + Math.sin(angle) * 12,
  };
  return {
    target,
    origin,
    direction: facingDirection(target.x - chest.x, target.y - chest.y),
  };
}

/** Travel direction wins so the forward-running sheets never moonwalk. */
export function marineAnimation(
  movementDirection: string | undefined,
  aimDirection: string | undefined,
  firing: boolean,
  previousDirection: string,
) {
  return {
    direction: movementDirection ?? aimDirection ?? previousDirection,
    motion: movementDirection
      ? firing && movementDirection === aimDirection
        ? "run-attack"
        : "run"
      : firing
        ? "attack"
        : "idle",
  };
}
