import { CAMP_BOUNDARY_LAYOUT } from "./camp-boundary-layout";

/** World coordinates match the 3:2 camp artwork at 1536 × 1024. */
export const CAMP_WIDTH = 1536;
export const CAMP_HEIGHT = 1024;
export const CAMP_SPAWN = { x: 790, y: 616 };
export const CAMP_PORTAL = { x: 787, y: 283 };
export type Point = { x: number; y: number };
/** Cover the viewport at a closer play scale, clamping the camera to the artwork. */
export function campCamera(width: number, height: number, focus: Point) {
  const scale = Math.max(width / CAMP_WIDTH, height / CAMP_HEIGHT) * 1.35;
  const clamp = (value: number, viewport: number, world: number) =>
    Math.min(0, Math.max(viewport - world * scale, value));
  return {
    scale,
    offsetX: clamp(width / 2 - focus.x * scale, width, CAMP_WIDTH),
    offsetY: clamp(height * 0.55 - focus.y * scale, height, CAMP_HEIGHT),
  };
}
export type Direction = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export interface CampBoundaries {
  version: 1;
  outline: Point[];
  blocked: Point[][];
}

export function insidePolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

export function canWalk(
  point: Point,
  boundaries: CampBoundaries = CAMP_BOUNDARY_LAYOUT,
): boolean {
  return (
    insidePolygon(point, boundaries.outline) &&
    !boundaries.blocked.some((polygon) => insidePolygon(point, polygon))
  );
}

export function nearPortal(point: Point): boolean {
  return Math.hypot(point.x - CAMP_PORTAL.x, point.y - CAMP_PORTAL.y) <= 83;
}

export function facing(x: number, y: number): Direction {
  const directions: Direction[] = ["e", "se", "s", "sw", "w", "nw", "n", "ne"];
  return directions[(Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8];
}

export function moveInCamp(
  position: Point,
  input: Point,
  seconds: number,
  boundaries?: CampBoundaries,
): Point {
  const length = Math.hypot(input.x, input.y);
  if (!length) return { ...position };
  const distance = 165 * Math.min(Math.max(seconds, 0), 0.05);
  const dx = (input.x / Math.max(1, length)) * distance;
  const dy = (input.y / Math.max(1, length)) * distance;
  const next = { ...position };
  // Resolve axes separately so the marine slides along props rather than sticking.
  if (canWalk({ x: next.x + dx, y: next.y }, boundaries)) next.x += dx;
  if (canWalk({ x: next.x, y: next.y + dy }, boundaries)) next.y += dy;
  return next;
}
