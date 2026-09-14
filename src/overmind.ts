import {
  ENEMY_BALANCE,
  OVERMIND_BALANCE,
  SPLITTER_BALANCE,
} from "../content/balance/enemies";
import type { CombatEnemySaveV2, CombatSaveV2 } from "./types";

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
    x: Math.max(24, Math.min(936, parent.x + offset)),
    y: Math.max(24, Math.min(516, parent.y)),
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
    if (attack.remainingMs > 0) return;
    const x = state.marine.x - enemy.x,
      y = state.marine.y - enemy.y;
    const distance = Math.hypot(x, y);
    attack.dx = distance ? x / distance : 1;
    attack.dy = distance ? y / distance : 0;
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
      const direction = Math.atan2(attack.dy, attack.dx);
      for (let i = 0; i < tuning.fanCount; i++) {
        const angle =
          direction + (i / (tuning.fanCount - 1) - 0.5) * tuning.fanSpread;
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
