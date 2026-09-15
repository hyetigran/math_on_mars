import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash, webcrypto } from "node:crypto";
import { runInNewContext } from "node:vm";

const scope = "https://example.test/game/";
const template = readFileSync("scripts/service-worker.js", "utf8");
class StoredCaches {
  stores = new Map<string, Map<string, Response>>();
  async keys() {
    return [...this.stores.keys()];
  }
  async delete(name: string) {
    return this.stores.delete(name);
  }
  async has(name: string) {
    return this.stores.has(name);
  }
  async open(name: string) {
    if (!this.stores.has(name)) this.stores.set(name, new Map());
    const store = this.stores.get(name)!;
    return {
      match: async (url: string) => store.get(url)?.clone(),
      put: async (url: string, response: Response) => {
        store.set(url, response.clone());
      },
      delete: async (url: string) => store.delete(url),
    };
  }
}
function worker(
  version: string,
  files: Record<string, string>,
  caches = new StoredCaches(),
  workerScope = scope,
) {
  const listeners = new Map<string, (event: any) => void>();
  let network = true;
  let clientVersion: string | undefined;
  let broken = "";
  let networkRequests = 0;
  let skippedWaiting = 0;
  let unregistered = 0;
  const manifest = {
    version,
    files: Object.entries(files).map(([path, body]) => ({
      path,
      sha256: createHash("sha256").update(body).digest("hex"),
    })),
  };
  runInNewContext(
    template.replace("/* BUILD_MANIFEST */ null", JSON.stringify(manifest)),
    {
      self: {
        registration: {
          scope: workerScope,
          unregister: async () => {
            unregistered++;
          },
        },
        skipWaiting: async () => {
          skippedWaiting++;
        },
        clients: {
          claim: async () => {},
          get: async () =>
            clientVersion
              ? { url: workerScope + "?build=" + clientVersion }
              : undefined,
        },
        addEventListener: (name: string, listener: (event: any) => void) =>
          listeners.set(name, listener),
      },
      caches,
      crypto: webcrypto,
      URL,
      Response,
      Uint8Array,
      fetch: async (url: string | Request) => {
        networkRequests++;
        if (!network) throw new Error("Offline");
        const path = (typeof url === "string" ? url : url.url).slice(
          workerScope.length,
        );
        return new Response(path === broken ? "wrong content" : files[path], {
          status: path in files ? 200 : 404,
        });
      },
    },
  );
  return {
    caches,
    stats: () => ({ networkRequests, skippedWaiting, unregistered }),
    network: (enabled: boolean) => {
      network = enabled;
    },
    corruptDownload: (path: string) => {
      broken = path;
    },
    async install() {
      let pending: Promise<void>;
      listeners.get("install")!({
        waitUntil: (p: Promise<void>) => {
          pending = p;
        },
      });
      await pending!;
    },
    async activate() {
      let pending: Promise<void>;
      listeners.get("activate")!({
        waitUntil: (p: Promise<void>) => {
          pending = p;
        },
      });
      await pending!;
    },
    async ready(requested = version, repair = false) {
      let pending: Promise<void>, result: boolean;
      listeners.get("message")!({
        data: {
          type: repair ? "ENSURE_PACK" : "CHECK_PACK",
          version: requested,
        },
        ports: [
          {
            postMessage: (value: { ready: boolean }) => {
              result = value.ready;
            },
          },
        ],
        waitUntil: (p: Promise<void>) => {
          pending = p;
        },
      });
      await pending!;
      return result!;
    },
    async fetch(path: string, navigate = false, clientBuild?: string) {
      clientVersion = clientBuild;
      let response: Promise<Response>;
      listeners.get("fetch")!({
        clientId: clientBuild ? "client" : undefined,
        request: {
          method: "GET",
          url: workerScope + path,
          mode: navigate ? "navigate" : "cors",
        },
        respondWith: (p: Promise<Response>) => {
          response = p;
        },
      });
      return response!;
    },
  };
}

test("localhost workers retire without precaching preview assets", async () => {
  const preview = worker(
    "0000000000000001",
    { "index.html": "preview shell", "audio/task.mp3": "preview speech" },
    new StoredCaches(),
    "http://localhost:59927/dist/",
  );
  await preview.install();
  assert.equal(preview.stats().networkRequests, 0);
  assert.equal(preview.stats().skippedWaiting, 1);
  assert.equal(await preview.ready(), true);
  await preview.activate();
  assert.equal(preview.stats().unregistered, 1);
});

test("complete packs serve shell and required speech offline, with old builds retained across updates", async () => {
  const oldVersion = "1111111111111111",
    newVersion = "2222222222222222";
  const first = worker(oldVersion, {
    "index.html": "old shell",
    "audio/task.mp3": "old speech",
  });
  await first.install();
  assert.equal(await first.ready(), true);
  first.network(false);
  assert.equal(await (await first.fetch("", true)).text(), "old shell");
  const next = worker(
    newVersion,
    { "index.html": "new shell", "audio/task.mp3": "new speech" },
    first.caches,
  );
  await next.install();
  next.network(false);
  assert.equal(await next.ready(oldVersion), true);
  assert.equal(
    await (await next.fetch(`?build=${oldVersion}`, true)).text(),
    "old shell",
  );
  assert.equal(
    await (await next.fetch(`audio/task.mp3?build=${oldVersion}`)).text(),
    "old speech",
  );
  assert.equal(await (await next.fetch("", true)).text(), "new shell");
  assert.equal(
    await (await next.fetch("audio/task.mp3", false, oldVersion)).text(),
    "old speech",
  );
});

test("interrupted or corrupted installs stay unready; missing pinned files never fall through to newer network content", async () => {
  const version = "3333333333333333";
  const pack = worker(version, {
    "index.html": "shell",
    "audio/task.mp3": "speech",
  });
  pack.corruptDownload("audio/task.mp3");
  await assert.rejects(pack.install(), /verification/);
  assert.equal(await pack.ready(), false);
  pack.corruptDownload("");
  await pack.install();
  const cache = await pack.caches.open(`math-on-mars:${scope}:${version}`);
  await cache.delete(scope + "audio/task.mp3");
  assert.equal(await pack.ready(), false);
  assert.equal(
    (await pack.fetch(`audio/task.mp3?build=${version}`)).status,
    503,
  );
  assert.equal(await pack.ready("9999999999999999"), false);
  assert.equal(await pack.ready(version, true), true);
  pack.network(false);
  assert.equal(
    await (await pack.fetch(`audio/task.mp3?build=${version}`)).text(),
    "speech",
  );
});
