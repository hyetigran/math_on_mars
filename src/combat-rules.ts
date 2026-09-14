import {
  MISSION_PRESETS,
  missionLengthForWaves,
} from "../content/balance/missions";
import { splitEnemy } from "./overmind";
import {
  ENEMY_SPAWNS,
  SPLITTER_BALANCE,
  OVERMIND_BALANCE,
} from "../content/balance/enemies";
import { moveEnemy, advanceEnemyProjectiles } from "./enemy-attacks";
import { omniRateBonus } from "./forge";
import { STATUS_BALANCE } from "../content/balance/status";
import { CHAIN_BALANCE } from "../content/balance/chain";
import { AMMO_BALANCE } from "../content/balance/ammo";
import { acquireAmmo, drawAmmo } from "./ammo";
import { moduleTotal } from "./modules";
import {
  AMMO_TYPES,
  type Ammo,
  type AmmoInventory,
  type AmmoType,
  type CombatBoltSaveV2,
  type CombatEnemySaveV2,
  type CombatSave,
  type CombatSaveV2,
  type CombatShotSave,
  type Module,
} from "./types";

export interface CombatSnapshot {
  ammoInventory?: AmmoInventory;
  simulationTick?: number;
  hp: number;
  maxHp: number;
  salvage: number;
  medkits: number;
  enemiesLeft: number;
  wave: number;
}

export interface CombatRulesOptions {
  wave: number;
  totalWaves: number;
  difficulty: "easy" | "standard";
  hp: number;
  maxHp: number;
  salvage: number;
  medkits: number;
  ammoBag?: AmmoType[];
  ammoCapacity?: number;
  ammo: Ammo[];
  activeAmmoIds: string[];
  modules: Module[];
  restore?: CombatSave;
  seed: number;
}

type Position = { x: number; y: number };
export interface ChainFlash {
  from: Position;
  to: Position;
}
const STEP_MS = 1000 / 60;
const distance = (a: Position, b: Position): number =>
  Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n));
