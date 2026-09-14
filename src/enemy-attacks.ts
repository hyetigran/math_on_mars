import { moveOvermind } from "./overmind";
import { ENEMY_BALANCE } from "../content/balance/enemies";
import type { CombatEnemySaveV2, CombatSaveV2 } from "./types";

function intersectsPlayer(
  from: { x: number; y: number },
  to: { x: number; y: number },
  player: { x: number; y: number },
  radius: number,
): boolean {
  const dx = to.x - from.x,
    dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared
    ? Math.max(
        0,
        Math.min(
          1,
          ((player.x - from.x) * dx + (player.y - from.y) * dy) / lengthSquared,
        ),
      )
    : 0;
  return (
    Math.hypot(player.x - from.x - t * dx, player.y - from.y - t * dy) <= radius
  );
}

export function moveEnemy(
  enemy: CombatEnemySaveV2,
  state: CombatSaveV2,
  deltaMs: number,
  slow: number,
  armorMultiplier: number,
): void {
  const x = state.marine.x - enemy.x,
    y = state.marine.y - enemy.y;
  const distance = Math.hypot(x, y);
  const dx = distance ? x / distance : 1,
    dy = distance ? y / distance : 0;
  const kind = enemy.kind ?? "drifter";
  if (enemy.boss) {
    moveOvermind(enemy, state, deltaMs, armorMultiplier);
    return;
  }
  if (kind !== "spitter" && kind !== "charger") {
    enemy.x += (dx * enemy.speed * slow * deltaMs) / 1000;
    enemy.y += (dy * enemy.speed * slow * deltaMs) / 1000;
    return;
  }
  const tuning = ENEMY_BALANCE[kind];
  const attack = (enemy.attack ??= {
    phase: "cooldown",
    remainingMs: tuning.cooldownMs,
    dx,
    dy,
    hit: false,
  });
  attack.remainingMs = Math.max(0, attack.remainingMs - deltaMs);
  if (attack.phase === "cooldown") {
    if (kind === "charger" || distance > ENEMY_BALANCE.spitter.range) {
      enemy.x += (dx * enemy.speed * slow * deltaMs) / 1000;
      enemy.y += (dy * enemy.speed * slow * deltaMs) / 1000;
    }
    if (attack.remainingMs === 0)
      Object.assign(attack, {
        phase: "windup",
        remainingMs: tuning.windupMs,
        dx,
        dy,
        hit: false,
      });
    return;
  }
  if (attack.phase === "windup") {
    if (attack.remainingMs > 0) return;
    if (kind === "spitter") {
      state.nextEnemyProjectileId ??= 1;
      state.enemyProjectiles ??= [];
      const shot = ENEMY_BALANCE.spitter;
      state.enemyProjectiles.push({
        id: state.nextEnemyProjectileId++,
        x: enemy.x,
        y: enemy.y,
        vx: attack.dx * shot.projectileSpeed,
        vy: attack.dy * shot.projectileSpeed,
        damage: shot.damage,
        remainingMs: shot.projectileLifeMs,
      });
      attack.phase = "cooldown";
      attack.remainingMs = tuning.cooldownMs;
      return;
    }
    attack.phase = "active";
    attack.remainingMs = ENEMY_BALANCE.charger.activeMs;
  }
  const from = { x: enemy.x, y: enemy.y };
  enemy.x += (attack.dx * ENEMY_BALANCE.charger.speed * slow * deltaMs) / 1000;
  enemy.y += (attack.dy * ENEMY_BALANCE.charger.speed * slow * deltaMs) / 1000;
  if (
    !attack.hit &&
    intersectsPlayer(from, enemy, state.marine, enemy.radius + 20)
  ) {
    state.hp -= ENEMY_BALANCE.charger.damage * armorMultiplier;
    attack.hit = true;
  }
  enemy.x = Math.max(24, Math.min(936, enemy.x));
  enemy.y = Math.max(24, Math.min(516, enemy.y));
  if (attack.remainingMs === 0) {
    attack.phase = "cooldown";
    attack.remainingMs = tuning.cooldownMs;
  }
}

export function advanceEnemyProjectiles(
  state: CombatSaveV2,
  deltaMs: number,
  armorMultiplier: number,
): void {
  if (!state.enemyProjectiles) return;
  state.enemyProjectiles = state.enemyProjectiles.filter((shot) => {
    const from = { x: shot.x, y: shot.y };
    shot.x += (shot.vx * deltaMs) / 1000;
    shot.y += (shot.vy * deltaMs) / 1000;
    shot.remainingMs = Math.max(0, shot.remainingMs - deltaMs);
    if (intersectsPlayer(from, shot, state.marine, 26)) {
      state.hp -= shot.damage * armorMultiplier;
      return false;
    }
    return (
      shot.remainingMs > 0 &&
      shot.x >= 0 &&
      shot.x <= 960 &&
      shot.y >= 0 &&
      shot.y <= 540
    );
  });
}
