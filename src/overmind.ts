import { clampBattleX, clampBattleY } from "./battle-world";
import {
  ENEMY_BALANCE,
  OVERMIND_BALANCE,
  SPLITTER_BALANCE,
} from "../content/balance/enemies";
import type { CombatEnemySaveV2, CombatSaveV2 } from "./types";

export function overmindFanAngles(dx: number, dy: number): number[] {
  const direction = Math.atan2(dy, dx);
  return Array.from(
    { length: OVERMIND_BALANCE.fanCount },
    (_, i) =>
      direction +
      (i / (OVERMIND_BALANCE.fanCount - 1) - 0.5) * OVERMIND_BALANCE.fanSpread,
  );
}

function mini(
  parent: CombatEnemySaveV2,
  state: CombatSaveV2,
  offset: number,
  hp: number,
  speed: number,
): CombatEnemySaveV2 {
  return {
    id: state.nextEnemyId++,
    kind: "mini",
    boss: false,
    x: clampBattleX(parent.x + offset, SPLITTER_BALANCE.childRadius),
    y: clampBattleY(parent.y, SPLITTER_BALANCE.childRadius),
    hp,
    maxHp: hp,
    speed,
    radius: SPLITTER_BALANCE.childRadius,
    slowRemainingMs: 0,
    slowAmount: 0,
    burnRemainingDamage: 0,
    burnRate: 0,
  };
}

export function splitEnemy(
  enemy: CombatEnemySaveV2,
  state: CombatSaveV2,
): CombatEnemySaveV2[] {
  return Array.from({ length: SPLITTER_BALANCE.children }, (_, index) =>
    mini(
      enemy,
      state,
      (index ? 1 : -1) * 18,
      enemy.maxHp * SPLITTER_BALANCE.childHpFraction,
      enemy.speed * SPLITTER_BALANCE.childSpeedMultiplier,
    ),
  );
}

export function moveOvermind(
  enemy: CombatEnemySaveV2,
  state: CombatSaveV2,
  deltaMs: number,
  slow: number,
  armorMultiplier: number,
): void {
  const tuning = OVERMIND_BALANCE;
  const attack = (enemy.bossAttack ??= {
    pattern: "slam",
    phase: "cooldown",
    remainingMs: tuning.cooldownMs,
    dx: 1,
    dy: 0,
    hit: false,
    summons: 0,
  });
  attack.remainingMs = Math.max(0, attack.remainingMs - deltaMs);
  if (attack.phase === "cooldown") {
    const distance = Math.hypot(
      state.marine.x - enemy.x,
      state.marine.y - enemy.y,
    );
    if (distance > enemy.radius + 20) {
      const travel = Math.min(
        distance - enemy.radius - 20,
        (enemy.speed * slow * deltaMs) / 1000,
      );
      enemy.x += ((state.marine.x - enemy.x) / distance) * travel;
      enemy.y += ((state.marine.y - enemy.y) / distance) * travel;
    }
    if (attack.remainingMs > 0) return;
    const x = state.marine.x - enemy.x,
      y = state.marine.y - enemy.y;
    const aimDistance = Math.hypot(x, y);
    attack.dx = aimDistance ? x / aimDistance : 1;
    attack.dy = aimDistance ? y / aimDistance : 0;
    attack.hit = false;
    attack.phase = "windup";
    attack.remainingMs = tuning.windupMs;
    return;
  }
  if (attack.phase === "windup") {
    if (attack.remainingMs > 0) return;
    attack.phase = "active";
    attack.remainingMs = attack.pattern === "slam" ? tuning.slamDurationMs : 0;
    if (attack.pattern === "fan") {
      state.enemyProjectiles ??= [];
      state.nextEnemyProjectileId ??= 1;
      for (const angle of overmindFanAngles(attack.dx, attack.dy)) {
        state.enemyProjectiles.push({
          id: state.nextEnemyProjectileId++,
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * ENEMY_BALANCE.spitter.projectileSpeed,
          vy: Math.sin(angle) * ENEMY_BALANCE.spitter.projectileSpeed,
          damage: ENEMY_BALANCE.spitter.damage,
          remainingMs: ENEMY_BALANCE.spitter.projectileLifeMs,
        });
      }
    } else if (attack.pattern === "summon") {
      const count = Math.min(
        tuning.summonsPerAttack,
        tuning.summonLimit - attack.summons,
      );
      for (let i = 0; i < count; i++)
        state.enemies.push(
          mini(
            enemy,
            state,
            (i ? 1 : -1) * 65,
            tuning.summonHp,
            tuning.summonSpeed,
          ),
        );
      attack.summons += count;
    }
  }
  if (attack.pattern === "slam") {
    const radius =
      tuning.slamRadius * (1 - attack.remainingMs / tuning.slamDurationMs);
    const previousRadius = Math.max(
      0,
      radius - (tuning.slamRadius * deltaMs) / tuning.slamDurationMs,
    );
    const distance = Math.hypot(
      state.marine.x - enemy.x,
      state.marine.y - enemy.y,
    );
    if (
      !attack.hit &&
      distance >= previousRadius - 24 &&
      distance <= radius + 24
    ) {
      state.hp -= tuning.slamDamage * armorMultiplier;
      attack.hit = true;
    }
  }
  if (attack.remainingMs === 0) {
    attack.pattern =
      attack.pattern === "slam"
        ? "fan"
        : attack.pattern === "fan" && attack.summons < tuning.summonLimit
          ? "summon"
          : "slam";
    attack.phase = "cooldown";
    attack.remainingMs = tuning.cooldownMs;
  }
}
