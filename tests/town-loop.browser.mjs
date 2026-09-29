import { practiceBank, practiceTopics } from "../server/town-practice.mjs";
import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
import { createServer as createViteServer } from "vite";
import { createTownServer } from "../server/town-server.mjs";
let clock = 0;
const origin = "http://127.0.0.1:5187";
const app = createTownServer({ origin, now: () => clock });
await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
const vite = await createViteServer({
  configFile: false,
  server: {
    host: "127.0.0.1",
    port: 5187,
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
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin + "/connected-town.html");
  await page.waitForFunction(
    () => document.querySelector("#auth button")?.disabled === false,
  );
  await page.type("[name=username]", "upgrade-parent");
  await page.type("[name=password]", "long-test-password");
  await page.click("[value=register]");
  await page.waitForSelector("#create");
  await page.type("#create input", "Nova");
  await page.click("#create button");
  await page.waitForFunction(
    () => document.querySelector("[data-takeover]")?.disabled === false,
  );
  await page.click("[data-takeover]");
  await page.waitForFunction(
    () =>
      document.querySelector("[data-plot=garden] [data-mutation]")?.disabled ===
      false,
  );
  await page.click("[data-plot=garden] [data-mutation]");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-plot=garden]")
      ?.textContent.includes("Cancel and refund"),
  );
  const path = await page.$eval(
    "iframe",
    (e) => "/api/towns/" + new URL(e.src).searchParams.get("town"),
  );
  clock = 10000;
  await page.waitForSelector("[data-farm=garden]");
  await page.click("[data-unlock-seed]");
  await page.waitForFunction(
    () => !document.querySelector("[data-unlock-seed]"),
  );
  await page.click("[data-farm=garden] button");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-farm=garden]")
      ?.textContent.includes("Remove adult-1"),
  );
  await page.click("[data-farm=garden] button:last-child");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-farm=garden]")
      ?.textContent.includes("Growing."),
  );
  clock = 1810000;
  let state = await page.evaluate(
    async (path) => (await fetch(path)).json(),
    path,
  );
  assert.equal(state.foodTotals.harvested, 4);
  assert.equal(state.resources.food, 28);
  await page.click("[data-upgrade-house]");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-plot=home]")
      ?.textContent.includes("Cancel and refund"),
  );
  await page.reload();
  await page.waitForSelector("[data-cadet]");
  await page.click("[data-cadet]");
  await page.waitForFunction(
    () => document.querySelector("[data-takeover]")?.disabled === false,
  );
  await page.click("[data-takeover]");
  await page.waitForFunction(
    () =>
      document.querySelector("[data-eligibility] button")?.disabled === false,
  );
  await page.click("[data-practice] summary");
  await page.select("[name=topics]", practiceTopics[0].id);
  await page.type("[data-eligibility] [name=password]", "long-test-password");
  await page.click("[data-eligibility] button");
  await page.waitForSelector("[data-begin-practice]");
  assert.match(
    await page.$eval("[data-begin-practice]", (e) => e.textContent),
    new RegExp(`${practiceTopics[0].reward / 60000} minutes credit`),
  );
  assert.equal(
    await page.evaluate(() =>
      JSON.stringify(sessionStorage).includes("long-test-password"),
    ),
    false,
  );
  await page.click("[data-begin-practice]");
  await page.waitForSelector("[data-answer-practice]");
  await page.type("[name=answer]", "999999");
  await page.click("[data-answer-practice] button");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-practice]")
      ?.textContent.includes("Try again."),
  );
  await page.reload();
  await page.waitForSelector("[data-cadet]");
  await page.click("[data-cadet]");
  await page.waitForFunction(
    () => document.querySelector("[data-takeover]")?.disabled === false,
  );
  await page.click("[data-takeover]");
  for (let i = 0; i < Math.min(5, practiceTopics[0].count); i++) {
    await page.waitForFunction(
      () =>
        document.querySelector("[data-answer-practice] button")?.disabled ===
        false,
    );
    const id = await page.$eval(
      "[data-question-id]",
      (e) => e.dataset.questionId,
    );
    const q = practiceBank.find((q) => q.id === id);
    await page.type("[name=answer]", q.answer.join("/"));
    await page.click("[data-answer-practice] button");
    await page.waitForFunction(
      (id) =>
        document.querySelector("[data-question-id]")?.dataset.questionId !== id,
      {},
      id,
    );
  }
  state = await page.evaluate(async (path) => (await fetch(path)).json(), path);
  assert.equal(state.constructionCredit, practiceTopics[0].reward);
  assert.equal(
    Object.values(state.practice.attempt.firstAttempts).filter(Boolean).length,
    state.practice.attempt.questionIds.length - 1,
  );
  await page.waitForSelector("[data-plot=home] [data-spend-credit]");
  assert.match(
    await page.$eval("[data-plot=home]", (e) => e.textContent),
    new RegExp(
      `Apply ${practiceTopics[0].reward / 1000} seconds; ${(3600000 - practiceTopics[0].reward) / 1000} seconds remain`,
    ),
  );
  await page.evaluate(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      const response = await original(...args);
      if (
        args[1]?.body &&
        JSON.parse(args[1].body).command?.action === "spend-credit"
      ) {
        window.fetch = original;
        throw Error("Credit response lost");
      }
      return response;
    };
  });
  await page.click("[data-spend-credit]");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-management-status]")
      ?.textContent.includes("Credit response lost"),
  );
  await page.reload();
  await page.waitForSelector("[data-cadet]");
  await page.click("[data-cadet]");
  await page.waitForSelector("[data-farm=garden]");
  state = await page.evaluate(async (path) => (await fetch(path)).json(), path);
  assert.equal(state.constructionCredit, 0);
  assert.equal(state.houseLevel, 1);
  assert.equal(
    state.jobs.find((j) => j.building === "house").endsAt,
    5410000 - practiceTopics[0].reward,
  );
  await page.waitForFunction(() =>
    document
      .querySelector("[data-return-summary]")
      ?.textContent.includes("Since your last town visit"),
  );
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().endsWith("/visit") && r.request().postData()?.includes("leave"),
    ),
    page.click("#close-town"),
  ]);
  clock += 72 * 3600000;
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector("#auth button")?.disabled === false,
  );
  await page.type("[name=username]", "upgrade-parent");
  await page.type("[name=password]", "long-test-password");
  await page.click("[value=login]");
  await page.waitForSelector("[data-cadet]");
  state = await page.evaluate(async (path) => (await fetch(path)).json(), path);
  assert.equal(state.foodTotals.meals + state.foodTotals.emergencyMeals, 96);
  const beforeReturn = JSON.stringify(state.foodTotals);
  await page.click("[data-cadet]");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-return-summary]")
      ?.textContent.includes("paused after 48 hours"),
  );
  assert.match(
    await page.$eval("[data-return-summary]", (e) => e.textContent),
    /1 projects finished/,
  );
  let frame = await (await page.$("iframe")).contentFrame();
  await frame.waitForFunction(() =>
    document
      .querySelector("#level-note")
      ?.textContent.includes("Saved level 2"),
  );
  await page.$eval("iframe", (e) => e.scrollIntoView({ block: "start" }));
  await frame.click("#walk");
  assert.match(
    await frame.$eval("#building-description", (e) => e.textContent),
    /2 adults · 4 housing capacity/,
  );
  const second = await browser.createBrowserContext(),
    other = await second.newPage();
  await other.goto(origin + "/connected-town.html");
  await other.waitForFunction(
    () => document.querySelector("#auth button")?.disabled === false,
  );
  await other.type("[name=username]", "upgrade-parent");
  await other.type("[name=password]", "long-test-password");
  await other.click("[value=login]");
  await other.waitForSelector("[data-cadet]");
  await other.click("[data-cadet]");
  await other.waitForSelector("[data-farm=garden]");
  state = await other.evaluate(
    async (path) => (await fetch(path)).json(),
    path,
  );
  assert.equal(JSON.stringify(state.foodTotals), beforeReturn);
  assert.equal(state.adults, 2);
  assert.ok(state.resources.food <= 72);
  await other.setViewport({ width: 390, height: 844 });
  assert.equal(
    await other.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Full construct, staff, harvest, upgrade, practice, accelerate and 72-hour return loop passed in two Chrome sessions.",
  );
} finally {
  await browser?.close();
  await vite.close();
  await new Promise((r) => app.server.close(r));
  app.close();
}