// A swept collision returns the first entry time along a projectile's segment.
function collisionTime(
  from: Position,
  to: Position,
  enemy: CombatEnemySaveV2,
): number | null {
  const dx = to.x - from.x,
    dy = to.y - from.y;
  const ox = from.x - enemy.x,
    oy = from.y - enemy.y;
  const c = ox * ox + oy * oy - (enemy.radius + 6) ** 2;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (!a) return null;
  const b = 2 * (ox * dx + oy * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

/** Version-one saves keep existing damage reservoirs; legacy in-flight bolts get
 * no new chain/burn allowance because their already-spent volley funds are unknown. */
export function migrateCombatSave(save: CombatSave): CombatSaveV2 {
  if (save.version === 2) return structuredClone(save);
  const shots = save.bolts.map((bolt, i): CombatShotSave => ({
    id: i + 1,
    baseDamage: bolt.damage,
    chainRemaining: 0,
    chainStarted: true,
    chainVisited: [...bolt.hitIds],
    burnFunds: 0,
    frost: bolt.frost,
    fiery: bolt.fiery,
  }));
  return {
    ...structuredClone(save),
    version: 2,
    nextShotId: shots.length + 1,
    nextBoltId: save.bolts.length + 1,
    stepRemainderMs: 0,
    shots,
    enemies: save.enemies.map(({ burnRemainingMs, burnDps, ...enemy }) => ({
      ...enemy,
      burnRemainingDamage: (burnDps * burnRemainingMs) / 1000,
      burnRate: burnDps,
    })),
    bolts: save.bolts.map(
      ({ chain: _chain, frost: _frost, fiery: _fiery, ...bolt }, i) => ({
        ...bolt,
        id: i + 1,
        shotId: i + 1,
      }),
    ),
  };
}

/** All combat state and damage rules live here, independently of Phaser/time/DOM. */
export class CombatSimulation {
  readonly state: CombatSaveV2;
  readonly baseDamage: number;
  readonly shotDelay: number;
  readonly moveSpeed: number;
  outcome: "victory" | "defeat" | null = null;
  private chainFlashes: ChainFlash[] = [];

  constructor(private readonly options: CombatRulesOptions) {
    this.baseDamage = 18 * (1 + moduleTotal(options.modules, "damage"));
    this.shotDelay =
      520 /
      ((1 + moduleTotal(options.modules, "attackSpeed")) *
        (1 +
          omniRateBonus({
            ...options,
            ammoCapacity: options.ammoCapacity ?? 1,
          })));
    this.moveSpeed = 220 * (1 + moduleTotal(options.modules, "moveSpeed"));
    const mission = MISSION_PRESETS[missionLengthForWaves(options.totalWaves)];
    this.state =
      options.restore?.wave === options.wave
        ? migrateCombatSave(options.restore)
        : {
            version: 2,
            wave: options.wave,
            hp: options.hp,
            salvage: options.salvage,
            medkits: options.medkits,
            marine: {
              x: 480,
              y:
                options.wave === options.totalWaves
                  ? OVERMIND_BALANCE.marineSpawnY
                  : 270,
            },
            spawned: 0,
            spawnTotal:
              options.wave === options.totalWaves
                ? 1
                : Math.min(
                    mission.baseEnemies + options.wave * mission.enemiesPerWave,
                    mission.maximumEnemies,
                  ),
            nextEnemyId: 1,
            rngState: options.seed,
            spawnCooldownMs: this.spawnDelay(),
            shotCooldownMs: 0,
            nextShotId: 1,
            nextBoltId: 1,
            stepRemainderMs: 0,
            pickups: [],
            shots: [],
            enemies: [],
            bolts: [],
          };
    this.state.ammoInventory ??= structuredClone({
      ammo: options.ammo,
      activeAmmoIds: options.activeAmmoIds,
      ammoCapacity: options.ammoCapacity ?? 1,
      ammoBag: options.ammoBag ?? [],
    });
  }

  private spawnDelay(): number {
    return this.options.wave === this.options.totalWaves ? 100 : 560;
  }
  private random(): number {
    this.state.rngState = (this.state.rngState * 1664525 + 1013904223) >>> 0;
    return this.state.rngState / 4294967296;
  }
  private randomBetween(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  private spawnEnemy(): void {
    const boss = this.options.wave === this.options.totalWaves;
    const edge = this.randomBetween(0, 3);
    const x = edge === 0 ? 40 : edge === 1 ? 920 : this.randomBetween(40, 920);
    const y = edge === 2 ? 40 : edge === 3 ? 500 : this.randomBetween(40, 500);
    const hp = boss ? 620 : 42 + this.options.wave * 10;
    const schedule =
      missionLengthForWaves(this.options.totalWaves) === "short"
        ? "shortWave"
        : "standardWave";
    const cycleIndex = this.state.spawned % ENEMY_SPAWNS.cycleLength;
    this.state.enemies.push({
      id: this.state.nextEnemyId++,
      x: boss ? OVERMIND_BALANCE.spawnX : x,
      y: boss ? OVERMIND_BALANCE.spawnY : y,
      hp,
      maxHp: hp,
      radius: boss ? 58 : 24,
      boss,
      kind: boss
        ? "overmind"
        : this.options.wave >= SPLITTER_BALANCE[schedule] &&
            cycleIndex === SPLITTER_BALANCE.cycleIndex
          ? "splitter"
          : !boss &&
              this.options.wave >= ENEMY_SPAWNS.charger[schedule] &&
              cycleIndex === ENEMY_SPAWNS.charger.cycleIndex
            ? "charger"
            : !boss &&
                this.options.wave >= ENEMY_SPAWNS.spitter[schedule] &&
                cycleIndex === ENEMY_SPAWNS.spitter.cycleIndex
              ? "spitter"
              : "drifter",
      speed:
        (boss ? 32 : 45 + this.options.wave * 7) *
        (this.options.difficulty === "easy" ? 0.82 : 1),
      slowRemainingMs: 0,
      slowAmount: 0,
      burnRemainingDamage: 0,
      burnRate: 0,
    });
    this.state.spawned++;
  }

  private activeTiers(): Record<AmmoType, number> {
    const tiers: Record<AmmoType, number> = {
      Piercing: 0,
      "Multi Shot": 0,
      "Electric Chain": 0,
      Frost: 0,
      Fiery: 0,
    };
    for (const id of this.state.ammoInventory!.activeAmmoIds) {
      const ammo = this.state.ammoInventory!.ammo.find((a) => a.id === id);
      if (!ammo) continue;
      if (ammo.legendary) for (const type of AMMO_TYPES) tiers[type] = 4;
      else tiers[ammo.type] = Math.max(tiers[ammo.type], ammo.tier);
    }
    return tiers;
  }

  private fire(): void {
    const state = this.state;
    if (state.shotCooldownMs > 0 || !state.enemies.length) return;
    const tiers = this.activeTiers();
    const pellets = tiers["Multi Shot"] ? tiers["Multi Shot"] + 1 : 1;
    if (state.bolts.length + pellets > 160) return;
    const origin = { x: state.marine.x + 32, y: state.marine.y - 26 };
    const target = [...state.enemies]
      .filter((e) => e.hp > 0)
      .sort(
        (a, b) => distance(origin, a) - distance(origin, b) || a.id - b.id,
      )[0];
    if (!target) return;
    const shot: CombatShotSave = {
      id: state.nextShotId++,
      baseDamage: this.baseDamage,
      chainRemaining: tiers["Electric Chain"],
      chainStarted: false,
      chainVisited: [],
      burnFunds: STATUS_BALANCE.burnFractions[tiers.Fiery] * this.baseDamage,
      frost: tiers.Frost,
      fiery: tiers.Fiery,
    };
    state.shots.push(shot);
    const damage =
      (this.baseDamage * [1, 1.15, 1.3, 1.45, 1.6][tiers["Multi Shot"]]) /
      pellets;
    const angle = Math.atan2(target.y - origin.y, target.x - origin.x);
    for (let i = 0; i < pellets; i++) {
      const spread = (i - (pellets - 1) / 2) * 0.12;
      state.bolts.push({
        id: state.nextBoltId++,
        shotId: shot.id,
        ...origin,
        vx:
          Math.cos(angle + spread) *
          560 *
          (1 + moduleTotal(this.options.modules, "projectileSpeed")),
        vy:
          Math.sin(angle + spread) *
          560 *
          (1 + moduleTotal(this.options.modules, "projectileSpeed")),
        damage,
        pierce: tiers.Piercing,
        hitIds: [],
      });
    }
    state.shotCooldownMs = this.shotDelay;
  }

  private applyEffects(
    shot: CombatShotSave,
    enemy: CombatEnemySaveV2,
    damage: number,
  ): void {
    if (shot.frost) {
      enemy.slowAmount = Math.max(
        enemy.slowRemainingMs > 0 ? enemy.slowAmount : 0,
        STATUS_BALANCE.slowFractions[shot.frost] *
          (enemy.boss ? STATUS_BALANCE.bossSlowMultiplier : 1),
      );
      enemy.slowRemainingMs = STATUS_BALANCE.slowDurationMs;
    }
    if (shot.fiery && shot.burnFunds > 0) {
      const rate = Math.max(
        enemy.burnRate,
        (STATUS_BALANCE.burnFractions[shot.fiery] * damage) /
          STATUS_BALANCE.burnDurationSeconds,
      );
      const added = Math.min(
        shot.burnFunds,
        Math.max(
          0,
          STATUS_BALANCE.burnDurationSeconds * rate - enemy.burnRemainingDamage,
        ),
      );
      if (added > 0) {
        shot.burnFunds -= added;
        enemy.burnRemainingDamage += added;
        enemy.burnRate = rate;
      }
    }
  }

  private applyHit(bolt: CombatBoltSaveV2, enemy: CombatEnemySaveV2): void {
    const shot = this.state.shots.find((s) => s.id === bolt.shotId)!;
    enemy.hp -= bolt.damage;
    this.applyEffects(shot, enemy, bolt.damage);
    if (shot.chainStarted) return;
    shot.chainStarted = true;
    shot.chainVisited.push(enemy.id);
    let preceding = enemy;
    while (shot.chainRemaining > 0) {
      const target = this.state.enemies
        .filter(
          (e) =>
            e.hp > 0 &&
            !shot.chainVisited.includes(e.id) &&
            distance(preceding, e) <= CHAIN_BALANCE.range,
        )
        .sort(
          (a, b) =>
            distance(preceding, a) - distance(preceding, b) || a.id - b.id,
        )[0];
      if (!target) break;
      shot.chainRemaining--;
      shot.chainVisited.push(target.id);
      const damage = shot.baseDamage * CHAIN_BALANCE.damageFraction;
      target.hp -= damage;
      this.applyEffects(shot, target, damage);
      this.chainFlashes.push({
        from: { x: preceding.x, y: preceding.y },
        to: { x: target.x, y: target.y },
      });
      preceding = target;
    }
  }

  advance(deltaMs: number, movement: Position = { x: 0, y: 0 }): void {
    if (this.outcome) return;
    this.state.stepRemainderMs += clamp(deltaMs, 0, 100);
    while (this.state.stepRemainderMs + 1e-8 >= STEP_MS && !this.outcome) {
      this.state.stepRemainderMs = Math.max(
        0,
        this.state.stepRemainderMs - STEP_MS,
      );
      this.step(movement);
    }
  }

  private step(movement: Position): void {
    const state = this.state,
      dt = STEP_MS / 1000;
    state.simulationTick = (state.simulationTick ?? 0) + 1;
    state.spawnCooldownMs = Math.max(0, state.spawnCooldownMs - STEP_MS);
    if (state.spawned < state.spawnTotal && state.spawnCooldownMs === 0) {
      this.spawnEnemy();
      state.spawnCooldownMs = this.spawnDelay();
    }
    const norm = Math.max(1, Math.hypot(movement.x, movement.y));
    state.marine.x = clamp(
      state.marine.x + (movement.x / norm) * this.moveSpeed * dt,
      44,
      916,
    );
    state.marine.y = clamp(
      state.marine.y + (movement.y / norm) * this.moveSpeed * dt,
      58,
      495,
    );
    // Settle old reservoirs before new impacts fund them at this timestamp.
    for (const enemy of state.enemies) {
      const burn = Math.min(enemy.burnRemainingDamage, enemy.burnRate * dt);
      enemy.hp -= burn;
      enemy.burnRemainingDamage -= burn;
      if (enemy.burnRemainingDamage <= 0) enemy.burnRate = 0;
      const slow = enemy.slowRemainingMs > 0 ? 1 - enemy.slowAmount : 1;
      enemy.slowRemainingMs = Math.max(0, enemy.slowRemainingMs - STEP_MS);
      if (enemy.hp > 0)
        moveEnemy(
          enemy,
          state,
          STEP_MS,
          slow,
          20 / (20 + Math.min(20, moduleTotal(this.options.modules, "armor"))),
        );
    }
    state.shotCooldownMs = Math.max(0, state.shotCooldownMs - STEP_MS);
    this.fire();
    const surviving: CombatBoltSaveV2[] = [];
    for (const bolt of state.bolts) {
      const from = { x: bolt.x, y: bolt.y },
        to = { x: bolt.x + bolt.vx * dt, y: bolt.y + bolt.vy * dt };
      const collisions = state.enemies
        .filter((enemy) => enemy.hp > 0 && !bolt.hitIds.includes(enemy.id))
        .map((enemy) => ({ enemy, time: collisionTime(from, to, enemy) }))
        .filter(
          (hit): hit is { enemy: CombatEnemySaveV2; time: number } =>
            hit.time !== null,
        )
        .sort((a, b) => a.time - b.time || a.enemy.id - b.enemy.id);
      let removed = false;
      for (const { enemy } of collisions) {
        if (enemy.hp <= 0) continue;
        bolt.hitIds.push(enemy.id);
        this.applyHit(bolt, enemy);
        if (bolt.pierce > 0) {
          bolt.pierce--;
          bolt.damage *= 0.5;
        } else {
          removed = true;
          break;
        }
      }
      bolt.x = to.x;
      bolt.y = to.y;
      if (
        !removed &&
        bolt.x >= -20 &&
        bolt.x <= 980 &&
        bolt.y >= -20 &&
        bolt.y <= 560
      )
        surviving.push(bolt);
    }
    state.bolts = surviving;
    const activeShotIds = new Set(surviving.map((b) => b.shotId));
    state.shots = state.shots.filter((s) => activeShotIds.has(s.id));
    state.pickups ??= [];
    const bossDefeated = state.enemies.some(
      (enemy) => enemy.boss && enemy.hp <= 0,
    );
    const children = state.enemies.flatMap((enemy) =>
      enemy.hp <= 0 && enemy.kind === "splitter"
        ? splitEnemy(enemy, state)
        : [],
    );
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0)
        state.pickups.push({
          id: enemy.id,
          x: enemy.x,
          y: enemy.y,
          value: enemy.boss ? 12 : 1,
          ...(enemy.id % AMMO_BALANCE.dropEveryEnemyId === 0
            ? {
                ammo: drawAmmo(
                  state.ammoInventory!,
                  this.options.wave,
                  () => this.random(),
                  `drop-${this.options.wave}-${enemy.id}`,
                ),
              }
            : {}),
        });
      else if (distance(enemy, state.marine) < enemy.radius + 20) {
        const armor = Math.min(20, moduleTotal(this.options.modules, "armor"));
        state.hp -= (((enemy.boss ? 26 : 11) * 20) / (20 + armor)) * dt;
      }
    }
    state.enemies = bossDefeated
      ? []
      : [...state.enemies.filter((e) => e.hp > 0), ...children];
    state.pickups = state.pickups.filter((pickup) => {
      if (
        distance(pickup, state.marine) >
        48 * (1 + moduleTotal(this.options.modules, "pickupRadius"))
      )
        return true;
      state.salvage += pickup.value;
      if (pickup.ammo) acquireAmmo(state.ammoInventory!, [pickup.ammo]);
      return false;
    });
    advanceEnemyProjectiles(
      state,
      STEP_MS,
      20 / (20 + Math.min(20, moduleTotal(this.options.modules, "armor"))),
    );
    state.hp = Math.max(0, state.hp);
    if (state.hp === 0) {
      state.enemyProjectiles = [];
      this.outcome = "defeat";
    } else if (
      state.spawned >= state.spawnTotal &&
      state.enemies.length === 0
    ) {
      state.salvage += state.pickups.reduce(
        (sum, pickup) => sum + pickup.value,
        0,
      );
      for (const pickup of state.pickups)
        if (pickup.ammo) acquireAmmo(state.ammoInventory!, [pickup.ammo]);
      state.pickups = [];
      state.enemyProjectiles = [];
      this.outcome = "victory";
    }
  }

  useMedkit(): void {
    if (
      this.outcome ||
      this.state.medkits < 1 ||
      this.state.hp >= this.options.maxHp
    )
      return;
    this.state.hp = Math.min(
      this.options.maxHp,
      this.state.hp + 35 * (1 + moduleTotal(this.options.modules, "healing")),
    );
    this.state.medkits--;
  }

  serialize(): CombatSaveV2 {
    return structuredClone(this.state);
  }
  drainChainFlashes(): ChainFlash[] {
    const flashes = this.chainFlashes;
    this.chainFlashes = [];
    return flashes;
  }
  snapshot(): CombatSnapshot {
    return {
      ammoInventory: structuredClone(this.state.ammoInventory),
      simulationTick: this.state.simulationTick ?? 0,
      hp: this.state.hp,
      maxHp: this.options.maxHp,
      salvage: this.state.salvage,
      medkits: this.state.medkits,
      wave: this.options.wave,
      enemiesLeft: Math.max(
        0,
        this.state.spawnTotal - this.state.spawned + this.state.enemies.length,
      ),
    };
  }
}
