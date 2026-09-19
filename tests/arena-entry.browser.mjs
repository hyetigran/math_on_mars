// Run against a production build: GAME_URL=http://localhost:4173/?verifyOffline=1
// CHROME_PATH selects a local Chrome executable.
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  for (const failure of ["pending", "rejected"]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.evaluateOnNewDocument((failure) => {
      // Remove scenery from this navigation fixture; use the real portal flow.
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
      navigator.serviceWorker.register = () =>
        failure === "pending"
          ? new Promise(() => {})
          : Promise.reject(new Error("Offline storage unavailable"));
    }, failure);
    await page.goto(
      process.env.GAME_URL || "http://localhost:4173/?verifyOffline=1",
      { waitUntil: "networkidle0" },
    );
    await page.waitForSelector(".camp-canvas");
    assert.equal(await page.$("#edit-boundaries"), null);
    await page.click(".camp-canvas");
    await page.keyboard.down("w");
    await page.waitForSelector(".portal-bubble:not([hidden])");
    await page.keyboard.up("w");
    await page.keyboard.press("e");
    await page.waitForSelector("#portal-mission-form");
    const started = Date.now();
    await page.click('#portal-mission-form button[type="submit"]');
    await page.waitForSelector("#combat-canvas canvas", { timeout: 5000 });
    assert.equal(await page.$eval("#app", (app) => app.inert), false);
    assert.equal(await page.$("#edit-boundaries"), null);
    await page.click("#pause-button");
    await page.waitForSelector("#resume-button");
    assert.equal(await page.$("#edit-arena-bounds"), null);
    await page.click("#resume-button");
    await page.waitForFunction(() => !document.querySelector("#app").inert);
    assert.deepEqual(errors, []);
    console.log(
      `${failure} offline installation: arena entered and pause/resume worked in ${Date.now() - started}ms`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
