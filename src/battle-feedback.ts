import type { CombatSaveV2 } from "./types";

type EnemyFeedback = {
  hp: number;
  boss: boolean;
  kind: string;
  phase: string;
  pattern?: string;
  frost: number;
  burn: number;
};
/** Small snapshots preserve transitions without retaining mutable simulation objects. */
export class BattleFeedback {
  private enemies = new Map<number, EnemyFeedback>();
  private hp: number;
  private salvage: number;
  private chests: number;
  private shot: number;
  private enemyShot: number;
  private x: number;
  private y: number;
  private travel = 0;
  private foot = 0;
  private fire = 0;
  constructor(
    state: CombatSaveV2,
    private readonly maxHp: number,
  ) {
    this.hp = state.hp;
    this.salvage = state.salvage;
    this.chests = state.chestLoot?.length ?? 0;
    this.shot = state.nextShotId;
    this.enemyShot = state.nextEnemyProjectileId ?? 1;
    this.x = state.marine.x;
    this.y = state.marine.y;
    this.captureEnemies(state);
  }
  private captureEnemies(state: CombatSaveV2): void {
    this.enemies = new Map(
      state.enemies.map((e) => [
        e.id,
        {
          hp: e.hp,
          boss: e.boss,
          kind: e.kind ?? "drifter",
          phase: e.bossAttack?.phase ?? e.attack?.phase ?? "cooldown",
          pattern: e.bossAttack?.pattern,
          frost: e.slowRemainingMs,
          burn: e.burnRemainingDamage,
        },
      ]),
    );
  }
  update(state: CombatSaveV2): string[] {
    const cues = new Set<string>();
    this.travel += Math.hypot(state.marine.x - this.x, state.marine.y - this.y);
    this.x = state.marine.x;
    this.y = state.marine.y;
    if (this.travel >= 28) {
      this.travel %= 28;
      cues.add(`marine_footstep_0${(this.foot++ % 4) + 1}`);
    }
    if (state.nextShotId > this.shot) {
      const inventory = state.ammoInventory;
      const ammo =
        inventory?.ammo.filter((a) => inventory.activeAmmoIds.includes(a.id)) ??
        [];
      cues.add(
        ammo.some((a) => a.legendary)
          ? "ammo_omni_fire"
          : `blaster_fire_0${(this.fire++ % 3) + 1}`,
      );
      if (ammo.some((a) => a.type === "Multi Shot" && !a.legendary))
        cues.add("ammo_multishot_accent");
    }
    this.shot = state.nextShotId;
    if (
      (state.nextEnemyProjectileId ?? 1) > this.enemyShot &&
      state.enemies.some((e) => e.kind === "spitter")
    )
      cues.add("spitter_fire");
    this.enemyShot = state.nextEnemyProjectileId ?? 1;
    if (state.hp < this.hp)
      cues.add(state.hp === 0 ? "marine_shutdown" : "marine_damage");
    if (
      state.hp > 0 &&
      state.hp <= this.maxHp * 0.25 &&
      this.hp > this.maxHp * 0.25
    )
      cues.add("marine_low_health");
    this.hp = state.hp;
    if (state.salvage > this.salvage) cues.add("salvage_pickup_01");
    if ((state.chestLoot?.length ?? 0) > this.chests) cues.add("ammo_pickup");
    this.salvage = state.salvage;
    this.chests = state.chestLoot?.length ?? 0;
    const ids = new Set(state.enemies.map((e) => e.id));
    for (const [id, old] of this.enemies)
      if (!ids.has(id)) {
        cues.add(
          old.boss
            ? "overmind_death"
            : old.kind === "splitter"
              ? "splitter_divide"
              : "slime_death",
        );
      }
    for (const e of state.enemies) {
      const old = this.enemies.get(e.id);
      if (!old) {
        if (e.boss) cues.add("overmind_enter");
        continue;
      }
      if (e.hp < old.hp) cues.add("slime_hit_01");
      if (e.slowRemainingMs > old.frost) cues.add("ammo_frost_apply");
      if (e.burnRemainingDamage > old.burn) cues.add("ammo_fiery_apply");
      const phase = e.bossAttack?.phase ?? e.attack?.phase ?? "cooldown";
      const kind = e.boss ? "overmind" : e.kind;
      if (phase === "windup" && old.phase !== "windup")
        cues.add(`${kind}_windup`);
      if (old.phase === "windup" && phase !== "windup") {
        if (e.boss) cues.add(`overmind_${old.pattern}`);
        else if (e.kind === "charger") cues.add("charger_rush");
        else if (e.kind === "spitter") cues.add("spitter_fire");
      }
    }
    this.captureEnemies(state);
    return [...cues];
  }
}
