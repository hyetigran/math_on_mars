import { overmindFanAngles } from "./overmind";
import { ENEMY_BALANCE, OVERMIND_BALANCE } from "../content/balance/enemies";
import { STATUS_BALANCE } from "../content/balance/status";
import { CHAIN_BALANCE } from "../content/balance/chain";
import Phaser from "phaser";
import type { CombatSave, CombatEnemySaveV2 } from "./types";
import {
  CombatSimulation,
  type CombatRulesOptions,
  type CombatSnapshot,
} from "./combat-rules";
export type { CombatSnapshot } from "./combat-rules";

interface CombatOptions extends CombatRulesOptions {
  parent: HTMLElement;
  onHud: (state: CombatSnapshot) => void;
  onComplete: (state: CombatSnapshot) => void;
  onDefeat: (state: CombatSnapshot) => void;
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
    if (this.scene?.scene.isActive()) this.scene.useMedkit();
  }

  pause(): void {
    this.scene?.clearInput();
    this.scene?.scene.pause();
  }

  resume(): void {
    this.scene?.clearInput();
    this.scene?.scene.resume();
  }

  snapshot(): CombatSave | undefined {
    return this.scene?.serialize();
  }

  clearInput(): void {
    this.scene?.clearInput();
  }

  destroy(): void {
    this.game.destroy(true);
  }
}

class MarsCombatScene extends Phaser.Scene {
  private statusIndicators?: Phaser.GameObjects.Graphics;
  private marine!: Phaser.GameObjects.Container;
  private enemies = new Map<number, Phaser.GameObjects.Container>();
  private pickups = new Map<number, Phaser.GameObjects.Rectangle>();
  private bolts = new Map<number, Phaser.GameObjects.Arc>();
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private touch = { x: 0, y: 0 };
  private simulation: CombatSimulation;
  private ended = false;
  private hudAt = 0;

  constructor(private readonly options: CombatOptions) {
    super("mars-combat");
    this.simulation = new CombatSimulation(options);
  }

  create(): void {
    this.drawArena();
    const { marine } = this.simulation.state;
    this.marine = this.makeMarine(marine.x, marine.y);
    this.keys = this.input.keyboard!.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT",
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard?.on("keydown-Q", () => {
      if (this.scene.isActive()) this.useMedkit();
    });
    this.renderState();
    this.options.onHud(this.simulation.snapshot());
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
    const body = this.add
      .rectangle(0, 4, 32, 38, 0xece5d3)
      .setStrokeStyle(4, 0x17202c);
    const helmet = this.add
      .ellipse(0, -18, 43, 34, 0xf5eedf)
      .setStrokeStyle(4, 0x17202c);
    const visor = this.add
      .rectangle(5, -18, 29, 9, 0x39d7e6)
      .setStrokeStyle(2, 0x102431);
    const pack = this.add
      .rectangle(-19, 3, 12, 25, 0x27334b)
      .setStrokeStyle(3, 0x17202c);
    const patch = this.add.rectangle(17, 1, 7, 9, 0xf27a35);
    const gun = this.add
      .rectangle(22, -31, 29, 9, 0xd9e1df)
      .setStrokeStyle(3, 0x17202c);
    const muzzle = this.add
      .circle(38, -31, 5, 0x35d9ef)
      .setStrokeStyle(2, 0x17202c);
    return this.add
      .container(x, y, [shadow, pack, body, helmet, visor, patch, gun, muzzle])
      .setDepth(5);
  }

