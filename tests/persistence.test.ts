import test from "node:test";
import assert from "node:assert/strict";
import { ProfileRepository, type ProfileStorage } from "../src/persistence";
import { RunSession } from "../src/session";
import { CombatSimulation } from "../src/combat-rules";
import type { Profile } from "../src/types";

class MemoryStorage implements ProfileStorage {
  values = new Map<string, string>();
  failKey?: string;
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (key === this.failKey) throw new Error("quota exceeded");
    this.values.set(key, value);
  }
}
const key = "test-profiles";
const sample = (): Profile => ({
  id: "cadet",
  name: "Cadet",
  grade: "3",
  handedness: "left",
  history: [],
  victories: 0,
});

test("valid profiles round trip independently of caller mutations", () => {
  const storage = new MemoryStorage();
  const repository = new ProfileRepository(storage, key);
  const profile = sample();
  repository.commit([profile]);
  profile.name = "Changed";
  assert.equal(repository.load()[0].name, "Cadet");
});

test("malformed nested saves are rejected without discarding durable bytes", () => {
  const storage = new MemoryStorage();
  const repository = new ProfileRepository(storage, key);
  const raw = JSON.stringify([{ ...sample(), history: [{}] }]);
  storage.setItem(key, raw);
  assert.throws(() => repository.load(), /Invalid saved profile/);
  assert.equal(storage.getItem(key), raw);
  assert.throws(() => repository.commit([sample()]), /Could not save/);
  assert.equal(storage.getItem(key), raw);
});

test("failed primary write retains prior durable data and a valid backup", () => {
  const storage = new MemoryStorage();
  const repository = new ProfileRepository(storage, key);
  repository.commit([sample()]);
  storage.failKey = key;
  assert.throws(
    () => repository.commit([{ ...sample(), victories: 1 }]),
    /Could not save/,
  );
  assert.equal(repository.load()[0].victories, 0);
  assert.equal(JSON.parse(storage.getItem(`${key}-backup`)!)[0].victories, 0);
});

test("invalid candidate cannot replace a valid save", () => {
  const storage = new MemoryStorage();
  const repository = new ProfileRepository(storage, key);
  repository.commit([sample()]);
  assert.throws(
    () => repository.commit([{ ...sample(), victories: -1 }]),
    /Invalid saved profile/,
  );
  assert.equal(repository.load()[0].victories, 0);
});

test("backup write failure does not publish the new primary", () => {
  const storage = new MemoryStorage();
  const repository = new ProfileRepository(storage, key);
  repository.commit([sample()]);
  storage.failKey = `${key}-backup`;
  assert.throws(
    () => repository.commit([{ ...sample(), victories: 1 }]),
    /Could not save/,
  );
  assert.equal(repository.load()[0].victories, 0);
});

test("corrupt primary never overwrites backup and recovery requires explicit call", () => {
  const storage = new MemoryStorage();
  const repository = new ProfileRepository(storage, key);
  repository.commit([sample()]);
  repository.commit([{ ...sample(), victories: 1 }]);
  storage.setItem(key, "broken JSON");
  assert.throws(() => repository.load(), /invalid JSON/);
  assert.equal(storage.getItem(key), "broken JSON");
  assert.equal(repository.recoverBackup()[0].victories, 0);
  assert.equal(repository.load()[0].victories, 0);
});

test("legacy repeated prompts retain distinct occurrence IDs in initial order", () => {
  const storage = new MemoryStorage();
  const repository = new ProfileRepository(storage, key);
  const questions = Array.from({ length: 5 }, (_, i) => ({
    id: `q${i}`,
    prompt: "Count cells",
    spoken: "Count cells",
    answer: [i + 1, 1],
    hint: "Count",
    explanation: "Count",
    visualCount: i + 1,
  }));
  const rewards = [0, 1, 2].map((i) => ({
    id: `m${i}`,
    name: "Armor",
    stat: "armor",
    value: 2,
    quality: "white",
  }));
  const legacy = {
    ...sample(),
    history: questions.map((q) => ({
      question: q.prompt,
      grade: "3",
      correctInitially: false,
      corrected: false,
      at: 1,
    })),
    activeRun: {
      id: "run",
      grade: "3",
      wave: 2,
      totalWaves: 10,
      difficulty: "standard",
      hp: 100,
      maxHp: 100,
      salvage: 0,
      medkits: 1,
      ammoCapacity: 1,
      ammo: [],
      activeAmmoIds: [],
      modules: [rewards[0]],
      phase: "correction",
      shopBought: [],
      cacheClaimed: false,
      quiz: {
        questions,
        index: 5,
        attempts: questions.map((question) => ({
          question,
          input: "0",
          correct: false,
          corrected: false,
        })),
        elapsedMs: 1000,
        remainingMs: 29000,
        rewardQuality: "white",
        rewardChoices: rewards,
        selectedReward: "m0",
        correctionIndex: 0,
      },
    },
  };
  storage.setItem(key, JSON.stringify([legacy]));
  assert.deepEqual(
    repository.load()[0].history.map((entry) => entry.occurrenceId),
    ["run:2:0", "run:2:1", "run:2:2", "run:2:3", "run:2:4"],
  );
});

