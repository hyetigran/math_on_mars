import { COMBAT_BALANCE } from "../content/balance/combat";
import { loadBattleBoundaries } from "./battle-boundaries";
import { BATTLE_VIEW, BATTLE_WORLD, battleRenderSize } from "./battle-world";
import { combatAim, facingDirection, marineAnimation } from "./combat-aim";
import {
  armedMarineAnimations,
  armedMarineUrl,
} from "./assets/armedMarineAssets";
import { arenaBackgroundUrl } from "./assets/battleAssets";
import { BattleAudio } from "./battle-audio";
import { BattleFeedback } from "./battle-feedback";
import {
  enemyAnimationAssets,
  itemAssets,
  type EnemyAnimationKey,
} from "./assets";
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

type EnemyVisualKind =
  "drifter" | "spitter" | "charger" | "splitter" | "overmind";

interface EnemyBody {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  visualKind: EnemyVisualKind;
  motion: "run" | "attack";
}

const ENEMY_SHEET_FRAME_SIZE = 256;
const ENEMY_SHEET_FRAME_COUNT = 31;
const ENEMY_SHEET_FPS = 15;

function enemyVisualKind(
  kind: CombatEnemySaveV2["kind"],
  boss: boolean,
): EnemyVisualKind {
  if (boss || kind === "overmind") return "overmind";
  if (kind === "spitter" || kind === "charger" || kind === "splitter")
    return kind;
  return "drifter";
}

function enemyAnimationKey(
  kind: EnemyVisualKind,
  motion: EnemyBody["motion"],
): EnemyAnimationKey {
  return `${kind}-${motion}` as EnemyAnimationKey;
}

export class CombatController {
  private game: Phaser.Game;
  private scene?: MarsCombatScene;
  private resizeObserver: ResizeObserver;

  constructor(options: CombatOptions) {
    const controller = this;
    const renderSize = () =>
      battleRenderSize(
        Math.max(1, options.parent.clientWidth),
        Math.max(1, options.parent.clientHeight),
        window.devicePixelRatio || 1,
      );
    const size = renderSize();
    class BoundScene extends MarsCombatScene {
      constructor() {
        super(options);
        controller.scene = this;
      }
    }
    this.game = new Phaser.Game({
      type: Phaser.CANVAS,
      width: size.width,
      height: size.height,
      parent: options.parent,
      backgroundColor: "#8e3f2c",
      render: { antialias: true, pixelArt: false },
      input: { activePointers: 3 },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: BoundScene,
      audio: { noAudio: true },
    });
    this.resizeObserver = new ResizeObserver(() => {
      const next = renderSize();
      if (
        this.game.scale.width === next.width &&
        this.game.scale.height === next.height
      )
        return;
      this.game.scale.setGameSize(next.width, next.height);
      this.scene?.resizeCamera();
    });
    this.resizeObserver.observe(options.parent);
  }

  setTouchVector(x: number, y: number): void {
    this.scene?.setTouchVector(x, y);
  }

  useMedkit(): void {
    if (this.scene?.scene.isActive()) this.scene.useMedkit();
  }

  pause(): void {
    this.scene?.clearInput();
    this.scene?.pauseAudio();
    this.scene?.scene.pause();
  }

  resume(): void {
    this.scene?.clearInput();
    this.scene?.scene.resume();
    this.scene?.resumeAudio();
  }

  snapshot(): CombatSave | undefined {
    return this.scene?.serialize();
  }

  clearInput(): void {
    this.scene?.clearInput();
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.scene?.destroyAudio();
    this.game.destroy(true);
  }
}

class MarsCombatScene extends Phaser.Scene {
  private chargeIndicators?: Phaser.GameObjects.Graphics;
  private statusIndicators?: Phaser.GameObjects.Graphics;
  private marine!: Phaser.GameObjects.Container;
  private marineSprite!: Phaser.GameObjects.Sprite;
  private marineFacing = "se";
  private marineShot = 0;
  private firingUntil = 0;
  private movingUntil = 0;
  private enemies = new Map<number, EnemyBody>();
  private pickups = new Map<number, Phaser.GameObjects.Container>();
  private bolts = new Map<number, Phaser.GameObjects.Graphics>();
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private touch = { x: 0, y: 0 };
  private simulation: CombatSimulation;
  private ended = false;
  private hudAt = 0;
  private audio?: BattleAudio;
  private feedback: BattleFeedback;

  constructor(private readonly options: CombatOptions) {
    super("mars-combat");
    this.simulation = new CombatSimulation({
      ...options,
      boundaries: loadBattleBoundaries(),
    });
    this.feedback = new BattleFeedback(this.simulation.state, options.maxHp);
  }

