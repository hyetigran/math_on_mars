import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function harness() {
  const started: any[] = [];
  const contexts: any[] = [];
  const fetched: string[] = [];
  class Context {
    currentTime = 0;
    state = "running";
    destination = {};
    constructor() {
      contexts.push(this);
    }
    resume() {
      return Promise.resolve();
    }
    decodeAudioData(name: string) {
      return Promise.resolve({ name, duration: 100 });
    }
    createGain() {
      return {
        gain: { value: 0, linearRampToValueAtTime() {} },
        connect() {},
        disconnect() {},
      };
    }
    createBufferSource() {
      const source = {
        buffer: undefined as any,
        loop: false,
        stopped: false,
        offset: 0,
        connect(gain: any) {
          return gain;
        },
        disconnect() {},
        onended: () => {},
        start(_: number, offset: number) {
          this.offset = offset;
          started.push(this);
        },
        stop() {
          this.stopped = true;
          this.onended();
        },
      };
      return source;
    }
  }
  const exports: any = {};
  const code = ts.transpileModule(readFileSync("src/battle-audio.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  runInNewContext(code, {
    exports,
    require: () => ({ battleAudioUrl: (name: string) => name }),
    AudioContext: Context,
    window: { addEventListener() {} },
    document: { hidden: false },
    performance: { now: () => 10000 },
    fetch: async (name: string) => {
      fetched.push(name);
      return { ok: true, arrayBuffer: async () => name };
    },
  });
  return { ...exports, started, contexts, fetched };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("camp starts its music, proximity hum stops, and destruction stops all loops", async () => {
  const h = harness();
  const camp = new h.BattleAudio("camp");
  await settle();
  assert.ok(
    h.started.some((s: any) => s.buffer.name === "music_camp" && s.loop),
  );
  assert.ok(!h.started.some((s: any) => s.buffer.name === "wave_start"));
  camp.setAmbient("amb_portal_hum", true);
  await settle();
  camp.setAmbient("amb_portal_hum", false);
  assert.ok(
    h.started.find((s: any) => s.buffer.name === "amb_portal_hum").stopped,
  );
  camp.destroy();
  assert.ok(h.started.every((s: any) => s.stopped));
});

test("battle music resumes across waves, resets for new missions, boss starts at zero", async () => {
  const h = harness();
  const first = new h.BattleAudio(false);
  await settle();
  h.contexts[0].currentTime = 37;
  first.finish(false, false);
  first.destroy();
  const second = new h.BattleAudio(false);
  await settle();
  const battles = () =>
    h.started.filter((s: any) => s.buffer.name === "music_battle");
  assert.equal(battles().at(-1).offset, 37);
  second.destroy();
  h.resetBattleMusic();
  new h.BattleAudio(false);
  new h.BattleAudio(true);
  await settle();
  assert.equal(battles().at(-1).offset, 0);
  assert.equal(
    h.started.find((s: any) => s.buffer.name === "music_boss").offset,
    0,
  );
});

test("pause during async loading cancels stale loops; resume starts each loop once", async () => {
  const h = harness();
  const player = new h.BattleAudio(false);
  player.pause();
  await settle();
  assert.equal(h.started.length, 0);
  player.resume();
  player.resume();
  await settle();
  assert.equal(h.started.filter((s: any) => s.loop).length, 2);
  h.contexts[0].currentTime = 12;
  player.pause();
  player.resume();
  await settle();
  assert.equal(
    h.started.filter((s: any) => s.buffer.name === "music_battle").at(-1)
      .offset,
    12,
  );
});

test("mission result cues survive arena disposal without restarting loops", async () => {
  const h = harness();
  const player = new h.BattleAudio(true);
  await settle();
  player.finish(false, true);
  player.destroy();
  await settle();
  assert.equal(
    h.started.filter((s: any) => s.buffer.name === "overmind_death").length,
    1,
  );
  assert.equal(
    h.started.filter((s: any) => s.buffer.name === "mission_victory").length,
    1,
  );
  assert.ok(h.started.filter((s: any) => s.loop).every((s: any) => s.stopped));
});

test("rapid portal proximity changes while loading do not start duplicate hum loops", async () => {
  const h = harness();
  const camp = new h.BattleAudio("camp");
  camp.setAmbient("amb_portal_hum", true);
  camp.setAmbient("amb_portal_hum", false);
  camp.setAmbient("amb_portal_hum", true);
  await settle();
  assert.equal(
    h.started.filter((s: any) => s.buffer.name === "amb_portal_hum").length,
    1,
  );
});

test("splash preloads camp music silently and camp starts it without a gesture or second fetch", async () => {
  const h = harness();
  h.preloadCampMusic();
  await settle();
  assert.equal(h.started.length, 0);
  assert.deepEqual(h.fetched, ["music_camp"]);
  new h.BattleAudio("camp");
  await settle();
  assert.equal(
    h.fetched.filter((name: string) => name === "music_camp").length,
    1,
  );
  assert.equal(
    h.started.filter((source: any) => source.buffer.name === "music_camp")
      .length,
    1,
  );
});
