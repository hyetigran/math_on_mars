import test from "node:test";
import assert from "node:assert/strict";
import { createTownServer } from "../server/town-server.mjs";
const origin = "http://127.0.0.1:5185";
async function fixture(database = ":memory:", now = Date.now) {
  const app = createTownServer({ database, origin, now });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${app.server.address().port}`;
  return {
    app,
    async request(path, body, cookie = "") {
      const response = await fetch(url + path, {
        method: body ? "POST" : "GET",
        headers: { origin, "content-type": "application/json", cookie },
        body: body ? JSON.stringify(body) : undefined,
      });
      return {
        status: response.status,
        data: await response.json(),
        cookie: response.headers.get("set-cookie")?.split(";")[0] ?? cookie,
      };
    },
    async close() {
      await new Promise((r) => app.server.close(r));
      app.close();
    },
  };
}
test("parent can create a cadet town once and load it from a second login", async () => {
  const f = await fixture();
  try {
    const parent = await f.request("/api/register", {
      username: "parent-one",
      password: "long-test-password",
    });
    assert.equal(parent.status, 201);
    const created = await f.request(
      "/api/cadets",
      { requestId: "cadet-request-1", name: "Nova" },
      parent.cookie,
    );
    assert.equal(created.status, 201);
    const retry = await f.request(
      "/api/cadets",
      { requestId: "cadet-request-1", name: "Nova" },
      parent.cookie,
    );
    assert.equal(retry.data.id, created.data.id);
    const login = await f.request("/api/login", {
      username: "parent-one",
      password: "long-test-password",
    });
    assert.equal(login.status, 200);
    const town = await f.request(
      `/api/towns/${created.data.id}`,
      undefined,
      login.cookie,
    );
    assert.equal(town.data.houseLevel, 1);
    assert.equal(town.data.version, 2);
    assert.deepEqual(town.data.recipes.greenhouse, {
      cost: { blocks: 20, parts: 5 },
      duration: 10000,
    });
    const stranger = await f.request("/api/register", {
      username: "parent-two",
      password: "another-test-password",
    });
    assert.equal(
      (
        await f.request(
          `/api/towns/${created.data.id}`,
          undefined,
          stranger.cookie,
        )
      ).status,
      404,
    );
    assert.equal((await f.request("/api/cadets", undefined)).status, 401);
  } finally {
    await f.close();
  }
});

test("expired sessions and mismatched creation retries are rejected", async () => {
  let clock = 0;
  const app = createTownServer({ origin, now: () => clock });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${app.server.address().port}`;
  try {
    const register = await fetch(url + "/api/register", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({
        username: "expiry-parent",
        password: "long-test-password",
      }),
    });
    const cookie = register.headers.get("set-cookie").split(";")[0];
    const request = (body) =>
      fetch(url + "/api/cadets", {
        method: "POST",
        headers: { origin, "content-type": "application/json", cookie },
        body: JSON.stringify(body),
      });
    assert.equal(
      (await request({ name: "Nova", requestId: "stable-request" })).status,
      201,
    );
    assert.equal(
      (await request({ name: "Other", requestId: "stable-request" })).status,
      409,
    );
    assert.equal(
      (
        await fetch(url + "/api/cadets", {
          method: "POST",
          headers: {
            origin: "http://untrusted.test",
            "content-type": "application/json",
            cookie,
          },
          body: "{}",
        })
      ).status,
      403,
    );
    clock = 86400001;
    assert.equal(
      (await fetch(url + "/api/cadets", { headers: { cookie } })).status,
      401,
    );
  } finally {
    await new Promise((r) => app.server.close(r));
    app.close();
  }
});

