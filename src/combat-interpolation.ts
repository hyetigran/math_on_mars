import { COMBAT_STEP_MS } from "./combat-rules";
import type { CombatSaveV2 } from "./types";

type Position = { x: number; y: number };
type PreviousPosition = Position & { rendered: Position };

/** Draw one physics step behind, smoothly, without modifying authoritative state. */
export class CombatInterpolation {
  // Weak keys release dead enemies/projectiles; retained poses are reused each frame.
  private positions = new WeakMap<object, PreviousPosition>();
  private marineKey = {};

  constructor(private readonly state: CombatSaveV2) {
    this.capture();
  }

  readonly capture = (): void => {
    // Marine movement can replace its position object when custom bounds are active.
    this.remember(this.marineKey, this.state.marine);
    for (const enemy of this.state.enemies) this.remember(enemy, enemy);
    for (const bolt of this.state.bolts) this.remember(bolt, bolt);
    for (const shot of this.state.enemyProjectiles ?? [])
      this.remember(shot, shot);
  };

  get alpha(): number {
    return Math.max(
      0,
      Math.min(1, this.state.stepRemainderMs / COMBAT_STEP_MS),
    );
  }

  marine(alpha: number): Readonly<Position> {
    return this.sample(this.marineKey, this.state.marine, alpha);
  }

  entity(current: Position, alpha: number): Readonly<Position> {
    return this.sample(current, current, alpha);
  }

  private remember(key: object, current: Position): void {
    const previous = this.positions.get(key);
    if (previous) {
      previous.x = current.x;
      previous.y = current.y;
    } else {
      this.positions.set(key, {
        x: current.x,
        y: current.y,
        rendered: { x: current.x, y: current.y },
      });
    }
  }

  private sample(
    key: object,
    current: Position,
    alpha: number,
  ): Readonly<Position> {
    const previous = this.positions.get(key);
    // A newly spawned entity has no prior pose to blend from.
    if (!previous) return current;
    previous.rendered.x = previous.x + (current.x - previous.x) * alpha;
    previous.rendered.y = previous.y + (current.y - previous.y) * alpha;
    return previous.rendered;
  }
}

/** Preserve the existing 60 Hz camera feel at other refresh rates. */
export function combatCameraLerp(deltaMs: number): number {
  return (
    1 - Math.pow(0.85, Math.max(0, Math.min(100, deltaMs)) / COMBAT_STEP_MS)
  );
}
