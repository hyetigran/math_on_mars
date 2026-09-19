import test from "node:test";
import assert from "node:assert/strict";
import { BattleFeedback } from "../src/battle-feedback";
import { CombatSimulation } from "../src/combat-rules";
function fixture() {
  const sim = new CombatSimulation({
    wave: 1,
    totalWaves: 10,
    difficulty: "standard",
    hp: 100,
    maxHp: 100,
    salvage: 0,
    medkits: 1,
    ammo: [],
    activeAmmoIds: [],
    modules: [],
    seed: 42,
  });
  return { sim, feedback: new BattleFeedback(sim.state, 100) };
}
test("feedback observes shots and movement without mutating gameplay or repeating idle cues", () => {
  const { sim, feedback } = fixture();
  sim.state.spawnCooldownMs = 0;
  sim.advance(1000 / 60);
  sim.state.enemies[0].x = sim.state.marine.x + 150;
  sim.state.enemies[0].y = sim.state.marine.y;
  for (let i = 0; i < 60; i++) sim.advance(1000 / 60, { x: 1, y: 0 });
  const before = sim.serialize();
  const cues = feedback.update(sim.state);
  assert.ok(cues.some((cue) => cue.startsWith("blaster_fire_")));
  assert.ok(cues.some((cue) => cue.startsWith("marine_footstep_")));
  assert.deepEqual(sim.serialize(), before);
  assert.deepEqual(feedback.update(sim.state), []);
});
test("low health warns at threshold crossing and rearms after healing", () => {
  const { sim, feedback } = fixture();
  sim.state.hp = 24;
  assert.ok(feedback.update(sim.state).includes("marine_low_health"));
  sim.state.hp = 23;
  assert.ok(!feedback.update(sim.state).includes("marine_low_health"));
  sim.state.hp = 60;
  feedback.update(sim.state);
  sim.state.hp = 20;
  assert.ok(feedback.update(sim.state).includes("marine_low_health"));
});
test("boss windup and instantaneous fan attack each produce one cue", () => {
  const { sim, feedback } = fixture();
  for (let i = 0; i < 60; i++) sim.advance(1000 / 60);
  const enemy = sim.state.enemies[0];
  enemy.boss = true;
  assert.ok(feedback.update(sim.state).includes("overmind_enter"));
  enemy.bossAttack = {
    pattern: "fan",
    phase: "windup",
    remainingMs: 10,
    dx: 1,
    dy: 0,
    hit: false,
    summons: 0,
  };
  assert.ok(feedback.update(sim.state).includes("overmind_windup"));
  enemy.bossAttack.phase = "cooldown";
  enemy.bossAttack.pattern = "summon";
  assert.ok(feedback.update(sim.state).includes("overmind_fan"));
  assert.deepEqual(feedback.update(sim.state), []);
  sim.state.enemies = [];
  assert.ok(feedback.update(sim.state).includes("overmind_death"));
});
test("restored combat does not replay previous shots, pickups, or boss entry", () => {
  const { sim } = fixture();
  for (let i = 0; i < 60; i++) sim.advance(1000 / 60);
  sim.state.salvage = 50;
  sim.state.enemies[0].boss = true;
  const feedback = new BattleFeedback(sim.state, 100);
  assert.deepEqual(feedback.update(sim.state), []);
});

test("automatic fire and sprite facing use the same muzzle side in every direction", async () => {
  const { combatAim } = await import("../src/combat-aim");
  for (const [dx, dy, direction] of [
    [1, 0, "e"],
    [1, 1, "se"],
    [0, 1, "s"],
    [-1, 1, "sw"],
    [-1, 0, "w"],
    [-1, -1, "nw"],
    [0, -1, "n"],
    [1, -1, "ne"],
  ] as const) {
    const { sim } = fixture();
    for (let i = 0; i < 60; i++) sim.advance(1000 / 60);
    const enemy = sim.state.enemies[0];
    sim.state.enemies = [enemy];
    enemy.x = sim.state.marine.x + dx * 150;
    enemy.y = sim.state.marine.y - 16 + dy * 150;
    enemy.speed = 0;
    const aim = combatAim(sim.state.marine, sim.state.enemies)!;
    assert.equal(aim.direction, direction);
    if (dx) assert.equal(Math.sign(aim.origin.x - sim.state.marine.x), dx);
    sim.state.shotCooldownMs = 0;
    sim.state.bolts = [];
    sim.advance(1000 / 60);
    assert.ok(sim.state.bolts.length > 0);
    const bolt = sim.state.bolts[0];
    assert.ok(
      Math.abs(
        (enemy.x - aim.origin.x) * bolt.vy - (enemy.y - aim.origin.y) * bolt.vx,
      ) < 1e-6,
    );
  }
});

test("repeated shots and steps always select the same approved take", () => {
  const { sim, feedback } = fixture();
  for (let i = 0; i < 8; i++) {
    sim.state.nextShotId++;
    sim.state.marine.x += 30;
    const cues = feedback.update(sim.state);
    assert.ok(cues.includes("blaster_fire_01"));
    assert.ok(cues.includes("marine_footstep_01"));
    assert.ok(!cues.some((cue) => /_0[2-4]$/.test(cue)));
  }
});