  private makeEnemyBody(
    x: number,
    y: number,
    boss: boolean,
    radius: number,
    kind: CombatEnemySaveV2["kind"],
  ): Phaser.GameObjects.Container {
    if (kind === "splitter") {
      const shape = this.add.graphics().lineStyle(4, 0x241d2e, 1);
      for (const x of [-radius * 0.45, radius * 0.45]) {
        shape
          .fillStyle(0xac70e8, 1)
          .fillEllipse(x, 0, radius * 1.4, radius * 1.8);
        shape.strokeEllipse(x, 0, radius * 1.4, radius * 1.8);
        shape.fillStyle(0xffefa2, 1).fillCircle(x, 0, 6);
      }
      return this.add.container(x, y, [shape]).setDepth(4);
    }
    if (kind === "charger" || kind === "spitter") {
      const shape = this.add.graphics();
      shape.lineStyle(4, 0x241d2e, 1);
      if (kind === "charger") {
        shape.fillStyle(0xffba49, 1);
        shape.fillTriangle(-radius, radius, radius, radius, 0, -radius);
        shape.strokeTriangle(-radius, radius, radius, radius, 0, -radius);
        shape.lineBetween(-radius * 0.5, 0, radius * 0.5, 0);
        shape.lineBetween(
          -radius * 0.7,
          radius * 0.5,
          radius * 0.7,
          radius * 0.5,
        );
      } else {
        shape
          .fillStyle(0xd19aff, 1)
          .fillEllipse(0, 3, radius * 1.7, radius * 2.2);
        shape.strokeEllipse(0, 3, radius * 1.7, radius * 2.2);
        shape
          .fillStyle(0x241d2e, 1)
          .fillRoundedRect(-6, -radius - 7, 12, 18, 4);
      }
      shape.fillStyle(0xffffff, 1).fillCircle(-6, -3, 3).fillCircle(6, -3, 3);
      return this.add.container(x, y, [shape]).setDepth(4);
    }
    const color = boss
      ? 0xc147a3
      : this.options.wave === 2
        ? 0x9ddf3c
        : 0x75e353;
    const shadow = this.add.ellipse(
      0,
      radius * 0.55,
      radius * 1.8,
      radius * 0.55,
      0x211b20,
      0.28,
    );
    const blob = this.add
      .ellipse(0, 0, radius * 2, radius * 1.65, color)
      .setStrokeStyle(boss ? 7 : 4, 0x263022);
    const core = this.add
      .circle(0, 3, boss ? 20 : 8, boss ? 0xffc65e : 0xf3f179)
      .setStrokeStyle(2, 0x58632e);
    const eye1 = this.add.circle(-8, -8, boss ? 4 : 3, 0x18211b);
    const eye2 = this.add.circle(8, -8, boss ? 4 : 3, 0x18211b);
    const shine = this.add.ellipse(
      -radius * 0.3,
      -radius * 0.32,
      radius * 0.35,
      radius * 0.18,
      0xffffff,
      0.45,
    );
    return this.add
      .container(x, y, [shadow, blob, core, eye1, eye2, shine])
      .setDepth(4);
  }