test("saved loot cannot share an ID with a living enemy", () => {
  const storage = new MemoryStorage();
  const repository = new ProfileRepository(storage, key);
  const session = new RunSession([sample()], repository);
  session.start("cadet", "3");
  const profiles = session.profiles;
  const run = profiles[0].activeRun!;
  const simulation = new CombatSimulation({ ...run, seed: 1 });
  for (let i = 0; i < 6; i++) simulation.advance(100);
  const save = simulation.serialize();
  const enemy = save.enemies[0];
  save.pickups = [{ id: enemy.id, x: enemy.x, y: enemy.y, value: 1 }];
  run.combatSave = save;
  assert.throws(() => repository.commit(profiles), /pickup ID/);
});

test("enemy warnings and flying shots survive profile storage and reject malformed attacks", () => {
  const storage = new MemoryStorage();
  const repository = new ProfileRepository(storage, key);
  const session = new RunSession([sample()], repository);
  session.start("cadet", "3");
  const profiles = session.profiles;
  const run = profiles[0].activeRun!;
  const simulation = new CombatSimulation({ ...run, seed: 1 });
  for (let i = 0; i < 6; i++) simulation.advance(100);
  const save = simulation.serialize();
  assert.equal(save.version, 2);
  if (save.version !== 2) throw new Error("Expected current save format");
  save.enemies[0].kind = "charger";
  save.enemies[0].attack = {
    phase: "windup",
    remainingMs: 600,
    dx: 1,
    dy: 0,
    hit: false,
  };
  save.nextEnemyProjectileId = 2;
  save.enemyProjectiles = [
    { id: 1, x: 100, y: 100, vx: 180, vy: 0, damage: 10, remainingMs: 2000 },
  ];
  run.combatSave = save;
  repository.commit(profiles);
  assert.deepEqual(repository.load()[0].activeRun!.combatSave, save);
  const mutations = [
    (s: typeof save) => {
      s.enemies[0].attack!.dx = 0;
    },
    (s: typeof save) => {
      s.enemies[0].attack!.remainingMs = -1;
    },
    (s: typeof save) => {
      s.enemies[0].kind = "drifter";
    },
    (s: typeof save) => {
      s.enemyProjectiles![0].id = 2;
    },
    (s: typeof save) => {
      s.enemyProjectiles!.push({ ...s.enemyProjectiles![0] });
    },
    (s: typeof save) => {
      s.enemyProjectiles![0].remainingMs = -1;
    },
  ];
  for (const mutate of mutations) {
    const malformed = structuredClone(save);
    mutate(malformed);
    run.combatSave = malformed;
    assert.throws(() => repository.commit(profiles), /Invalid saved profile/);
    assert.deepEqual(repository.load()[0].activeRun!.combatSave, save);
  }
});

test("Overmind active rings and summon limits round trip through profile storage", () => {
  const storage = new MemoryStorage();
  const repository = new ProfileRepository(storage, key);
  const session = new RunSession([sample()], repository);
  session.start("cadet", "3", "short", "easy");
  const profiles = session.profiles;
  const run = profiles[0].activeRun!;
  run.wave = run.totalWaves;
  const simulation = new CombatSimulation({ ...run, seed: 1 });
  simulation.advance(100);
  const save = simulation.serialize();
  if (save.version !== 2) throw new Error("Expected current save format");
  save.enemies[0].bossAttack = {
    pattern: "slam",
    phase: "active",
    remainingMs: 550,
    dx: 0,
    dy: 1,
    hit: true,
    summons: 2,
  };
  run.combatSave = save;
  repository.commit(profiles);
  assert.deepEqual(repository.load()[0].activeRun!.combatSave, save);
  for (const mutation of [
    (s: typeof save) => {
      s.enemies[0].bossAttack!.summons = 5;
    },
    (s: typeof save) => {
      s.enemies[0].bossAttack!.pattern = "fan";
    },
    (s: typeof save) => {
      s.enemies[0].bossAttack!.remainingMs = 2000;
    },
    (s: typeof save) => {
      s.enemies[0].boss = false;
    },
  ]) {
    const malformed = structuredClone(save);
    mutation(malformed);
    run.combatSave = malformed;
    assert.throws(() => repository.commit(profiles), /Invalid saved profile/);
    assert.deepEqual(repository.load()[0].activeRun!.combatSave, save);
  }
});

test("legacy question speech references are removed without changing quiz progress", () => {
  const storage = new MemoryStorage();
  const repository = new ProfileRepository(storage, key);
  const session = new RunSession([sample()], repository);
  session.start("cadet", "K");
  session.finishWave("cadet", { hp: 100, salvage: 8, medkits: 1 });
  const original = JSON.parse(JSON.stringify(session.profiles));
  const legacy = structuredClone(original);
  legacy[0].activeRun.quiz.questions[0].speechClips = ["count"];
  legacy[0].activeRun.quiz.questions[0].hintClips = ["count-hint"];
  const raw = JSON.stringify(legacy);
  storage.setItem(key, raw);
  assert.deepEqual(repository.load(), original);
  assert.equal(storage.getItem(key), raw);
});
