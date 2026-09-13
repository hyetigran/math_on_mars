import Phaser from "phaser";
import type { Ammo, AmmoType, Module } from "./types";

export interface CombatSnapshot {
  hp: number;
  maxHp: number;
  salvage: number;
  medkits: number;
  enemiesLeft: number;
  wave: number;
}

interface Enemy {
  id: number;
  body: Phaser.GameObjects.Container;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  boss: boolean;
  slowUntil: number;
  slowAmount: number;
  burnUntil: number;
  burnDps: number;
}

interface Bolt {
  body: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  damage: number;
  pierce: number;
  hit: Set<number>;
  chain: number;
  frost: number;
  fiery: number;
}

interface CombatOptions {
  parent: HTMLElement;
  wave: number;
  totalWaves: number;
  difficulty: "easy" | "standard";
  hp: number;
  maxHp: number;
  salvage: number;
  medkits: number;
  ammo: Ammo[];
  activeAmmoIds: string[];
  modules: Module[];
  onHud: (state: CombatSnapshot) => void;
  onComplete: (state: CombatSnapshot) => void;
  onDefeat: (state: CombatSnapshot) => void;
}

function moduleTotal(modules: Module[], stat: Module["stat"]): number {
  return modules.filter((m) => m.stat === stat).reduce((sum, m) => sum + m.value, 0);
}

export class CombatController {
  private game: Phaser.Game;
  private scene?: MarsCombatScene;

  constructor(options: CombatOptions) {
    const controller = this;
    class BoundScene extends MarsCombatScene {
      constructor() {
        super(options);
        controller.scene = this;
      }
    }
    this.game = new Phaser.Game({
      type: Phaser.CANVAS,
      width: 960,
      height: 540,
      parent: options.parent,
      backgroundColor: "#8e3f2c",
      render: { antialias: true, pixelArt: false },
      input: { activePointers: 3 },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: BoundScene,
      audio: { noAudio: true },
    });
  }

  setTouchVector(x: number, y: number): void {
    this.scene?.setTouchVector(x, y);
  }

  useMedkit(): void {
    this.scene?.useMedkit();
  }

  pause(): void {
    this.scene?.scene.pause();
  }

  resume(): void {
    this.scene?.scene.resume();
  }

  destroy(): void {
    this.game.destroy(true);
  }
}

