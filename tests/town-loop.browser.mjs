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
    () => document.querySelector("[data-upgrade-house]")?.disabled === false,
  );
  await page.click("[data-upgrade-house]");
  await page.waitForFunction(() =>
    document
      .querySelector("[data-plot=home]")
      ?.textContent.includes("Cancel and refund"),
  );
  const path = await page.$eval(
    "iframe",
    (e) => "/api/towns/" + new URL(e.src).searchParams.get("town"),
  );
  await page.reload();
  await page.waitForSelector("[data-cadet]");
  await page.click("[data-cadet]");
  await page.waitForSelector("iframe");
  let frame = await (await page.$("iframe")).contentFrame();
  await frame.waitForFunction(() =>
    document
      .querySelector("#level-note")
      ?.textContent.includes("Upgrading House"),
  );
  clock = 3599999;
  let state = await page.evaluate(
    async (path) => (await fetch(path)).json(),
    path,
  );
  assert.equal(state.houseLevel, 1);
  assert.equal(state.houseCapacity, 2);
  assert.equal(state.adults, 2);
  clock = 3600000;
  await frame.waitForFunction(() =>
    document
      .querySelector("#level-note")
      ?.textContent.includes("Saved level 2"),
  );
  assert.equal(await frame.evaluate(() => window.townPrototype.houseLevel), 2);
  await page.$eval("iframe", (e) => e.scrollIntoView({ block: "start" }));
  await frame.click("#walk");
  assert.equal(await frame.evaluate(() => window.townPrototype.mode), "walk");
  assert.match(
    await frame.$eval("#building-description", (e) => e.textContent),
    /2 adults · 4 housing capacity/,
  );
  state = await page.evaluate(async (path) => (await fetch(path)).json(), path);
  assert.equal(state.housePowerDemand, 1);
  assert.equal(state.resources.blocks, 40);
  assert.equal(state.jobs.filter((j) => j.status === "completed").length, 1);
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
  assert.deepEqual(errors, []);
  console.log(
    "House upgrade and corrected town practice survive reload and complete with authoritative state.",
  );
} finally {
  await browser?.close();
  await vite.close();
  await new Promise((r) => app.server.close(r));
  app.close();
}
