// Run against the development server to inspect real scene and audio allocations.
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const page = await b.newPage();
  await page.setViewport({ width: 3840, height: 2160, deviceScaleFactor: 2 });
  await page.goto(
    new URL("tests/art.html", process.env.GAME_URL || "http://127.0.0.1:5176/")
      .href,
  );
  const result = await page.evaluate(async () => {
    const { loadCampAssets, BaseCampController } =
      await import("/src/base-camp.ts");
    await loadCampAssets(() => {});
    document.body.innerHTML =
      '<div id="qa-host" style="width:100vw;height:100vh"></div>';
    window.qaCamp = new BaseCampController(
      document.querySelector("#qa-host"),
      () => {},
    );
    const { BattleAudio, preloadGameAudio } =
      await import("/src/battle-audio.ts");
    await preloadGameAudio(() => {});
    const audio = new BattleAudio("ui");
    audio.play("blaster_fire_01", 0, 0);
    await new Promise((r) => setTimeout(r, 800));
    const original = AbortSignal.timeout;
    let timers = 0;
    AbortSignal.timeout = function (...args) {
      timers++;
      return original.apply(this, args);
    };
    for (let i = 0; i < 100; i++) audio.play("blaster_fire_01", 0, 0);
    await new Promise((r) => setTimeout(r, 20));
    AbortSignal.timeout = original;
    audio.destroy();
    const c = document.querySelector("canvas");
    return {
      canvas: [c.width, c.height],
      pixels: c.width * c.height,
      cachedAudioTimers: timers,
    };
  });
  console.log(result);
  assert.ok(result.pixels <= 1280 * 720 * 4);
  assert.equal(result.cachedAudioTimers, 0);
} finally {
  await b.close();
}
