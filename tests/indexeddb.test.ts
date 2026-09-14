import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import { IndexedProfileRepository } from "../src/indexeddb";
import { CombatSimulation } from "../src/combat-rules";
import { RunSession } from "../src/session";
import type { Profile } from "../src/types";
const profile = (id: string): Profile => ({
  id,
  name: id,
  grade: "3",
  handedness: "left",
  history: [],
  victories: 0,
});

test("IndexedDB imports legacy profiles once and preserves the original bytes", async () => {
  const factory = new IDBFactory();
  const raw = JSON.stringify([profile("a")]);
  const repo = new IndexedProfileRepository(factory, "legacy", {
    getItem: () => raw,
    setItem: () => {
      throw new Error("Do not change legacy");
    },
  });
  assert.equal((await repo.load())[0].id, "a");
  await repo.commit([{ ...profile("a"), victories: 1 }], "win");
  repo.close();
  const reopened = new IndexedProfileRepository(factory, "legacy", {
    getItem: () => raw,
    setItem: () => {},
  });
  assert.equal((await reopened.load())[0].victories, 1);
});

test("receipts make retries idempotent and reject conflicting command payloads", async () => {
  const repo = new IndexedProfileRepository(new IDBFactory(), "receipts");
  await repo.load();
  await repo.commit([profile("a")], "create");
  await repo.commit([profile("a")], "create");
  await assert.rejects(
    repo.commit([{ ...profile("a"), victories: 3 }], "create"),
  );
  assert.equal((await repo.load())[0].victories, 0);
});

test("stale writers abort atomically while independent profiles remain isolated", async () => {
  const factory = new IDBFactory();
  const first = new IndexedProfileRepository(factory, "isolation");
  const second = new IndexedProfileRepository(factory, "isolation");
  await first.load();
  await first.commit([profile("a"), profile("b")], "create");
  const stale = await second.load();
  await first.commit(
    [{ ...profile("a"), victories: 1 }, profile("b")],
    "a-win",
  );
  await second.commit([stale[0], { ...stale[1], victories: 2 }], "b-win");
  await assert.rejects(
    second.commit(
      [
        { ...stale[0], victories: 3 },
        { ...stale[1], victories: 9 },
      ],
      "stale",
    ),
  );
  assert.deepEqual(
    (await first.load()).map((p) => p.victories),
    [1, 2],
  );
});

test("prepared commands keep state private until durable success and retain generated IDs", async () => {
  const repo = new IndexedProfileRepository(new IDBFactory(), "prepared");
  const session = new RunSession(await repo.load(), {
    commit: () => {
      throw new Error("Unexpected synchronous save");
    },
  });
  const prepared = session.prepare(() => session.createProfile("Cadet"));
  assert.equal(session.profiles.length, 0);
  await repo.commit(prepared.profiles, "create");
  assert.equal(session.profiles.length, 0);
  prepared.publish();
  assert.equal(session.profiles[0].id, prepared.result);
  assert.deepEqual(await repo.load(), session.profiles);
});

test("legacy corrupt primary recovers backup and acknowledged commands cannot be rolled back", async () => {
  const values = new Map([
    ["recovery", "{"],
    ["recovery-backup", JSON.stringify([profile("a")])],
  ]);
  const repo = new IndexedProfileRepository(new IDBFactory(), "recovery", {
    getItem: (k) => values.get(k) ?? null,
    setItem: () => {},
  });
  await assert.rejects(repo.load());
  assert.equal((await repo.recoverBackup())[0].id, "a");
  await repo.commit([{ ...profile("a"), victories: 2 }], "win");
  assert.equal((await repo.recoverBackup())[0].victories, 2);
  assert.ok((await repo.exportStored()).includes('"victories":2'));
});