class MarsCombatScene extends Phaser.Scene {
  private options: CombatOptions;
  private marine!: Phaser.GameObjects.Container;
  private enemies: Enemy[] = [];
  private bolts: Bolt[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private touch = new Phaser.Math.Vector2();
  private nextEnemyId = 1;
  private spawned = 0;
  private spawnTotal = 0;
  private lastSpawn = 0;
  private lastShot = 0;
  private hp: number;
  private salvage: number;
  private medkits: number;
  private ended = false;
  private hudAt = 0;
  private baseDamage = 18;
  private shotDelay = 520;
  private moveSpeed = 220;

  constructor(options: CombatOptions) {
    super("mars-combat");
    this.options = options;
    this.hp = options.hp;
    this.salvage = options.salvage;
    this.medkits = options.medkits;
    this.baseDamage *= 1 + moduleTotal(options.modules, "damage");
    this.shotDelay /= 1 + moduleTotal(options.modules, "attackSpeed");
    this.moveSpeed *= 1 + moduleTotal(options.modules, "moveSpeed");
  }

  create(): void {
    this.drawArena();
    this.marine = this.makeMarine(480, 270);
    this.spawnTotal = this.options.wave === this.options.totalWaves ? 1 : (this.options.wave === 1 ? 10 : 16);
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard?.on("keydown-Q", () => this.useMedkit());
    this.publishHud(0);
  }

  private drawArena(): void {
    const g = this.add.graphics();
    g.fillStyle(0xa94f34, 1).fillRect(0, 0, 960, 540);
    g.fillStyle(0x8b3d2d, 0.55);
    for (let i = 0; i < 34; i++) {
      const x = (i * 163 + 37) % 960;
      const y = (i * 97 + 61) % 540;
      g.fillCircle(x, y, 3 + (i % 5));
    }
    g.fillStyle(0x272936, 1).fillRoundedRect(20, 24, 190, 74, 16);
    g.fillStyle(0x343746, 1).fillRoundedRect(745, 430, 190, 82, 16);
    g.lineStyle(5, 0xd67542, 1).strokeRoundedRect(28, 32, 174, 58, 12);
    g.lineStyle(2, 0xe07a57, 0.4).strokeCircle(480, 270, 155);
    g.lineStyle(2, 0xe07a57, 0.25).strokeCircle(480, 270, 235);
  }

  private makeMarine(x: number, y: number): Phaser.GameObjects.Container {
    const shadow = this.add.ellipse(0, 18, 44, 18, 0x211b20, 0.35);
    const body = this.add.rectangle(0, 4, 32, 38, 0xece5d3).setStrokeStyle(4, 0x17202c);
    const helmet = this.add.ellipse(0, -18, 43, 34, 0xf5eedf).setStrokeStyle(4, 0x17202c);
    const visor = this.add.rectangle(5, -18, 29, 9, 0x39d7e6).setStrokeStyle(2, 0x102431);
    const pack = this.add.rectangle(-19, 3, 12, 25, 0x27334b).setStrokeStyle(3, 0x17202c);
    const patch = this.add.rectangle(17, 1, 7, 9, 0xf27a35);
    const gun = this.add.rectangle(22, -31, 29, 9, 0xd9e1df).setStrokeStyle(3, 0x17202c);
    const muzzle = this.add.circle(38, -31, 5, 0x35d9ef).setStrokeStyle(2, 0x17202c);
    return this.add.container(x, y, [shadow, pack, body, helmet, visor, patch, gun, muzzle]).setDepth(5);
  }

  private spawnEnemy(): void {
    const boss = this.options.wave === this.options.totalWaves;
    const edge = Phaser.Math.Between(0, 3);
    const margin = 40;
    let x = edge === 0 ? margin : edge === 1 ? 960 - margin : Phaser.Math.Between(margin, 960 - margin);
    let y = edge === 2 ? margin : edge === 3 ? 540 - margin : Phaser.Math.Between(margin, 540 - margin);
    const color = boss ? 0xc147a3 : this.options.wave === 2 ? 0x9ddf3c : 0x75e353;
    const radius = boss ? 58 : 24;
    const shadow = this.add.ellipse(0, radius * 0.55, radius * 1.8, radius * 0.55, 0x211b20, 0.28);
    const blob = this.add.ellipse(0, 0, radius * 2, radius * 1.65, color).setStrokeStyle(boss ? 7 : 4, 0x263022);
    const core = this.add.circle(0, 3, boss ? 20 : 8, boss ? 0xffc65e : 0xf3f179).setStrokeStyle(2, 0x58632e);
    const eye1 = this.add.circle(-8, -8, boss ? 4 : 3, 0x18211b);
    const eye2 = this.add.circle(8, -8, boss ? 4 : 3, 0x18211b);
    const shine = this.add.ellipse(-radius * 0.3, -radius * 0.32, radius * 0.35, radius * 0.18, 0xffffff, 0.45);
    const body = this.add.container(x, y, [shadow, blob, core, eye1, eye2, shine]).setDepth(4);
    const baseHp = boss ? 620 : 42 + this.options.wave * 10;
    this.enemies.push({
      id: this.nextEnemyId++, body, hp: baseHp, maxHp: baseHp,
      speed: (boss ? 32 : 45 + this.options.wave * 7) * (this.options.difficulty === "easy" ? 0.82 : 1),
      radius, boss, slowUntil: 0, slowAmount: 0, burnUntil: 0, burnDps: 0,
    });
  }

  private activeTiers(): Record<AmmoType, number> {
    const result: Record<AmmoType, number> = { Piercing: 0, "Multi Shot": 0, "Electric Chain": 0, Frost: 0, Fiery: 0 };
    for (const id of this.options.activeAmmoIds) {
      const ammo = this.options.ammo.find((a) => a.id === id);
      if (!ammo) continue;
      if (ammo.legendary) for (const key of Object.keys(result) as AmmoType[]) result[key] = Math.max(result[key], 4);
      else result[ammo.type] = Math.max(result[ammo.type], ammo.tier);
    }
    return result;
  }

  private fire(now: number): void {
    if (!this.enemies.length || now - this.lastShot < this.shotDelay) return;
    this.lastShot = now;
    const target = this.enemies.reduce((best, enemy) =>
      Phaser.Math.Distance.Between(this.marine.x, this.marine.y, enemy.body.x, enemy.body.y) <
      Phaser.Math.Distance.Between(this.marine.x, this.marine.y, best.body.x, best.body.y) ? enemy : best);
    const tiers = this.activeTiers();
    const pellets = tiers["Multi Shot"] ? tiers["Multi Shot"] + 1 : 1;
    const budgets = [1, 1.15, 1.3, 1.45, 1.6];
    const eachDamage = this.baseDamage * budgets[tiers["Multi Shot"]] / pellets;
    const angle = Phaser.Math.Angle.Between(this.marine.x, this.marine.y, target.body.x, target.body.y);
    for (let i = 0; i < pellets; i++) {
      const spread = pellets === 1 ? 0 : (i - (pellets - 1) / 2) * 0.12;
      const body = this.add.circle(this.marine.x + 32, this.marine.y - 26, 5, tiers.Fiery ? 0xffa23f : 0x68efff).setDepth(6);
      this.bolts.push({ body, vx: Math.cos(angle + spread) * 560, vy: Math.sin(angle + spread) * 560,
        damage: eachDamage, pierce: tiers.Piercing, hit: new Set(), chain: tiers["Electric Chain"], frost: tiers.Frost, fiery: tiers.Fiery });
    }
  }

  private applyHit(bolt: Bolt, enemy: Enemy, now: number): void {
    enemy.hp -= bolt.damage;
    if (bolt.frost) {
      enemy.slowAmount = Math.max(enemy.slowAmount, [0, .2, .25, .3, .4][bolt.frost] * (enemy.boss ? .5 : 1));
      enemy.slowUntil = now + 2000;
    }
    if (bolt.fiery) {
      const total = this.baseDamage * [0, .3, .45, .6, .9][bolt.fiery];
      enemy.burnDps = Math.max(enemy.burnDps, total / 3);
      enemy.burnUntil = now + 3000;
    }
    if (bolt.chain) {
      const others = this.enemies.filter((other) => other.id !== enemy.id && !bolt.hit.has(other.id))
        .sort((a, b) => Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, a.body.x, a.body.y) - Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, b.body.x, b.body.y));
      for (const chained of others.slice(0, bolt.chain)) {
        if (Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, chained.body.x, chained.body.y) > 145) break;
        chained.hp -= this.baseDamage * .2;
        bolt.hit.add(chained.id);
        const arc = this.add.line(0, 0, enemy.body.x, enemy.body.y, chained.body.x, chained.body.y, 0x8cf7ff, .9).setOrigin(0).setLineWidth(2).setDepth(7);
        this.tweens.add({ targets: arc, alpha: 0, duration: 120, onComplete: () => arc.destroy() });
      }
      bolt.chain = 0;
    }
  }

  private removeEnemy(enemy: Enemy): void {
    enemy.body.destroy();
    this.enemies = this.enemies.filter((candidate) => candidate !== enemy);
    this.salvage += enemy.boss ? 12 : 1;
  }

  update(now: number, delta: number): void {
    if (this.ended) return;
    const dt = Math.min(delta, 34) / 1000;
    const keyboard = new Phaser.Math.Vector2(
      (this.keys.D.isDown || this.keys.RIGHT.isDown ? 1 : 0) - (this.keys.A.isDown || this.keys.LEFT.isDown ? 1 : 0),
      (this.keys.S.isDown || this.keys.DOWN.isDown ? 1 : 0) - (this.keys.W.isDown || this.keys.UP.isDown ? 1 : 0),
    );
    const movement = this.touch.lengthSq() > .01 ? this.touch.clone() : keyboard;
    if (movement.lengthSq() > 1) movement.normalize();
    this.marine.x = Phaser.Math.Clamp(this.marine.x + movement.x * this.moveSpeed * dt, 44, 916);
    this.marine.y = Phaser.Math.Clamp(this.marine.y + movement.y * this.moveSpeed * dt, 58, 495);

    if (this.spawned < this.spawnTotal && now - this.lastSpawn > (this.options.wave === this.options.totalWaves ? 100 : 560)) {
      this.spawnEnemy(); this.spawned++; this.lastSpawn = now;
    }
    this.fire(now);

    for (const bolt of [...this.bolts]) {
      bolt.body.x += bolt.vx * dt; bolt.body.y += bolt.vy * dt;
      let removed = bolt.body.x < -20 || bolt.body.x > 980 || bolt.body.y < -20 || bolt.body.y > 560;
      if (!removed) for (const enemy of this.enemies) {
        if (bolt.hit.has(enemy.id)) continue;
        if (Phaser.Math.Distance.Between(bolt.body.x, bolt.body.y, enemy.body.x, enemy.body.y) <= enemy.radius + 6) {
          bolt.hit.add(enemy.id); this.applyHit(bolt, enemy, now);
          if (bolt.pierce > 0) { bolt.pierce--; bolt.damage *= .5; } else removed = true;
          break;
        }
      }
      if (removed) { bolt.body.destroy(); this.bolts = this.bolts.filter((candidate) => candidate !== bolt); }
    }

    for (const enemy of [...this.enemies]) {
      if (enemy.burnUntil > now) enemy.hp -= enemy.burnDps * dt;
      const angle = Phaser.Math.Angle.Between(enemy.body.x, enemy.body.y, this.marine.x, this.marine.y);
      const slow = enemy.slowUntil > now ? 1 - enemy.slowAmount : 1;
      enemy.body.x += Math.cos(angle) * enemy.speed * slow * dt;
      enemy.body.y += Math.sin(angle) * enemy.speed * slow * dt;
      const distance = Phaser.Math.Distance.Between(enemy.body.x, enemy.body.y, this.marine.x, this.marine.y);
      if (distance < enemy.radius + 20) {
        const armor = Math.min(20, moduleTotal(this.options.modules, "armor"));
        this.hp -= (enemy.boss ? 26 : 11) * 20 / (20 + armor) * dt;
      }
      if (enemy.hp <= 0) this.removeEnemy(enemy);
    }

    if (now - this.hudAt > 120) { this.hudAt = now; this.publishHud(now); }
    if (this.hp <= 0) {
      this.ended = true; this.publishHud(now); this.options.onDefeat(this.snapshot());
    } else if (this.spawned >= this.spawnTotal && this.enemies.length === 0) {
      this.ended = true; this.publishHud(now); this.options.onComplete(this.snapshot());
    }
  }

  setTouchVector(x: number, y: number): void {
    this.touch.set(x, y);
    if (this.touch.lengthSq() > 1) this.touch.normalize();
  }

  useMedkit(): void {
    if (this.medkits < 1 || this.hp >= this.options.maxHp || this.ended) return;
    const healing = 35 * (1 + moduleTotal(this.options.modules, "healing"));
    this.hp = Math.min(this.options.maxHp, this.hp + healing);
    this.medkits--;
    this.publishHud(0);
  }

  private snapshot(): CombatSnapshot {
    return { hp: Math.max(0, this.hp), maxHp: this.options.maxHp, salvage: this.salvage, medkits: this.medkits,
      enemiesLeft: Math.max(0, this.spawnTotal - this.spawned + this.enemies.length), wave: this.options.wave };
  }

  private publishHud(_now: number): void {
    this.options.onHud(this.snapshot());
  }
}
