// Opt-in browser benchmark: serve a production build and set GAME_URL.
// Uses a fresh profile, 1366×768 at 2× density, 4× CPU throttling, and no offline download.
// Performance thresholds are configurable for the benchmark host.
import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
const browser = await puppeteer.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 2 });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
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
  await page.goto(process.env.GAME_URL || "http://localhost:4173/", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector(".camp-canvas", { timeout: 120000 });
  await page.click(".camp-canvas");
  await page.keyboard.down("w");
  await page.waitForSelector(".portal-bubble:not([hidden])");
  await page.keyboard.up("w");
  await page.keyboard.press("e");
  await page.waitForSelector("#portal-mission-form");
  await page.click('#portal-mission-form button[type="submit"]');
  await page.waitForSelector("#combat-canvas canvas");
  await new Promise((r) => setTimeout(r, 1000));
  const result = await page.evaluate(async () => {
    let prev;
    const d = [],
      start = performance.now();
    await new Promise((resolve) => {
      function f(t) {
        if (prev) d.push(t - prev);
        prev = t;
        if (t - start < 6000) requestAnimationFrame(f);
        else resolve();
      }
      requestAnimationFrame(f);
    });
    d.sort((a, b) => a - b);
    return {
      fps: (d.length * 1000) / d.reduce((a, b) => a + b, 0),
      p95: d[Math.floor(d.length * 0.95)],
      slowFrames: d.filter((x) => x > 25).length,
      quality: document.querySelector("#combat-canvas canvas").getContext("2d")
        .imageSmoothingQuality,
    };
  });
  console.log(result);
  await page.screenshot({ path: process.env.SHOT || "/tmp/mars-perf.png" });
  assert.ok(
    result.fps >= Number(process.env.MIN_FPS || 55) &&
      result.p95 < Number(process.env.MAX_P95_MS || 25),
    "Combat misses the controlled 55 FPS / 25ms p95 target",
  );
} finally {
  await browser.close();
}
