// Run against Vite with GAME_URL, optionally overriding CHROME_PATH.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const bank = ["im-lower", "im-upper"].flatMap((name) =>
  JSON.parse(
    readFileSync(
      new URL(`../content/questions/${name}.json`, import.meta.url),
      "utf8",
    ),
  ),
);
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const url = process.env.GAME_URL || "http://127.0.0.1:4179/";
const errors = [];
try {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluateOnNewDocument(() => {
    navigator.serviceWorker.register = () => new Promise(() => {});
  });
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForSelector("#camp-settings");
  await page.click("#camp-settings");
  assert.equal(
    await page.$eval("#settings-tab", (el) => el.getAttribute("aria-selected")),
    "true",
  );
  assert.equal(
    await page.$eval("#seconds-per-question", (el) => el.value),
    "8",
  );
  assert.equal(await page.$eval("#questions-per-wave", (el) => el.value), "5");
  await page.focus("#settings-tab");
  await page.keyboard.press("ArrowLeft");
  assert.equal(
    await page.$eval("#track-tab", (el) => el.getAttribute("aria-selected")),
    "true",
  );
  await page.keyboard.press("ArrowRight");
  await page.$eval("#seconds-per-question", (el) => {
    el.value = "0";
  });
  await page.click('#quiz-settings-form button[type="submit"]');
  assert.equal(
    await page.$eval("#seconds-per-question", (el) => el.validity.valid),
    false,
  );
  await page.$eval("#seconds-per-question", (el) => {
    el.value = "2";
  });
  await page.$eval("#questions-per-wave", (el) => {
    el.value = "3";
  });
  await page.click('#quiz-settings-form button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector("#track-dialog"));
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#camp-settings");
  await page.click("#camp-settings");
  assert.equal(
    await page.$eval("#seconds-per-question", (el) => el.value),
    "2",
  );
  assert.equal(await page.$eval("#questions-per-wave", (el) => el.value), "3");
  await page.screenshot({ path: "/tmp/mathonmars-settings-desktop.png" });
  await page.setViewport({
    width: 390,
    height: 844,
  });
  assert.equal(
    await page.$eval("#track-dialog", (el) => el.scrollWidth <= el.clientWidth),
    true,
  );
  await page.screenshot({ path: "/tmp/mathonmars-settings-mobile.png" });
  await page.setViewport({ width: 1280, height: 800 });
  await page.click("#track-tab");
  await page.click('#portal-mission-form button[type="submit"]');
  await page.waitForSelector("#combat-canvas canvas");
  await page.click("#qa-floating-button");
  await page.waitForSelector("#qa-wave-form");
  await page.select('#qa-wave-form select[name="wave"]', "1");
  await page.select('#qa-wave-form select[name="section"]', "quiz");
  await page.select(
    '#qa-wave-form select[name="trinket-0"]',
    "Integrity Shield",
  );
  await page.select('#qa-wave-form select[name="trinket-quality-0"]', "purple");
  await page.$eval('#qa-wave-form input[name="salvage"]', (el) => {
    el.value = "123";
  });
  await page.click('#qa-wave-form button[type="submit"]');
  await page.waitForSelector("#countdown", { timeout: 120000 });
  assert.match(
    await page.$eval("h1", (el) => el.textContent),
    /Question 1.*of 3/,
  );
  await page.waitForFunction(
    () => Number(document.querySelector("#countdown b")?.textContent) < 5,
  );
  const beforeAnswer = Number(
    await page.$eval("#countdown b", (el) => el.textContent),
  );
  await page.keyboard.type("999");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() =>
    document.querySelector("h1")?.textContent.includes("Question 2"),
  );
  assert.ok(
    Number(await page.$eval("#countdown b", (el) => el.textContent)) <=
      beforeAnswer,
  );
  await page.keyboard.press("Escape");
  await page.waitForSelector("#resume-button");
  const qaBalance = await page.$eval(
    '#qa-wave-form input[name="salvage"]',
    (el) => el.value,
  );
  assert.equal(qaBalance, "123");
  assert.ok(
    (await page.$eval(".qa-controls", (el) => el.textContent)).includes(
      "Currently installed: 1",
    ),
  );
  const pausedTimer = await page.$eval("#countdown b", (el) => el.textContent);
  await new Promise((resolve) => setTimeout(resolve, 2100));
  assert.equal(
    await page.$eval("#countdown b", (el) => el.textContent),
    pausedTimer,
  );
  await page.click("#resume-button");
  await page.waitForFunction(
    () => document.querySelector("#countdown b")?.textContent === "00.0",
  );
  for (const index of [2, 3]) {
    await page.keyboard.type("999");
    await page.keyboard.press("Enter");
    if (index === 2)
      await page.waitForFunction(() =>
        document.querySelector("h1")?.textContent.includes("Question 3"),
      );
    else await page.waitForSelector("#correction-check");
  }
  await page.keyboard.press("Escape");
  await page.waitForSelector("#pause-exit");
  await page.click("#pause-exit");
  await page.waitForSelector("#camp-settings");
  await page.click("#camp-settings");
  await page.select("#answer-type", "multiple-choice");
  await page.click('#quiz-settings-form button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector("#track-dialog"));
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#camp-settings");
  await page.click("#camp-settings");
  assert.equal(
    await page.$eval("#answer-type", (el) => el.value),
    "multiple-choice",
  );
  await page.click("#track-tab");
  await page.click('#portal-mission-form button[type="submit"]');
  await page.waitForSelector("#combat-canvas canvas");
  await page.click("#qa-floating-button");
  await page.waitForSelector("#qa-wave-form");
  await page.select('#qa-wave-form select[name="wave"]', "1");
  await page.select('#qa-wave-form select[name="section"]', "quiz");
  await page.select(
    '#qa-wave-form select[name="trinket-0"]',
    "Integrity Shield",
  );
  await page.select('#qa-wave-form select[name="trinket-quality-0"]', "purple");
  await page.$eval('#qa-wave-form input[name="salvage"]', (el) => {
    el.value = "123";
  });
  await page.click('#qa-wave-form button[type="submit"]');
  await page.waitForSelector("[data-answer-choice]", { timeout: 120000 });
  assert.equal((await page.$$("[data-answer-choice]")).length, 4);
  assert.equal(await page.$(".keypad"), null);
  await page.screenshot({
    path: "/tmp/mathonmars-multiple-choice-desktop.png",
  });
  const choiceSelector = async (correct) => {
    const itemId = await page.$eval(
      "[data-source-item]",
      (el) => el.dataset.sourceItem,
    );
    const item = bank.find((q) => q.id === itemId);
    assert.ok(item);
    const answer = item.answer[0] / item.answer[1];
    const values = await page.$$eval("[data-answer-choice]", (buttons) =>
      buttons.map((button) => button.dataset.answerChoice),
    );
    const choice = values.find(
      (value) => (Number(value) === answer) === correct,
    );
    assert.ok(choice);
    return `[data-answer-choice="${choice}"]`;
  };
  for (let index = 0; index < 3; index++) {
    await page.click(await choiceSelector(index !== 0));
    if (index < 2)
      await page.waitForFunction(
        (n) =>
          document.querySelector("h1")?.textContent.includes(`Question ${n}`),
        {},
        index + 2,
      );
    else await page.waitForSelector(".correction-screen");
  }
  assert.equal((await page.$$("[data-answer-choice]")).length, 4);
  assert.equal(await page.$(".correction-keypad"), null);
  await page.focus(await choiceSelector(true));
  await page.keyboard.press("Enter");
  await page.waitForSelector("[data-reward]");
  assert.deepEqual(errors, []);
  console.log(
    "Settings: validation, keyboard tabs, save/reload, mobile layout, custom question count, shared timer continuity, expiry, pause, multiple choice and both correction flows passed.",
  );
} catch (error) {
  for (const openPage of await browser.pages())
    console.error(
      (await openPage.$eval("body", (el) => el.innerText)).slice(-2500),
    );
  console.error(errors);
  throw error;
} finally {
  await browser.close();
}
