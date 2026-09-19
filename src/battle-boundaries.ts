import {
  BATTLE_CENTER,
  BATTLE_PLAY_BOUNDS,
  BATTLE_WORLD,
} from "./battle-world";
import { canWalk, type CampBoundaries, type Point } from "./camp-world";
import { validateBoundaries } from "./camp-boundaries";

// The fenced arena has its own layout; crater-era overrides must not carry over.
export const BATTLE_BOUNDARIES_KEY = "math-on-mars-battle-fence-boundaries-v1";
export function defaultBattleBoundaries(): CampBoundaries {
  const { left, right, top, bottom } = BATTLE_PLAY_BOUNDS;
  return {
    version: 1,
    outline: [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ],
    blocked: [],
  };
}
export function validateBattleBoundaries(value: unknown): string | null {
  return validateBoundaries(value, {
    ...BATTLE_WORLD,
    markers: [[BATTLE_CENTER, "spawn"]],
  });
}
export function loadBattleBoundaries(): CampBoundaries | undefined {
  try {
    const value = JSON.parse(
      localStorage.getItem(BATTLE_BOUNDARIES_KEY) ?? "null",
    );
    return validateBattleBoundaries(value) ? undefined : value;
  } catch {
    return undefined;
  }
}
/** Recover positions outside edited ground without resetting the mission. */
export function placeInBattle(point: Point, layout: CampBoundaries): Point {
  if (canWalk(point, layout)) return { ...point };
  const candidates: Point[] = [{ ...BATTLE_CENTER }];
  for (const polygon of [layout.outline, ...layout.blocked]) {
    polygon.forEach((a, i) => {
      const b = polygon[(i + 1) % polygon.length];
      const dx = b.x - a.x,
        dy = b.y - a.y,
        length = Math.hypot(dx, dy);
      const t = Math.max(
        0,
        Math.min(
          1,
          ((point.x - a.x) * dx + (point.y - a.y) * dy) / (length * length),
        ),
      );
      for (const side of [-1, 1])
        candidates.push({
          x: a.x + t * dx - ((side * dy) / length) * 2,
          y: a.y + t * dy + ((side * dx) / length) * 2,
        });
    });
  }
  return (
    candidates
      .filter((p) => canWalk(p, layout))
      .sort(
        (a, b) =>
          Math.hypot(a.x - point.x, a.y - point.y) -
          Math.hypot(b.x - point.x, b.y - point.y),
      )[0] ?? { ...BATTLE_CENTER }
  );
}
/** Small steps prevent crossing thin walls; resolving axes lets actors slide. */
export function moveInBattle(
  from: Point,
  to: Point,
  layout: CampBoundaries,
): Point {
  const next = placeInBattle(from, layout);
  const dx = to.x - from.x,
    dy = to.y - from.y;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2));
  for (let i = 0; i < steps; i++) {
    if (canWalk({ x: next.x + dx / steps, y: next.y }, layout))
      next.x += dx / steps;
    if (canWalk({ x: next.x, y: next.y + dy / steps }, layout))
      next.y += dy / steps;
  }
  return next;
}
