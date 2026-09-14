import test from "node:test";
import assert from "node:assert/strict";
import { CheckpointQueue } from "../src/checkpoint-queue";
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

test("slow checkpoints coalesce waiting snapshots and drain before a critical command", async () => {
  const gate = deferred();
  const calls: number[] = [];
  const queue = new CheckpointQueue(() => {});
  queue.enqueue(async () => {
    calls.push(1);
    await gate.promise;
  });
  queue.enqueue(async () => {
    calls.push(2);
  });
  queue.enqueue(async () => {
    calls.push(3);
  });
  const critical = queue.drain().then(() => calls.push(4));
  assert.deepEqual(calls, [1]);
  gate.resolve();
  await critical;
  assert.deepEqual(calls, [1, 3, 4]);
});

test("failure blocks critical work and retries the exact failed job before the latest snapshot", async () => {
  const gate = deferred();
  let fail = true;
  const calls: string[] = [];
  const queue = new CheckpointQueue(() => {});
  queue.enqueue(async () => {
    calls.push("same receipt");
    await gate.promise;
    if (fail) throw new Error("quota");
  });
  queue.enqueue(async () => {
    calls.push("latest");
  });
  const drained = queue.drain();
  gate.resolve();
  await assert.rejects(drained, /quota/);
  assert.deepEqual(calls, ["same receipt"]);
  fail = false;
  await queue.drain(true);
  assert.deepEqual(calls, ["same receipt", "same receipt", "latest"]);
});

test("delayed checkpoints settle before wave transitions and terminal backups, preserving siblings", async () => {
  const { IDBFactory } = await import("fake-indexeddb");
  const { IndexedProfileRepository } = await import("../src/indexeddb");
  const { RunSession } = await import("../src/session");
  const { CombatSimulation } = await import("../src/combat-rules");
  for (const terminal of [false, true]) {
    const repository = new IndexedProfileRepository(
      new IDBFactory(),
      `terminal-${terminal}`,
    );
    const session = new RunSession([], { commit: () => {} });
    const id = session.createProfile("Active");
    session.createProfile("Sibling");
    session.start(id, "3");
    const sibling = session.profiles[1];
    await repository.commit(session.profiles, "initial");
    const run = session.profile(id).activeRun!;
    const simulation = new CombatSimulation({ ...run, seed: 42 });
    const snapshot = simulation.serialize();
    snapshot.hp = 83;
    snapshot.salvage = 5;
    const gate = deferred();
    const queue = new CheckpointQueue(() => {});
    queue.enqueue(async () => {
      const prepared = session.prepare(() =>
        session.checkpoint(id, { runId: run.id, combat: snapshot }),
      );
      await gate.promise;
      await repository.commit(prepared.profiles, "background");
      prepared.publish();
    });
    const critical = (async () => {
      await queue.drain();
      const prepared = session.prepare(() =>
        terminal
          ? session.end(id, false, { hp: 0, salvage: 9, medkits: 0 })
          : session.finishWave(id, { hp: 74, salvage: 9, medkits: 0 }),
      );
      await repository.commit(prepared.profiles, "critical");
      prepared.publish();
    })();
    assert.equal(session.profile(id).activeRun!.hp, 100);
    gate.resolve();
    await critical;
    const saved = await repository.load();
    assert.deepEqual(
      saved.find((p) => p.id === sibling.id),
      sibling,
    );
    if (terminal) {
      assert.equal(saved.find((p) => p.id === id)!.activeRun, undefined);
      assert.equal(
        (await repository.recoverBackup()).find((p) => p.id === id)!.activeRun,
        undefined,
      );
    } else {
      assert.equal(saved.find((p) => p.id === id)!.activeRun!.phase, "quiz");
      assert.equal(saved.find((p) => p.id === id)!.activeRun!.hp, 74);
      assert.equal(saved.find((p) => p.id === id)!.activeRun!.salvage, 9);
    }
  }
});
