import test from "node:test";
import assert from "node:assert/strict";
import { createTownServer } from "../server/town-server.mjs";
test("guest play resumes, stays isolated, and links exactly once without replacing parent cadets", async () => {
  const origin = "http://127.0.0.1:5185",
    app = createTownServer({ origin });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${app.server.address().port}`;
  const jar = {};
  async function request(path, data, cookies = jar) {
    const r = await fetch(url + path, {
      method: data ? "POST" : "GET",
      headers: {
        origin,
        "content-type": "application/json",
        cookie: Object.entries(cookies)
          .map(([k, v]) => `${k}=${v}`)
          .join("; "),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    for (const value of r.headers.getSetCookie()) {
      const [key, ...rest] = value.split(";")[0].split("=");
      cookies[key] = rest.join("=");
    }
    return { status: r.status, data: await r.json() };
  }
  try {
    assert.equal((await request("/api/access")).data.parent, null);
    const first = await request("/api/guest", {});
    assert.equal(first.status, 200);
    const id = first.data.id,
      path = `/api/towns/${id}`,
      guestCookie = { ...jar };
    assert.equal((await request("/api/guest", {})).data.id, id);
    const other = {};
    const otherTown = await request("/api/guest", {}, other);
    assert.notEqual(otherTown.data.id, id);
    assert.equal((await request(path, undefined, other)).status, 404);
    await request(path + "/management", {
      deviceId: "guest-device",
      generation: 0,
      requestId: "guest-manage",
    });
    const command = (requestId, intent) =>
      request(path + "/command", {
        deviceId: "guest-device",
        generation: 1,
        requestId,
        command: intent,
      });
    assert.equal(
      (
        await command("guest-profile", {
          action: "guest-profile",
          name: "Nova",
          grade: "2",
        })
      ).status,
      200,
    );
    await command("guest-build", { action: "build", plotId: "garden" });
    const before = (await request(path)).data;
    assert.equal(before.resources.blocks, 60);
    assert.ok(before.eligibleTopics.every((t) => t.startsWith("2:")));
    assert.equal(
      (
        await command("guest-settings", {
          action: "set-topics",
          topics: [],
          password: "long-test-password",
        })
      ).status,
      403,
    );
    await request("/api/register", {
      username: "guest-parent",
      password: "long-test-password",
    });
    const existing = await request("/api/cadets", {
      name: "Existing",
      requestId: "existing-cadet",
    });
    assert.equal(
      (await request(path)).status,
      200,
      "Signing in preserves access before explicit linking",
    );
    const link = await request("/api/guest/link", {
      requestId: "link-guest-town",
    });
    assert.equal(link.status, 200);
    assert.equal(link.data.id, id);
    const retry = await request("/api/guest/link", {
      requestId: "link-guest-town",
    });
    assert.equal(retry.data.id, id);
    assert.equal((await request(path)).data.resources.blocks, 60);
    const cadets = (await request("/api/cadets")).data;
    assert.equal(cadets.length, 2);
    assert.ok(cadets.some((c) => c.id === existing.data.id));
    assert.equal((await request(path, undefined, guestCookie)).status, 401);
    assert.equal((await request("/api/access")).data.guest, null);
    const login = {};
    await request(
      "/api/login",
      { username: "guest-parent", password: "long-test-password" },
      login,
    );
    assert.equal((await request(path, undefined, login)).data.jobs.length, 1);
  } finally {
    await new Promise((r) => app.server.close(r));
    app.close();
  }
});

test("guest sessions survive restart, legacy accounts migrate, and cookie roles cannot be swapped", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { DatabaseSync } = await import("node:sqlite");
  const directory = await mkdtemp(join(tmpdir(), "town-guest-")),
    database = join(directory, "town.sqlite");
  const origin = "http://127.0.0.1:5185";
  let app, url;
  async function start() {
    app = createTownServer({ database, origin });
    await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
    url = `http://127.0.0.1:${app.server.address().port}`;
  }
  async function stop() {
    await new Promise((r) => app.server.close(r));
    app.close();
    app = null;
  }
  async function request(path, data, cookie = "") {
    const r = await fetch(url + path, {
      method: data ? "POST" : "GET",
      headers: { origin, "content-type": "application/json", cookie },
      body: data ? JSON.stringify(data) : undefined,
    });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  }
  try {
    await start();
    const parent = await request("/api/register", {
      username: "legacy-parent",
      password: "long-test-password",
    });
    const cadet = await request(
      "/api/cadets",
      { name: "Legacy", requestId: "legacy-cadet" },
      parent.cookie,
    );
    await stop();
    // Recreate the pre-guest schema around an existing account, session and town.
    const legacy = new DatabaseSync(database);
    legacy.exec(
      "ALTER TABLE owners DROP COLUMN kind; ALTER TABLE owners RENAME TO parents",
    );
    legacy.close();
    await start();
    assert.equal(
      (await request(`/api/towns/${cadet.data.id}`, undefined, parent.cookie))
        .status,
      200,
    );
    const guest = await request("/api/guest", {});
    assert.equal(
      (
        await request(
          "/api/cadets",
          undefined,
          guest.cookie.replace("mars_guest=", "mars_parent="),
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await request(
          "/api/access",
          undefined,
          parent.cookie.replace("mars_parent=", "mars_guest="),
        )
      ).data.guest,
      null,
    );
    assert.equal(
      (
        await request(
          "/api/cadets",
          { name: "No", requestId: "guest-forbidden" },
          guest.cookie,
        )
      ).status,
      401,
    );
    await stop();
    await start();
    assert.equal(
      (await request("/api/guest", {}, guest.cookie)).data.id,
      guest.data.id,
    );
    const cookies = parent.cookie + "; " + guest.cookie;
    const links = await Promise.all([
      request("/api/guest/link", { requestId: "durable-link" }, cookies),
      request("/api/guest/link", { requestId: "durable-link" }, cookies),
    ]);
    assert.ok(
      links.every((r) => r.status === 200 && r.data.id === guest.data.id),
    );
    await stop();
    await start();
    assert.equal(
      (
        await request(
          "/api/guest/link",
          { requestId: "durable-link" },
          parent.cookie,
        )
      ).data.id,
      guest.data.id,
    );
    assert.equal(
      (await request("/api/cadets", undefined, parent.cookie)).data.length,
      2,
    );
    assert.equal(
      (await request(`/api/towns/${guest.data.id}`, undefined, guest.cookie))
        .status,
      401,
    );
  } finally {
    if (app) await stop();
    await rm(directory, { recursive: true, force: true });
  }
});
