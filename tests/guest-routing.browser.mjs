import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
import { createServer as createViteServer } from "vite";
import { createTownServer } from "../server/town-server.mjs";
const origin = "http://127.0.0.1:5188",
  app = createTownServer({ origin });
await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
const vite = await createViteServer({
  configFile: false,
  server: {
    host: "127.0.0.1",
    port: 5188,
    strictPort: true,
    proxy: { "/api": `http://127.0.0.1:${app.server.address().port}` },
  },
});
let browser;
try {
  await vite.listen();
  browser = await puppeteer.launch({
    executablePath:
      process.env.CHROME_PATH ??
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const page = await browser.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(origin + "/");
  await page.waitForSelector(".play-cta");
  await page.screenshot({
    path: "/tmp/mars-v2-implementation/landing-desktop.png",
    fullPage: true,
  });
  assert.equal(await page.$("dialog[open]"), null);
  await page.click("[data-parent]");
  await page.waitForSelector("dialog[open]");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  await page.click(".play-cta");
  await page.waitForSelector("#management");
  const town = await page.$eval(".town-view iframe", (e) =>
    new URL(e.src).searchParams.get("town"),
  );
  await page.waitForFunction(
    () =>
      document.querySelector("[data-guest-profile] button")?.disabled === false,
  );
  const scene = await (await page.$(".town-view iframe")).contentFrame();
  await scene.waitForFunction(() =>
    document.body.classList.contains("game-embedded"),
  );
  assert.equal(await page.$(".site-header"), null);
  assert.equal(
    await page.evaluate(() =>
      [...document.querySelectorAll("input")].some((e) => e.checkVisibility()),
    ),
    false,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollHeight > innerHeight,
    ),
    false,
  );
  await page.screenshot({
    path: "/tmp/mars-v2-implementation/hud-desktop.png",
  });
  await page.click("[data-camera]");
  await scene.waitForFunction(() => window.townPrototype.mode === "walk");
  await page.click("[data-camera]");
  await scene.waitForFunction(() => window.townPrototype.mode === "overview");
  await scene.evaluate(() =>
    parent.postMessage(
      { type: "town-select", plotId: "home" },
      location.origin,
    ),
  );
  await page.waitForSelector(".game-panel[open]");
  assert.equal(await page.$eval("[data-plot=garden]", (e) => e.hidden), true);
  assert.equal(
    await page.$eval(".game-panel", (e) => e.matches(":modal")),
    false,
  );
  assert.ok(
    await page.$eval(
      ".game-panel",
      (e) => e.getBoundingClientRect().width <= 300,
    ),
  );
  await page.click("button[data-panel=settings]");
  await page.keyboard.press("Escape");
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.getAttribute("data-panel"),
    ),
    "settings",
  );
  await scene.evaluate(() =>
    parent.postMessage(
      { type: "town-select", plotId: "home" },
      location.origin,
    ),
  );
  await page.waitForSelector(".game-panel[open]");
  await page.click("[data-all-plots]");
  assert.equal(
    await page.$eval(".game-panel", (e) => e.matches(":modal")),
    true,
  );
  assert.equal(await page.$eval("[data-plot=garden]", (e) => e.hidden), false);

  await page.keyboard.press("Escape");
  await page.click("button[data-panel=settings]");
  assert.equal(await page.$("[data-guest-profile] [name=name]"), null);
  assert.equal(await page.$("[data-preference]"), null);
  await page.select("[data-guest-profile] [name=grade]", "2");
  await page.click("[data-guest-profile] button");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-begin-practice]")
      ?.dataset.beginPractice.startsWith("2:"),
  );
  assert.equal(await page.$("[data-eligibility]"), null);
  await page.waitForFunction(
    () =>
      document.querySelector("[data-plot=garden] button")?.disabled === false,
  );
  await page.click("[data-close-panel]");
  await page.click("button[data-panel=build]");
  await page.click("[data-plot=garden] button");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-plot=garden]")
      ?.textContent.includes("Cancel build"),
  );
  await page.waitForSelector("[data-farm=garden]");
  await page.waitForFunction(
    () =>
      !document.querySelector("[data-farm=garden] [data-mutation]")?.disabled,
  );
  await page.click("[data-farm=garden] [data-unlock-seed]");
  await page.waitForFunction(
    () => !document.querySelector("[data-unlock-seed]"),
  );
  await page.click("[data-farm=garden] button");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-farm=garden]")
      ?.textContent.includes("Unassign worker"),
  );
  await page.click("[data-farm=garden] button:last-child");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-farm=garden]")
      ?.textContent.includes("Growing"),
  );
  await page.click("[data-close-panel]");
  await page.click("button[data-panel=build]");
  await page.evaluate(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      if (
        args[1]?.body &&
        JSON.parse(args[1].body).command?.action === "upgrade-house"
      ) {
        window.fetch = original;
        throw Error("Injected network failure");
      }
      return original(...args);
    };
  });
  await page.click("[data-upgrade-house]");
  await page.waitForFunction(
    () =>
      document.querySelector("[data-management-status]")?.checkVisibility() &&
      document
        .querySelector("[data-management-status]")
        ?.textContent.includes("connection"),
  );
  await new Promise((resolve) => setTimeout(resolve, 2500));
  assert.equal(
    await page.$eval("[data-management-status]", (e) => e.checkVisibility()),
    true,
  );
  await page.click("[data-close-panel]");
  await page.click("button[data-panel=settings]");
  await page.click("[data-sync]");
  await page.waitForFunction(
    () =>
      document.querySelector("[data-management-status]")?.dataset.quiet ===
      "true",
  );
  await page.click("[data-close-panel]");
  await page.click("button[data-panel=practice]");
  await page.click("[data-begin-practice]");
  await page.waitForSelector("[data-answer-practice]");
  await page.waitForFunction(
    () => !document.querySelector("[data-answer-practice] button")?.disabled,
  );
  await page.type("[name=answer]", "999999");
  await page.click("[data-answer-practice] button");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-practice]")
      ?.textContent.includes("Try again."),
  );
  await page.reload();
  await page.waitForSelector(".town-view iframe");
  assert.equal(
    await page.$eval(".town-view iframe", (e) =>
      new URL(e.src).searchParams.get("town"),
    ),
    town,
  );
  await page.click("[data-menu]");
  await page.click("dialog [data-parent]");
  await page.waitForSelector(".town-dialog form");
  await page.type("[name=username]", "routing-parent");
  await page.type("[name=password]", "long-test-password");
  await page.click("[value=register]");
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  await page.waitForSelector(".town-view iframe");
  assert.equal(new URL(page.url()).pathname, "/play");
  assert.equal(
    await page.$eval(".town-view iframe", (e) =>
      new URL(e.src).searchParams.get("town"),
    ),
    town,
  );
  // An existing cadet must survive the explicit guest link.
  const old = await page.evaluate(async () => {
    const r = await fetch("/api/cadets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Existing",
        requestId: "existing-routing-cadet",
      }),
    });
    return r.json();
  });
  await page.click("[data-menu]");
  await page.click("dialog [data-parent]");
  await page.waitForSelector("[data-link]");
  await page.click("[data-link]");
  await page.waitForFunction(
    () => document.querySelectorAll(".cadet-list a").length === 2,
  );
  assert.ok(await page.$(`a[href='/play?cadet=${old.id}']`));
  await page.click(`a[href='/play?cadet=${town}']`);
  await page.waitForSelector("#management");
  await page.click("a.battle-action");
  await page.waitForSelector(".battle-view iframe");
  const battle = await (await page.$(".battle-view iframe")).contentFrame();
  await battle.waitForSelector("#track-dialog", { timeout: 60000 });
  await page.click(".battle-header a");
  await page.waitForSelector("#management");
  await page.goBack();
  await page.waitForSelector(".battle-view");
  await page.goForward();
  await page.waitForSelector("#management");
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/mars-v2-implementation/hud-mobile.png" });
  await page.click("[data-menu]");
  await page.screenshot({
    path: "/tmp/mars-v2-implementation/base-menu-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.keyboard.press("Escape");
  // Independent browser cannot see linked town until parent sign-in.
  const context = await browser.createBrowserContext(),
    other = await context.newPage();
  await other.goto(origin + "/parents");
  await other.waitForSelector(".parent-page [data-parent]");
  assert.equal(
    await other.evaluate(
      async (id) => (await fetch("/api/towns/" + id)).status,
      town,
    ),
    401,
  );
  await other.click(".parent-page [data-parent]");
  await other.type("[name=username]", "routing-parent");
  await other.type("[name=password]", "long-test-password");
  await other.click("[value=login]");
  await other.waitForSelector(".cadet-list a");
  await other.click(`a[href='/play?cadet=${town}']`);
  await other.waitForSelector("#management");
  assert.equal(
    await other.evaluate(
      async (id) =>
        (await (await fetch("/api/towns/" + id)).json()).resources.blocks,
      town,
    ),
    60,
  );
  await other.goto(origin + "/play/");
  await other.waitForSelector("#management");
  await page.goto(origin + "/");
  await page.waitForSelector(".play-cta");
  await page.screenshot({
    path: "/tmp/mars-v2-implementation/landing-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Guest routing, persistence, optional sign-in, explicit linking, independent login, battle, history, deep links, mobile layout, and Escape passed.",
  );
} finally {
  await browser?.close();
  await vite.close();
  await new Promise((r) => app.server.close(r));
  app.close();
}
