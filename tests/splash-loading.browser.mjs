// Run against a production preview with GAME_URL and optionally CHROME_PATH.
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.setDefaultTimeout(90000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.evaluateOnNewDocument(() => {
    // Test the application's own preload cache, independently of the service worker.
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
  let failArena = true;
  const lateAssets = [];
  let inCamp = false;
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (inCamp && /\.(png|webp|mp3)(?:\?|$)/.test(request.url()))
      lateAssets.push(request.url());
    if (failArena && /mars-arena-4k/.test(request.url())) {
      failArena = false;
      void request.abort();
    } else void request.continue();
  });
  await page.goto(process.env.GAME_URL || "http://localhost:4173/", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("#retry-camp");
  assert.equal(await page.$(".camp-canvas"), null);
  await page.click("#retry-camp");
  await page.waitForSelector(".camp-canvas");
  inCamp = true;
  await page.setOfflineMode(true);
  for (let mission = 0; mission < 2; mission++) {
    await page.click(".camp-canvas");
    await page.keyboard.down("w");
    await page.waitForSelector(".portal-bubble:not([hidden])");
    await page.keyboard.up("w");
    await page.keyboard.press("e");
    await page.waitForSelector("#portal-mission-form");
    const start = Date.now();
    await page.click('#portal-mission-form button[type="submit"]');
    await page.waitForFunction(
      () =>
        /^\d+s$/.test(
          document.querySelector("#enemy-count")?.textContent ?? "",
        ),
      { timeout: 3000 },
    );
    console.log(
      `Mission ${mission + 1}: running offline ${Date.now() - start}ms after Start`,
    );
    await page.click("#pause-button");
    await page.waitForSelector("#pause-exit");
    await page.click("#pause-exit");
    await page.waitForSelector(".camp-canvas");
  }
  assert.deepEqual(
    lateAssets,
    [],
    "Camp/arena should reuse preloaded assets without new requests",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Splash retry works; two arena entries need no image or audio downloads",
  );
} finally {
  await browser.close();
}