test("reload preserves each intermission phase and checkpoints do not change interaction revision", async () => {
  const repo = new IndexedProfileRepository(new IDBFactory(), "phases");
  let session = new RunSession(await repo.load(), {
    commit: () => {
      throw new Error("sync");
    },
  });
  let n = 0;
  async function execute<T>(action: () => T): Promise<T> {
    const prepared = session.prepare(action);
    await repo.commit(prepared.profiles, `command-${n++}`);
    prepared.publish();
    session = new RunSession(await repo.load(), {
      commit: () => {
        throw new Error("sync");
      },
    });
    return prepared.result;
  }
  const id = await execute(() => session.createProfile("Cadet"));
  await execute(() => session.start(id, "3"));
  await execute(() =>
    session.finishWave(id, { hp: 70, salvage: 8, medkits: 1 }),
  );
  const revision = session.profile(id).activeRun!.interactionRevision;
  await execute(() => session.checkpoint(id, { elapsedMs: 8000, draft: "1/" }));
  assert.equal(session.profile(id).activeRun!.interactionRevision, revision);
  assert.equal(session.profile(id).activeRun!.quiz!.draft, "1/");
  for (let i = 0; i < 5; i++)
    await execute(() =>
      session.submit(
        id,
        session.profile(id).activeRun!.quiz!.questions[i].id,
        "999",
        9000,
      ),
    );
  const reward = session.profile(id).activeRun!.quiz!.rewardChoices![0];
  assert.equal(session.profile(id).activeRun!.phase, "reward");
  await execute(() => session.chooseReward(id, reward.id));
  assert.equal(session.profile(id).activeRun!.phase, "correction");
  assert.deepEqual(session.profile(id).activeRun!.modules[0], reward);
  await execute(() => session.checkpoint(id, { correctionDraft: "1/3" }));
  assert.equal(session.profile(id).activeRun!.quiz!.correctionDraft, "1/3");
  assert.equal(session.profile(id).history.length, 5);
});

test("a lost acknowledgement retries its stored receipt without reapplying changes", async () => {
  const repo = new IndexedProfileRepository(new IDBFactory(), "uncertain");
  await repo.load();
  const candidate = [{ ...profile("a"), victories: 1 }];
  await assert.rejects(
    (async () => {
      await repo.commit(candidate, "same-command");
      throw new Error("Lost acknowledgement");
    })(),
  );
  await repo.commit(candidate, "same-command");
  assert.equal((await repo.load())[0].victories, 1);
  assert.equal((await repo.recoverBackup())[0].victories, 1);
});

test("prepared state cannot overwrite a newer published command", () => {
  const session = new RunSession([], { commit: () => {} });
  const first = session.prepare(() => session.createProfile("First"));
  session.createProfile("Second");
  assert.throws(() => first.publish(), /stale/);
  assert.equal(session.profiles[0].name, "Second");
});

test("recovery repairs an envelope identity mismatch from its matching backup", async () => {
  const factory = new IDBFactory();
  const repo = new IndexedProfileRepository(factory, "corruption");
  await repo.load();
  await repo.commit([profile("a")], "create");
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open("corruption");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction("profiles", "readwrite");
    tx.objectStore("profiles").put({
      id: "a",
      revision: 1,
      data: profile("wrong"),
      previous: profile("a"),
    });
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
  database.close();
  await assert.rejects(repo.load());
  assert.equal((await repo.recoverBackup())[0].id, "a");
  assert.deepEqual(
    (await repo.load()).map((p) => p.id),
    ["a"],
  );
});

test("combat checkpoint reload retains simulation state and deterministic future steps", async () => {
  const repo = new IndexedProfileRepository(new IDBFactory(), "combat-resume");
  const session = new RunSession([], { commit: () => {} });
  const id = session.createProfile("Marine");
  session.start(id, "3");
  const run = session.profile(id).activeRun!;
  const live = new CombatSimulation({ ...run, hp: 65, seed: 42 });
  for (let i = 0; i < 100; i++) live.advance(1000 / 60, { x: 1, y: 0 });
  live.useMedkit();
  const saved = live.serialize();
  session.checkpoint(id, { runId: run.id, combat: saved });
  await repo.commit(session.profiles, "combat-checkpoint");
  const loaded = (await repo.load())[0].activeRun!;
  const resumed = new CombatSimulation({
    ...loaded,
    seed: 42,
    restore: loaded.combatSave,
  });
  assert.deepEqual(resumed.serialize(), saved);
  for (let i = 0; i < 120; i++) {
    const movement = { x: i < 60 ? -1 : 0, y: 1 };
    live.advance(1000 / 60, movement);
    resumed.advance(1000 / 60, movement);
    assert.deepEqual(resumed.serialize(), live.serialize());
  }
});