  preload(): void {
    this.load.image("mars-arena", arenaBackgroundUrl);
    for (const animation of armedMarineAnimations) {
      this.load.spritesheet(
        `marine-${animation.key}`,
        armedMarineUrl(animation.key),
        {
          frameWidth: animation.frameWidth,
          frameHeight: animation.frameHeight,
          endFrame: animation.frameCount - 1,
        },
      );
    }
    for (const [key, url] of Object.entries(itemAssets)) {
      if (key === "supply_cache_closed" || key === "salvage_bundle")
        this.load.image(key, url);
    }
    for (const [key, url] of Object.entries(enemyAnimationAssets)) {
      this.load.spritesheet(`enemy-${key}`, url, {
        frameWidth: ENEMY_SHEET_FRAME_SIZE,
        frameHeight: ENEMY_SHEET_FRAME_SIZE,
        endFrame: ENEMY_SHEET_FRAME_COUNT - 1,
      });
    }
  }

  resizeCamera(): void {
    if (!this.cameras?.main) return;
    this.cameras.main.setZoom(
      Math.max(
        this.scale.width / BATTLE_VIEW.width,
        this.scale.height / BATTLE_VIEW.height,
      ),
    );
  }

  create(): void {
    const context = this.game.canvas.getContext("2d");
    if (context) context.imageSmoothingQuality = "high";
    this.cameras.main.setBounds(0, 0, BATTLE_WORLD.width, BATTLE_WORLD.height);
    this.resizeCamera();
    this.audio = new BattleAudio(this.options.wave === this.options.totalWaves);
    if (this.simulation.state.enemies.some((enemy) => enemy.boss))
      this.audio.play("overmind_enter");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.audio?.destroy(),
    );
    for (const animation of armedMarineAnimations) {
      this.anims.create({
        key: `marine-${animation.key}`,
        frames: this.anims.generateFrameNumbers(`marine-${animation.key}`, {
          start: 0,
          end: animation.frameCount - 1,
        }),
        frameRate: animation.fps,
        repeat: -1,
      });
    }
    this.createEnemyAnimations();
    this.drawArena();
    const { marine } = this.simulation.state;
    this.marine = this.makeMarine(marine.x, marine.y);
    this.cameras.main.startFollow(this.marine, false, 0.15, 0.15);
    this.cameras.main.centerOn(marine.x, marine.y);
    this.keys = this.input.keyboard!.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT",
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard?.on("keydown-Q", () => {
      if (this.scene.isActive()) this.useMedkit();
    });
    this.renderState();
    this.options.onHud(this.simulation.snapshot());
  }

  private createEnemyAnimations(): void {
    for (const key of Object.keys(
      enemyAnimationAssets,
    ) as EnemyAnimationKey[]) {
      const animationKey = `enemy-${key}`;
      if (this.anims.exists(animationKey)) continue;
      this.anims.create({
        key: animationKey,
        frames: this.anims.generateFrameNumbers(animationKey, {
          // Imagine bakes a dark transition into the Overmind's first frame.
          start: key.startsWith("overmind-") ? 1 : 0,
          end: ENEMY_SHEET_FRAME_COUNT - 1,
        }),
        frameRate: ENEMY_SHEET_FPS,
        repeat: -1,
      });
    }
  }

  private drawArena(): void {
    this.add
      .image(BATTLE_WORLD.width / 2, BATTLE_WORLD.height / 2, "mars-arena")
      .setDisplaySize(BATTLE_WORLD.width, BATTLE_WORLD.height)
      .setDepth(-10);
  }

  private makeMarine(x: number, y: number): Phaser.GameObjects.Container {
    const shadow = this.add.ellipse(0, 18, 38, 13, 0x211b20, 0.28);
    const pivot = armedMarineAnimations[0].pivot;
    this.marineSprite = this.add
      .sprite(0, 20, "marine-idle-se")
      .setOrigin(pivot.x, pivot.y)
      .setDisplaySize(104, 104);
    this.marineSprite.play("marine-idle-se");
    return this.add.container(x, y, [shadow, this.marineSprite]).setDepth(5);
  }

  private updateMarine(): void {
    const state = this.simulation.state;
    const dx = state.marine.x - this.marine.x,
      dy = state.marine.y - this.marine.y;
    if (Math.hypot(dx, dy) > 0.01) this.movingUntil = this.time.now + 80;
    const moving = this.time.now < this.movingUntil;
    const aim = combatAim(
      state.marine,
      state.enemies,
      COMBAT_BALANCE.weaponRange,
    );

    if (state.nextShotId > this.marineShot) {
      if (this.marineShot > 0)
        this.firingUntil =
          this.time.now + Math.max(300, this.simulation.shotDelay);
      this.marineShot = state.nextShotId;
    }
    const firing = this.time.now < this.firingUntil && !!aim;
    const animation = marineAnimation(
      moving
        ? Math.hypot(dx, dy) > 0.01
          ? facingDirection(dx, dy)
          : this.marineFacing
        : undefined,
      aim?.direction,
      firing,
      this.marineFacing,
    );
    this.marineFacing = animation.direction;
    const motion = animation.motion;
    this.marineSprite.play(`marine-${motion}-${this.marineFacing}`, true);
    this.marine
      .setPosition(state.marine.x, state.marine.y)
      .setDepth(4 + state.marine.y / BATTLE_WORLD.height);
  }

  private makeEnemyBody(
    x: number,
    y: number,
    boss: boolean,
    radius: number,
    kind: CombatEnemySaveV2["kind"],
  ): EnemyBody {
    const visualKind = enemyVisualKind(kind, boss);
    const shadow = this.add.ellipse(
      0,
      radius * 0.68,
      radius * 1.8,
      radius * 0.5,
      0x211b20,
      0.28,
    );
    const sprite = this.add.sprite(
      0,
      0,
      `enemy-${enemyAnimationKey(visualKind, "run")}`,
      0,
    );
    const frameExtent = radius * (boss ? 2.7 : 4);
    sprite.setDisplaySize(frameExtent, frameExtent);
    sprite.play(`enemy-${enemyAnimationKey(visualKind, "run")}`);
    return {
      container: this.add.container(x, y, [shadow, sprite]).setDepth(4),
      sprite,
      visualKind,
      motion: "run",
    };
  }

  private renderState(): void {
    const state = this.simulation.state;
    const indicators = (this.statusIndicators ??= this.add
      .graphics()
      .setDepth(6));
    indicators.clear();
    const charges = (this.chargeIndicators ??= this.add.graphics().setDepth(1));
    charges.clear();
    this.updateMarine();
    const enemyIds = new Set(state.enemies.map((e) => e.id));
    for (const [id, body] of this.enemies)
      if (!enemyIds.has(id)) {
        body.container.destroy();
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
      body.container
        .setPosition(enemy.x, enemy.y)
        .setDepth(4 + enemy.y / BATTLE_WORLD.height);
      const hasSpecialAttack =
        (enemy.attack && enemy.attack.phase !== "cooldown") ||
        (enemy.bossAttack && enemy.bossAttack.phase !== "cooldown");
      const contactAttack =
        !hasSpecialAttack &&
        (enemy.kind === "drifter" ||
          enemy.kind === "mini" ||
          enemy.kind === "splitter" ||
          !enemy.kind) &&
        Math.hypot(enemy.x - state.marine.x, enemy.y - state.marine.y) <=
          enemy.radius + 30;
      const motion: EnemyBody["motion"] =
        hasSpecialAttack ||
        contactAttack ||
        (enemy.kind === "spitter" &&
          enemy.attack?.phase === "cooldown" &&
          enemy.attack.remainingMs > ENEMY_BALANCE.spitter.cooldownMs - 200)
          ? "attack"
          : "run";
      if (motion !== body.motion) {
        body.motion = motion;
        body.sprite.play(`enemy-${enemyAnimationKey(body.visualKind, motion)}`);
      }
      if (enemy.attack?.phase === "windup" && enemy.kind === "charger") {
        const { dx, dy } = enemy.attack;
        const length =
          (ENEMY_BALANCE.charger.speed * ENEMY_BALANCE.charger.activeMs) / 1000;
        const tx = enemy.x + dx * length;
        const ty = enemy.y + dy * length;
        const neckX = tx - dx * 34;
        const neckY = ty - dy * 34;
        charges
          .lineStyle(18, 0xe63740, 0.8)
          .lineBetween(enemy.x, enemy.y, neckX, neckY);
        charges
          .fillStyle(0xe63740, 0.9)
          .fillTriangle(
            tx,
            ty,
            neckX - dy * 24,
            neckY + dx * 24,
            neckX + dy * 24,
            neckY - dx * 24,
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
      if (!this.pickups.has(pickup.id)) {
        const key = pickup.ammo ? "supply_cache_closed" : "salvage_bundle";
        const image = this.add.image(0, 0, key);
        const scale =
          (pickup.ammo ? 24 : 16) / Math.max(image.width, image.height);
        image.setScale(scale);
        const body = this.add
          .container(pickup.x, pickup.y, [image])
          .setDepth(3);
        this.pickups.set(pickup.id, body);
      }
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
        const shot = state.shots.find((shot) => shot.id === bolt.shotId);
        const types =
          shot?.ammoTypes ??
          (shot?.fiery
            ? ["Fiery"]
            : shot?.frost
              ? ["Frost"]
              : shot?.chainRemaining
                ? ["Electric Chain"]
                : bolt.pierce
                  ? ["Piercing"]
                  : []);
        body = this.add.graphics().setDepth(6);
        const looks = types.length ? types : ["Standard"];
        body.setData("ammoType", looks[0]);
        looks.forEach((type, index) => {
          const y = (index - (looks.length - 1) / 2) * 5;
          if (type === "Fiery") {
            body!
              .fillStyle(0xff7135, 0.85)
              .fillTriangle(-18, y - 5, -18, y + 5, 10, y);
            body!.fillStyle(0xffe69a, 1).fillEllipse(0, y, 16, 5);
          } else if (type === "Frost") {
            body!.fillStyle(0x8ff1ff, 1).fillTriangle(-10, y, 0, y - 5, 12, y);
            body!.fillStyle(0xc9ffff, 1).fillTriangle(-10, y, 0, y + 5, 12, y);
          } else if (type === "Electric Chain") {
            body!
              .lineStyle(3, 0xc48aff, 1)
              .beginPath()
              .moveTo(-16, y)
              .lineTo(-7, y - 4)
              .lineTo(0, y + 3)
              .lineTo(10, y - 2)
              .strokePath();
          } else if (type === "Multi Shot") {
            body!
              .lineStyle(3, 0x8aff9c, 1)
              .beginPath()
              .moveTo(-10, y - 4)
              .lineTo(8, y)
              .lineTo(-10, y + 4)
              .strokePath();
          } else {
            body!
              .fillStyle(type === "Piercing" ? 0xffd36b : 0x6be8ff, 0.35)
              .fillRoundedRect(-20, y - 4, 32, 8, 4);
            body!
              .fillStyle(type === "Piercing" ? 0xffefb3 : 0xddffff, 1)
              .fillRoundedRect(-18, y - 1.5, 28, 3, 1.5);
          }
        });
        this.bolts.set(bolt.id, body);
      }
      const phase = (state.simulationTick ?? 0) * 0.65 + bolt.id * 1.7;
      const pulse = Math.sin(phase);
      const type = body.getData("ammoType");
      // Animate each stream independently, using simulation time so pausing freezes it.
      body.setAlpha(
        type === "Electric Chain" ? 0.65 + 0.35 * Math.abs(pulse) : 1,
      );
      body.setScale(
        type === "Fiery"
          ? 1 + 0.25 * pulse
          : type === "Piercing"
            ? 1 + 0.12 * pulse
            : 1,
        type === "Frost"
          ? 0.65 + 0.35 * Math.abs(pulse)
          : type === "Multi Shot"
            ? 1 + 0.25 * pulse
            : 1,
      );
      body
        .setPosition(bolt.x, bolt.y)
        .setRotation(
          Math.atan2(bolt.vy, bolt.vx) +
            (type === "Electric Chain" ? 0.1 * pulse : 0),
        );
    }
    for (const { from, to } of this.simulation.drainChainFlashes()) {
      this.audio?.play("ammo_electric_arc", 0.3);
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
    const view = this.cameras.main.worldView;
    const inset = COMBAT_BALANCE.screenEdgeInset;
    if (view.width > 0)
      this.simulation.visibleBounds = {
        left: view.left + inset,
        right: view.right - inset,
        top: view.top + inset,
        bottom: view.bottom - inset,
      };
    this.simulation.advance(
      delta,
      Math.hypot(this.touch.x, this.touch.y) > 0.1 ? this.touch : keyboard,
    );
    if (this.simulation.drainPiercingImpact())
      this.audio?.play("ammo_piercing_hit", 0.3);
    for (const cue of this.feedback.update(this.simulation.state)) {
      if (
        this.simulation.outcome &&
        (cue === "marine_shutdown" || cue === "overmind_death")
      )
        continue;
      this.audio?.play(
        cue,
        cue.startsWith("marine_footstep") ? 0.16 : 0.4,
        cue === "marine_damage" ? 650 : cue === "slime_move_01" ? 2000 : 120,
      );
    }
    this.renderState();
    if (now - this.hudAt > 120) {
      this.hudAt = now;
      this.options.onHud(this.simulation.snapshot());
    }
    if (this.simulation.outcome) {
      this.ended = true;
      this.audio?.finish(
        this.simulation.outcome === "defeat",
        this.options.wave === this.options.totalWaves,
      );
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
    const before = this.simulation.state.medkits;
    this.simulation.useMedkit();
    if (this.simulation.state.medkits < before) this.audio?.play("medkit_use");
    this.options.onHud(this.simulation.snapshot());
  }
  pauseAudio(): void {
    this.audio?.pause();
  }
  resumeAudio(): void {
    if (!this.ended) this.audio?.resume();
  }
  destroyAudio(): void {
    this.audio?.destroy();
  }
  serialize(): CombatSave {
    return this.simulation.serialize();
  }
}
