import test from "node:test";
import assert from "node:assert/strict";
import { loadImage, loadedImage } from "../src/image-cache";

test("concurrent loads share decoded artwork and failures can be retried", async () => {
  const original = globalThis.Image;
  const created: FakeImage[] = [];
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    decodes = 0;
    constructor() {
      created.push(this);
    }
    set src(value: string) {
      queueMicrotask(() =>
        value === "broken" && created.length === 2
          ? this.onerror?.()
          : this.onload?.(),
      );
    }
    async decode() {
      this.decodes++;
    }
  }
  Object.defineProperty(globalThis, "Image", {
    configurable: true,
    value: FakeImage,
  });
  try {
    const first = loadImage("arena");
    assert.equal(loadImage("arena"), first);
    const image = await first;
    assert.equal(created.length, 1);
    assert.equal(created[0].decodes, 1);
    assert.equal(loadedImage("arena"), image);
    assert.equal(await loadImage("arena"), image);
    await assert.rejects(loadImage("broken"), /Could not load/);
    assert.throws(() => loadedImage("broken"), /not finished/);
    assert.ok(await loadImage("broken"));
    assert.equal(created.length, 3);
  } finally {
    if (original)
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: original,
      });
    else Reflect.deleteProperty(globalThis, "Image");
  }
});
