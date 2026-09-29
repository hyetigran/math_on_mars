import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ??
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const username = "browser-" + Date.now(),
    password = "local-browser-test-password";
  const errors = [];
  async function signIn(context, action) {
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:5185/connected-town.html");
    await page.waitForSelector("#auth");
    await page.type("[name=username]", username);
    await page.type("[name=password]", password);
    await page.click(`[value=${action}]`);
    await page.waitForSelector("#create");
    return page;
  }
  const first = await browser.createBrowserContext(),
    second = await browser.createBrowserContext();
  const page = await signIn(first, "register");
  let failRefresh = true;
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (
      failRefresh &&
      request.url().endsWith("/api/cadets") &&
      request.method() === "GET"
    ) {
      failRefresh = false;
      void request.respond({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Refresh interrupted" }),
      });
    } else void request.continue();
  });
  await page.type("#create input", "Nova");
  await page.click("#create button");
  await page.waitForFunction(
    () =>
      document.querySelector('[role="status"]')?.textContent ===
      "Refresh interrupted",
  );
  await page.type("#create input", "Nova");
  await page.click("#create button");
  await page.waitForSelector("[data-cadet]");
  assert.equal(
    await page.$$eval("[data-cadet]", (e) => e.length),
    1,
    "Retry after failed refresh must not duplicate towns",
  );
  await page.waitForSelector("iframe");
  const frame = await (await page.$("iframe")).contentFrame();
  await frame.waitForFunction(
    () =>
      document
        .querySelector("#level-note")
        ?.textContent.includes("Connected town") &&
      document
        .querySelector("#building-description")
        ?.textContent.includes("2 adults"),
  );
  assert.equal(await frame.$eval("#upgrade", (e) => e.hidden), true);
  await page.$eval("iframe", (element) =>
    element.scrollIntoView({ block: "start" }),
  );
  await frame.click("#walk");
  assert.equal(
    await frame.$eval("#walk", (e) => e.getAttribute("aria-pressed")),
    "true",
  );
  const other = await signIn(second, "login");
  await other.click("[data-cadet]");
  await other.waitForSelector("iframe");
  assert.equal(
    await page.$eval("iframe", (e) => e.src),
    await other.$eval("iframe", (e) => e.src),
  );
  await page.waitForFunction(
    () => !document.querySelector("[data-takeover]")?.disabled,
  );
  await page.click("[data-takeover]");
  await page.waitForFunction(
    () => !document.querySelector("[data-preference] button")?.disabled,
  );
  await page.evaluate(() => {
    const realFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await realFetch(...args);
      if (String(args[0]).endsWith("/preference")) {
        window.fetch = realFetch;
        throw new Error("Lost response after server commit");
      }
      return response;
    };
  });
  await page.type("[name=motto]", "Grow together");
  await page.click("[data-preference] button");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-management-status]")
      ?.textContent.includes("Lost response"),
  );
  await page.reload();
  await page.waitForSelector("[data-cadet]");
  await page.click("[data-cadet]");
  await page.waitForFunction(
    () => !document.querySelector("[data-takeover]")?.disabled,
  );
  await page.click("[data-takeover]");
  await page.waitForFunction(
    () => !document.querySelector("[data-preference] button")?.disabled,
  );
  await page.type("[name=motto]", "Grow together");
  await page.click("[data-sync]");
  await page.waitForFunction(
    () => !document.querySelector("[data-preference] button")?.disabled,
  );
  await page.click("[data-preference] button");
  await page.waitForFunction(
    () =>
      document.querySelector("[data-management-status]")?.textContent ===
      "You manage this town.",
  );
  const townPath = await page.$eval(
    "iframe",
    (e) => "/api/towns/" + new URL(e.src).searchParams.get("town"),
  );
  assert.equal(
    await page.evaluate(
      async (path) => (await (await fetch(path)).json()).revision,
      townPath,
    ),
    1,
  );
  const oldLease = await page.evaluate(
    async (path) => (await fetch(path + "/management")).json(),
    townPath,
  );
  await other.click("[data-sync]");
  await other.waitForFunction(
    () => !document.querySelector("[data-takeover]")?.disabled,
  );
  await other.click("[data-takeover]");
  await other.waitForFunction(
    () => !document.querySelector("[data-preference] button")?.disabled,
  );
  assert.match(
    await other.$eval("[data-motto]", (e) => e.textContent),
    /Grow together/,
  );
  assert.equal(
    await page.evaluate(
      async ({ path, lease }) =>
        (
          await fetch(path + "/preference", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...lease,
              requestId: crypto.randomUUID(),
              motto: "Stale write",
            }),
          })
        ).status,
      { path: townPath, lease: oldLease },
    ),
    409,
  );
  await page.waitForFunction(
    () => document.querySelector("[data-preference] button")?.disabled,
  );
  await other.setOfflineMode(true);
  await other.waitForFunction(
    () => document.querySelector("[data-preference] button")?.disabled,
  );
  await other.setOfflineMode(false);
  await other.waitForFunction(
    () => !document.querySelector("[data-preference] button")?.disabled,
  );
  await other.click('[data-plot="garden"] [data-mutation]');
  await other.waitForFunction(() =>
    document
      .querySelector('[data-plot="garden"]')
      ?.textContent.includes("Cancel and refund"),
  );
  let townFrame = await (await other.$("iframe")).contentFrame();
  await other.$eval("iframe", (e) => e.scrollIntoView({ block: "start" }));
  await townFrame.click('[data-building="1"]');
  await townFrame.waitForFunction(() =>
    document
      .querySelector("#level-note")
      ?.textContent.includes("seconds remaining"),
  );
  await other.$eval("iframe", (e) => e.scrollIntoView({ block: "start" }));
  await townFrame.click("#walk");
  await townFrame.waitForFunction(() =>
    document
      .querySelector("#level-note")
      ?.textContent.includes("Saved level 1"),
  );
  await other.waitForFunction(() =>
    document
      .querySelector('[data-plot="garden"]')
      ?.textContent.includes("Open Greenhouse"),
  );
  await other.click('[data-plot="market"] [data-mutation]');
  await other.waitForFunction(() =>
    document
      .querySelector('[data-plot="market"]')
      ?.textContent.includes("Cancel and refund"),
  );
  await other.click('[data-plot="market"] [data-mutation]');
  await other.waitForFunction(() =>
    document
      .querySelector('[data-plot="market"]')
      ?.textContent.includes("Build Greenhouse"),
  );
  assert.equal(
    await other.evaluate(
      async (path) => (await (await fetch(path)).json()).resources.blocks,
      townPath,
    ),
    60,
  );
  await other.reload();
  await other.waitForSelector("[data-cadet]");
  assert.equal(await other.$$eval("[data-cadet]", (e) => e.length), 1);
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Two-session town ownership, snapshot cameras, reload and narrow layout passed.",
  );
} finally {
  await browser.close();
}