test("towns survive service restart in a durable database", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const directory = await mkdtemp(join(tmpdir(), "mars-town-db-"));
  const database = join(directory, "test.sqlite");
  let f = await fixture(database);
  try {
    const parent = await f.request("/api/register", {
      username: "durable-parent",
      password: "long-test-password",
    });
    const cadet = await f.request(
      "/api/cadets",
      { name: "Nova", requestId: "durable-cadet-request" },
      parent.cookie,
    );
    const path = `/api/towns/${cadet.data.id}`;
    await f.request(
      path + "/management",
      {
        deviceId: "durable-device",
        generation: 0,
        requestId: "durable-takeover",
      },
      parent.cookie,
    );
    const preference = {
      deviceId: "durable-device",
      generation: 1,
      requestId: "durable-preference",
      motto: "Home on Mars",
    };
    await f.request(path + "/preference", preference, parent.cookie);
    const before = await f.request(
      `/api/towns/${cadet.data.id}`,
      undefined,
      parent.cookie,
    );
    await f.close();
    f = await fixture(database);
    const login = await f.request("/api/login", {
      username: "durable-parent",
      password: "long-test-password",
    });
    const after = await f.request(
      `/api/towns/${cadet.data.id}`,
      undefined,
      login.cookie,
    );
    assert.deepEqual(
      { ...after.data, serverNow: 0 },
      { ...before.data, serverNow: 0 },
    );
    const retry = await f.request(
      path + "/preference",
      preference,
      parent.cookie,
    );
    assert.equal(retry.status, 200);
    assert.equal(retry.data.revision, 1);
  } finally {
    await f.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("management takeover rejects stale commands and preserves durable retry receipts", async () => {
  const f = await fixture();
  try {
    const account = {
      username: "handoff-parent",
      password: "long-test-password",
    };
    const one = await f.request("/api/register", account);
    const two = await f.request("/api/login", account);
    const cadet = await f.request(
      "/api/cadets",
      { name: "Nova", requestId: "handoff-cadet" },
      one.cookie,
    );
    const path = `/api/towns/${cadet.data.id}`;
    const take = (cookie, deviceId, requestId, generation) =>
      f.request(
        path + "/management",
        { deviceId, requestId, generation },
        cookie,
      );
    const first = await take(one.cookie, "device-one", "take-first", 0);
    assert.equal(first.status, 200);
    assert.equal(first.data.generation, 1);
    const command = {
      deviceId: "device-one",
      generation: 1,
      requestId: "motto-first",
      motto: "Grow together",
    };
    const saved = await f.request(path + "/preference", command, one.cookie);
    assert.equal(saved.status, 200);
    assert.equal(
      (await f.request(path + "/preference", command, one.cookie)).data
        .revision,
      1,
    );
    assert.equal(
      (
        await f.request(
          path + "/preference",
          { ...command, motto: "Different" },
          one.cookie,
        )
      ).status,
      409,
    );
    const second = await take(two.cookie, "device-two", "take-second", 1);
    assert.equal(second.data.generation, 2);
    const handedRetry = await f.request(
      path + "/preference",
      { ...command, deviceId: "device-two", generation: 2 },
      two.cookie,
    );
    assert.equal(handedRetry.status, 200);
    assert.equal(handedRetry.data.revision, 1);

    assert.equal(
      (await f.request(path + "/preference", command, one.cookie)).status,
      409,
    );
    assert.equal(
      (await take(one.cookie, "device-one", "take-first", 0)).status,
      409,
    );
    assert.equal(
      (await f.request(path, undefined, two.cookie)).data.motto,
      "Grow together",
    );
    const stranger = await f.request("/api/register", {
      username: "handoff-stranger",
      password: "long-test-password",
    });
    assert.equal(
      (await take(stranger.cookie, "device-three", "take-other", 2)).status,
      404,
    );
  } finally {
    await f.close();
  }
});

test("construction command retries and reload use authoritative elapsed time", async () => {
  let clock = 0;
  const f = await fixture(":memory:", () => clock);
  try {
    const parent = await f.request("/api/register", {
      username: "builder-parent",
      password: "long-test-password",
    });
    const cadet = await f.request(
      "/api/cadets",
      { name: "Nova", requestId: "builder-cadet" },
      parent.cookie,
    );
    const path = `/api/towns/${cadet.data.id}`;
    await f.request(
      path + "/management",
      {
        deviceId: "builder-device",
        requestId: "builder-takeover",
        generation: 0,
      },
      parent.cookie,
    );
    const request = {
      deviceId: "builder-device",
      generation: 1,
      requestId: "builder-command",
      command: { action: "build", plotId: "garden" },
    };
    assert.equal(
      (await f.request(path + "/command", request, parent.cookie)).status,
      200,
    );
    await f.request(path + "/command", request, parent.cookie);
    let state = (await f.request(path, undefined, parent.cookie)).data;
    assert.equal(state.resources.blocks, 60);
    assert.equal(state.jobs.length, 1);
    clock = 10000;
    state = (await f.request(path, undefined, parent.cookie)).data;
    assert.equal(state.plots.garden.building, "greenhouse");
    await f.request(path + "/command", request, parent.cookie);
    assert.equal(
      (await f.request(path, undefined, parent.cookie)).data.jobs.length,
      1,
    );
  } finally {
    await f.close();
  }
});
