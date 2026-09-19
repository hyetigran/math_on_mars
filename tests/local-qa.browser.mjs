// Build and serve with Vite preview, then set GAME_URL and optionally CHROME_PATH.
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--host-resolver-rules=MAP production.localhost 127.0.0.1"],
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
try {
  const page = await camp({ width: 1366, height: 768 });
  await page.waitForSelector("#edit-boundaries");
  await enter(page);
  for (const correction of [false, true]) {
    await page.click("#qa-floating-button");
    await page.waitForSelector("#qa-wave-form");
    assert.equal(await page.$eval(".qa-controls", (el) => el.open), true);
    await page.select('#qa-wave-form select[name="wave"]', "1");
    await page.click('#qa-wave-form button[type="submit"]');
    await page.waitForSelector("#qa-skip-quiz", { timeout: 45000 });
    if (correction) {
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("0");
        await page.keyboard.press("Enter");
        await page.waitForFunction(
          (n) =>
            document
              .querySelector("h1")
              ?.textContent?.includes(`Question ${n + 2}`) ||
            !!document.querySelector("#correction-check"),
          {},
          i,
        );
      }
      await page.waitForSelector("#correction-check");
    }
    await page.click("#qa-skip-quiz");
    await page.waitForFunction(() => !document.querySelector("#qa-skip-quiz"));
    await page.waitForSelector("[data-reward]");
  }
  assert.deepEqual(errors, []);
  console.log(
    "Local QA: boundary editor, floating wave controls, quiz skip and correction skip work",
  );
} finally {
  await browser.close();
}