  private renderState(): void {
    const state = this.simulation.state;
    const indicators = (this.statusIndicators ??= this.add
      .graphics()
      .setDepth(6));
    indicators.clear();
    this.marine.setPosition(state.marine.x, state.marine.y);
    const enemyIds = new Set(state.enemies.map((e) => e.id));
    for (const [id, body] of this.enemies)
      if (!enemyIds.has(id)) {
        body.destroy();
        this.enemies.delete(id);
      }
    for (const enemy of state.enemies) {
      let body = this.enemies.get(enemy.id);
      if (!body) {
        body = this.makeEnemyBody(
          enemy.x,
          enemy.y,
          enemy.boss,
          enemy.radius,
          enemy.kind,
        );
        this.enemies.set(enemy.id, body);
      }
      body.setPosition(enemy.x, enemy.y);
      if (
        enemy.attack?.phase === "windup" &&
        (enemy.kind === "spitter" || enemy.kind === "charger")
      ) {
        const attack = enemy.attack;
        const length =
          enemy.kind === "charger"
            ? (ENEMY_BALANCE.charger.speed * ENEMY_BALANCE.charger.activeMs) /
              1000
            : ENEMY_BALANCE.spitter.range;
        const tx = enemy.x + attack.dx * length;
        const ty = enemy.y + attack.dy * length;
        indicators
          .lineStyle(enemy.kind === "charger" ? 18 : 8, 0x241d2e, 0.75)
          .lineBetween(enemy.x, enemy.y, tx, ty);
        indicators
          .lineStyle(4, 0xffec91, 1)
          .lineBetween(enemy.x, enemy.y, tx, ty);
        indicators.lineBetween(
          tx,
          ty,
          tx - attack.dx * 18 - attack.dy * 12,
          ty - attack.dy * 18 + attack.dx * 12,
        );
        indicators.lineBetween(
          tx,
          ty,
          tx - attack.dx * 18 + attack.dy * 12,
          ty - attack.dy * 18 - attack.dx * 12,
        );
        indicators
          .lineStyle(4, 0xffffff, 1)
          .strokeCircle(enemy.x, enemy.y, enemy.radius + 7);
        indicators
          .fillStyle(0xffec91, 1)
          .fillRect(
            enemy.x - 18,
            enemy.y + enemy.radius + 10,
            (36 * attack.remainingMs) / ENEMY_BALANCE[enemy.kind].windupMs,
            5,
          );
      }
      const bossAttack = enemy.bossAttack;
      if (bossAttack && bossAttack.phase !== "cooldown") {
        const tuning = OVERMIND_BALANCE;
        if (bossAttack.pattern === "slam") {
          const radius =
            bossAttack.phase === "windup"
              ? tuning.slamRadius
              : tuning.slamRadius *
                (1 - bossAttack.remainingMs / tuning.slamDurationMs);
          indicators
            .lineStyle(bossAttack.phase === "windup" ? 3 : 10, 0xffe790, 1)
            .strokeCircle(enemy.x, enemy.y, radius);
        } else if (bossAttack.pattern === "fan") {
          indicators.lineStyle(3, 0xffa1c0, 1);
          for (const angle of overmindFanAngles(bossAttack.dx, bossAttack.dy)) {
            indicators.lineBetween(
              enemy.x,
              enemy.y,
              enemy.x + Math.cos(angle) * 200,
              enemy.y + Math.sin(angle) * 200,
            );
          }
        } else {
          indicators.lineStyle(5, 0xc4ff99, 1);
          for (const offset of [-65, 65])
            indicators.strokeCircle(enemy.x + offset, enemy.y, 20);
        }
        if (bossAttack.phase === "windup")
          indicators
            .fillStyle(0xffffff, 1)
            .fillRect(
              enemy.x - 30,
              enemy.y - enemy.radius - 18,
              (60 * bossAttack.remainingMs) / tuning.windupMs,
              6,
            );
      }
      const y = enemy.y - enemy.radius - 12;
      if (enemy.slowRemainingMs > 0) {
        const x = enemy.x - 11;
        indicators.lineStyle(2, STATUS_BALANCE.frostColor, 1);
        for (let spoke = 0; spoke < 3; spoke++) {
          const angle = (spoke * Math.PI) / 3;
          const dx = Math.cos(angle) * 5,
            dy = Math.sin(angle) * 5;
          indicators.lineBetween(x - dx, y - dy, x + dx, y + dy);
        }
        indicators
          .fillStyle(STATUS_BALANCE.frostColor, 1)
          .fillRect(
            x - 7,
            y + 8,
            14 *
              Math.min(
                1,
                enemy.slowRemainingMs / STATUS_BALANCE.slowDurationMs,
              ),
            2,
          );
      }
      if (enemy.burnRemainingDamage > 0 && enemy.burnRate > 0) {
        const x = enemy.x + 11;
        indicators
          .fillStyle(STATUS_BALANCE.burnColor, 1)
          .fillTriangle(x, y - 6, x - 5, y + 4, x + 5, y + 4);
        indicators
          .fillStyle(0xffedb4, 1)
          .fillTriangle(x, y - 1, x - 2, y + 4, x + 2, y + 4);
        const remaining = enemy.burnRemainingDamage / enemy.burnRate;
        indicators
          .fillStyle(STATUS_BALANCE.burnColor, 1)
          .fillRect(
            x - 7,
            y + 8,
            14 * Math.min(1, remaining / STATUS_BALANCE.burnDurationSeconds),
            2,
          );
      }
    }
    for (const shot of state.enemyProjectiles ?? []) {
      indicators.fillStyle(0x241d2e, 1).fillCircle(shot.x, shot.y, 9);
      indicators.fillStyle(0xff759d, 1).fillCircle(shot.x, shot.y, 6);
      indicators.fillStyle(0xffffff, 1).fillCircle(shot.x - 2, shot.y - 2, 2);
    }
    const pickupIds = new Set((state.pickups ?? []).map((p) => p.id));
    for (const [id, body] of this.pickups) {
      if (!pickupIds.has(id)) {
        body.destroy();
        this.pickups.delete(id);
      }
    }
    for (const pickup of state.pickups ?? []) {
      if (!this.pickups.has(pickup.id))
        this.pickups.set(
          pickup.id,
          this.add
            .rectangle(
              pickup.x,
              pickup.y,
              pickup.ammo ? 20 : 14,
              pickup.ammo ? 12 : 14,
              pickup.ammo
                ? [0xffffff, 0x65df87, 0x70b6ff, 0xbd85ff][pickup.ammo.tier - 1]
                : 0xffd36a,
            )
            .setStrokeStyle(2, 0x49341a)
            .setAngle(45)
            .setDepth(3),
        );
    }
    const boltIds = new Set(state.bolts.map((b) => b.id));
    for (const [id, body] of this.bolts)
      if (!boltIds.has(id)) {
        body.destroy();
        this.bolts.delete(id);
      }
    for (const bolt of state.bolts) {
      let body = this.bolts.get(bolt.id);
      if (!body) {
        const fiery = state.shots.find(
          (shot) => shot.id === bolt.shotId,
        )?.fiery;
        body = this.add
          .circle(bolt.x, bolt.y, 5, fiery ? 0xffa23f : 0x68efff)
          .setDepth(6);
        this.bolts.set(bolt.id, body);
      }
      body.setPosition(bolt.x, bolt.y);
    }
    for (const { from, to } of this.simulation.drainChainFlashes()) {
      const arc = this.add.graphics().setDepth(7);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      // Stable zigzags make each jump readable without consuming gameplay RNG.
      for (const [width, color, alpha] of [
        [7, CHAIN_BALANCE.arcGlowColor, 0.45],
        [2, CHAIN_BALANCE.arcColor, 1],
      ]) {
        arc.lineStyle(width, color, alpha).beginPath().moveTo(from.x, from.y);
        for (let segment = 1; segment < 4; segment++) {
          const offset = segment % 2 ? 5 : -5;
          arc.lineTo(
            from.x + (dx * segment) / 4 - (dy / length) * offset,
            from.y + (dy * segment) / 4 + (dx / length) * offset,
          );
        }
        arc.lineTo(to.x, to.y).strokePath();
      }
      arc.fillStyle(CHAIN_BALANCE.arcColor, 1).fillCircle(to.x, to.y, 4);
      this.tweens.add({
        targets: arc,
        alpha: 0,
        duration: CHAIN_BALANCE.arcDurationMs,
        onComplete: () => arc.destroy(),
      });
    }
  }

