// Build and serve with Vite preview, then set GAME_URL and optionally CHROME_PATH.
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const url = process.env.GAME_URL || "http://localhost:4173/";
const errors = [];
async function camp(viewport) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument(() => {
    navigator.serviceWorker.register = () => new Promise(() => {});
    localStorage.setItem(
      "math-on-mars-camp-boundaries-v1",
      JSON.stringify({
        version: 1,
        outline: [
          { x: 0, y: 0 },
          { x: 1536, y: 0 },
          { x: 1536, y: 1024 },
          { x: 0, y: 1024 },
        ],
        blocked: [],
      }),
    );
  });
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForSelector(".camp-canvas");
  return page;
}
async function enter(page) {
  await page.click(".camp-canvas");
  await page.keyboard.down("w");
  await page.waitForSelector(".portal-bubble:not([hidden])");
  await page.keyboard.up("w");
  await page.keyboard.press("e");
  await page.waitForSelector("#portal-mission-form");
  await page.click('#portal-mission-form button[type="submit"]');
  await page.waitForSelector("#combat-canvas canvas");
  await page.waitForFunction(() =>
    /^\d+s$/.test(document.querySelector("#enemy-count")?.textContent ?? ""),
  );
}
async function visible(page, selector) {
  return page.$eval(selector, (el) => getComputedStyle(el).display !== "none");
}
async function noQA(page) {
  assert.equal(
    await page.$(
      "#qa-skip-quiz, #qa-wave-form, .qa-controls, #edit-boundaries, #edit-arena-bounds",
    ),
    null,
  );
}
try {
  const desktop = await camp({ width: 1366, height: 768 });
  assert.equal(await visible(desktop, ".camp-joystick"), false);
  await desktop.setViewport({ width: 800, height: 600 });
  await desktop.waitForFunction(
    () => document.documentElement.dataset.touchControls === "true",
  );
  assert.equal(await visible(desktop, ".camp-joystick"), true);
  assert.equal(await desktop.$eval("#rotate-device", (el) => el.open), false);
  await desktop.setViewport({ width: 1366, height: 768 });
  await enter(desktop);
  assert.equal(await visible(desktop, ".touch-controls"), false);
  await desktop.click("#pause-button");
  await desktop.waitForSelector("#resume-button");
  await noQA(desktop);
  await desktop.click("#resume-button");
  await desktop.waitForSelector('[data-key="check"]', { timeout: 45000 });
  await noQA(desktop);
  for (let i = 0; i < 5; i++) {
    await desktop.keyboard.press("0");
    await desktop.keyboard.press("Enter");
    await desktop.waitForFunction(
      (n) =>
        document
          .querySelector("h1")
          ?.textContent?.includes(`Question ${n + 2}`) ||
        !!document.querySelector("#correction-check"),
      {},
      i,
    );
  }
  await desktop.waitForSelector("#correction-check");
  await noQA(desktop);
  console.log(
    "Desktop and narrow-screen controls; production quiz, correction and pause contain no QA tools",
  );
  await desktop.browserContext().close();
  const phone = await camp({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
  });
  assert.equal(await phone.$eval("#rotate-device", (el) => el.open), true);
  await phone.keyboard.press("Escape");
  assert.equal(await phone.$eval("#rotate-device", (el) => el.open), true);
  await phone.setViewport({
    width: 844,
    height: 390,
    isMobile: true,
    hasTouch: true,
  });
  await phone.waitForFunction(
    () => !document.querySelector("#rotate-device").open,
  );
  assert.equal(await visible(phone, ".camp-joystick"), true);
  await enter(phone);
  assert.equal(await visible(phone, ".touch-controls"), true);
  await phone.setViewport({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
  });
  await phone.waitForFunction(
    () => document.querySelector("#rotate-device").open,
  );
  await phone.waitForSelector("#resume-button");
  const before = await phone.$eval("#enemy-count", (el) => el.textContent);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  assert.equal(
    await phone.$eval("#enemy-count", (el) => el.textContent),
    before,
  );
  await phone.setViewport({
    width: 1180,
    height: 820,
    isMobile: true,
    hasTouch: true,
  });
  await phone.waitForFunction(
    () => !document.querySelector("#rotate-device").open,
  );
  assert.equal(await visible(phone, ".touch-controls"), true);
  await phone.click("#resume-button");
  await phone.waitForFunction(() => !document.querySelector("#app").inert);
  await noQA(phone);
  assert.deepEqual(errors, []);
  console.log(
    "Mobile portrait is blocked, rotation pauses combat, landscape and tablet touch controls work",
  );
} finally {
  await browser.close();
}
