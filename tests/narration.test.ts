import test from "node:test";
import assert from "node:assert/strict";
import { InstalledNarration } from "../src/narration";

test("decoded speech stays unready for scored exposure until enabled; stop cancels pending and queued playback", async () => {
  const originalContext = globalThis.AudioContext;
  const originalFetch = globalThis.fetch;
  let allowResume: (() => void) | undefined;
  const sources: {
    stopped: boolean;
    startTime?: number;
    onended?: (() => void) | null;
  }[] = [];
  class AudioContextFixture {
    state = "suspended";
    currentTime = 10;
    destination = {};
    async decodeAudioData() {
      return { duration: 1 };
    }
    resume() {
      return new Promise<void>((resolve) => {
        allowResume = () => {
          this.state = "running";
          resolve();
        };
      });
    }
    createBufferSource() {
      const source = {
        stopped: false,
        startTime: undefined as number | undefined,
        buffer: null,
        onended: null,
        connect() {},
        disconnect() {},
        start(time: number) {
          this.startTime = time;
        },
        stop() {
          this.stopped = true;
        },
      };
      sources.push(source);
      return source;
    }
  }
  Object.assign(globalThis, {
    AudioContext: AudioContextFixture,
    fetch: async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(1),
    }),
  });
  try {
    const narration = new InstalledNarration();
    await narration.load();
    assert.equal(narration.ready, true);
    assert.equal(narration.playable, false);
    const enable = narration.enable();
    assert.equal(narration.playable, false);
    allowResume!();
    await enable;
    assert.equal(narration.playable, true);
    const pending = narration.play(["what", "n2"], () => {});
    narration.stop();
    allowResume!();
    await pending;
    assert.equal(sources.length, 0);
    const playing = narration.play(["what", "n2"], () => {});
    allowResume!();
    await playing;
    assert.deepEqual(
      sources.map((s) => s.startTime),
      [10, 11],
    );
    narration.stop();
    assert.ok(sources.every((s) => s.stopped && s.onended === null));
  } finally {
    Object.assign(globalThis, {
      AudioContext: originalContext,
      fetch: originalFetch,
    });
  }
});

test("a missing equipment clip keeps its pack unready and retry loads the missing clip", async () => {
  const originalContext = globalThis.AudioContext;
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  let missing = true;
  class AudioContextFixture {
    state = "running";
    async decodeAudioData() {
      return { duration: 1 };
    }
  }
  Object.assign(globalThis, {
    AudioContext: AudioContextFixture,
    fetch: async (url: string) => {
      requested.push(url);
      return {
        ok: !(missing && url.endsWith("/forge.mp3")),
        arrayBuffer: async () => new ArrayBuffer(1),
      };
    },
  });
  try {
    const narration = new InstalledNarration(
      ["buy", "forge"],
      "/audio/equipment",
    );
    await assert.rejects(narration.load(), /could not be loaded/);
    assert.equal(narration.ready, false);
    assert.equal(narration.playable, false);
    missing = false;
    await narration.load();
    assert.equal(narration.ready, true);
    assert.equal(narration.playable, true);
    assert.ok(requested.every((url) => url.startsWith("/audio/equipment/")));
    assert.equal(requested.filter((url) => url.endsWith("/buy.mp3")).length, 1);
  } finally {
    Object.assign(globalThis, {
      AudioContext: originalContext,
      fetch: originalFetch,
    });
  }
});