  update(now: number, delta: number): void {
    if (this.ended) return;
    const keyboard = {
      x:
        (this.keys.D.isDown || this.keys.RIGHT.isDown ? 1 : 0) -
        (this.keys.A.isDown || this.keys.LEFT.isDown ? 1 : 0),
      y:
        (this.keys.S.isDown || this.keys.DOWN.isDown ? 1 : 0) -
        (this.keys.W.isDown || this.keys.UP.isDown ? 1 : 0),
    };
    this.simulation.advance(
      delta,
      Math.hypot(this.touch.x, this.touch.y) > 0.1 ? this.touch : keyboard,
    );
    this.renderState();
    if (now - this.hudAt > 120) {
      this.hudAt = now;
      this.options.onHud(this.simulation.snapshot());
    }
    if (this.simulation.outcome) {
      this.ended = true;
      const snapshot = this.simulation.snapshot();
      this.options.onHud(snapshot);
      if (this.simulation.outcome === "defeat") this.options.onDefeat(snapshot);
      else this.options.onComplete(snapshot);
    }
  }

  setTouchVector(x: number, y: number): void {
    this.touch = { x, y };
  }
  clearInput(): void {
    this.touch = { x: 0, y: 0 };
    this.input.keyboard?.resetKeys();
  }
  useMedkit(): void {
    this.simulation.useMedkit();
    this.options.onHud(this.simulation.snapshot());
  }
  serialize(): CombatSave {
    return this.simulation.serialize();
  }
}
