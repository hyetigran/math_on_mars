import { CAMP_BOUNDARY_LAYOUT } from "./camp-boundary-layout";
import {
  CAMP_WIDTH,
  CAMP_HEIGHT,
  CAMP_SPAWN,
  CAMP_PORTAL,
  canWalk,
  type CampBoundaries,
  type Point,
} from "./camp-world";

export const BOUNDARIES_KEY = "math-on-mars-camp-boundaries-v1";
export function defaultBoundaries(): CampBoundaries {
  return structuredClone(CAMP_BOUNDARY_LAYOUT);
}

function simplePolygon(points: Point[]): boolean {
  const cross = (a: Point, b: Point, c: Point) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1) return false;
    area += a.x * b.y - b.x * a.y;
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue;
      const c = points[j],
        d = points[(j + 1) % points.length];
      if (
        Math.max(a.x, b.x) < Math.min(c.x, d.x) ||
        Math.max(c.x, d.x) < Math.min(a.x, b.x) ||
        Math.max(a.y, b.y) < Math.min(c.y, d.y) ||
        Math.max(c.y, d.y) < Math.min(a.y, b.y)
      )
        continue;
      if (
        cross(a, b, c) * cross(a, b, d) <= 0 &&
        cross(c, d, a) * cross(c, d, b) <= 0
      )
        return false;
    }
  }
  return Math.abs(area) > 2;
}

export function validateBoundaries(
  value: unknown,
  config = {
    width: CAMP_WIDTH,
    height: CAMP_HEIGHT,
    markers: [
      [CAMP_SPAWN, "spawn"],
      [CAMP_PORTAL, "portal"],
    ] as [Point, string][],
  },
): string | null {
  const layout = value as CampBoundaries | null;
  if (
    !layout ||
    layout.version !== 1 ||
    !Array.isArray(layout.outline) ||
    !Array.isArray(layout.blocked) ||
    layout.blocked.length > 100
  )
    return "Choose a valid boundaries JSON file.";
  for (const polygon of [layout.outline, ...layout.blocked]) {
    if (
      !Array.isArray(polygon) ||
      polygon.length < 3 ||
      polygon.length > 500 ||
      polygon.some(
        (p) =>
          !p ||
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          p.x < 0 ||
          p.x > config.width ||
          p.y < 0 ||
          p.y > config.height,
      )
    )
      return "Each shape needs at least three points inside the image.";
    if (!simplePolygon(polygon))
      return "Shape edges cannot cross or overlap. Move or undo the overlapping points.";
  }
  for (const [point, name] of config.markers) {
    if (!canWalk(point, layout))
      return `Keep the ${name} marker inside walkable ground.`;
  }
  return null;
}

export function loadBoundaries(): CampBoundaries | undefined {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(BOUNDARIES_KEY) ?? "null",
    );
    return validateBoundaries(value) ? undefined : (value as CampBoundaries);
  } catch {
    return undefined;
  }
}
