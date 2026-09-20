// Run against Vite dev: exercise the real scene with controlled display timings.
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
  await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 2 });
  await page.goto(
    new URL("tests/art.html", process.env.GAME_URL || "http://127.0.0.1:5176/")
      .href,
  );
  await page.evaluate(async () => {
    const { loadGameAssets } = await import("/src/game-assets.ts");
    await loadGameAssets(() => {});
    const { CombatController } = await import("/src/combat.ts");
    document.body.innerHTML =
      '<div id="host" style="width:100vw;height:100vh"></div>';
    window.controller = new CombatController({
      parent: document.querySelector("#host"),
      wave: 1,
      totalWaves: 10,
      difficulty: "standard",
      hp: 100,
      maxHp: 100,
      salvage: 0,
      medkits: 0,
      ammo: [],
      activeAmmoIds: [],
      modules: [],
      seed: 42,
      onHud() {},
      onComplete() {},
      onDefeat() {},
    });
  });
  await page.waitForFunction(() => window.controller.scene?.marine);
  const results = await page.evaluate(() => {
    const scene = window.controller.scene;
    const sim = scene.simulation;
    window.controller.pause();
    const results = [];
    let now = 0;
    for (const hz of [30, 60, 90, 120, 144, 165, "60 jitter"]) {
      sim.state.enemies = [];
      sim.state.marine.x = 1280;
      sim.state.marine.y = 720;
      sim.state.spawnCooldownMs = sim.state.shotCooldownMs = 1e9;
      sim.state.stepRemainderMs = 0;
      scene.setTouchVector(0, 0);
      scene.update((now += 1000 / 60), 1000 / 60);
      scene.setTouchVector(1, 0);
      const delta = (i) =>
        hz === "60 jitter" ? 1000 / 60 + (i % 2 ? 0.1 : -0.1) : 1000 / hz;
      for (let i = 0; i < 8; i++) scene.update((now += delta(i)), delta(i));
      const steps = [];
      let previous = scene.marine.x;
      for (let i = 0; i < 60; i++) {
        const dt = delta(i);
        scene.update((now += dt), dt);
        steps.push({
          actual: scene.marine.x - previous,
          expected: (sim.moveSpeed * dt) / 1000,
        });
        previous = scene.marine.x;
      }
      results.push({
        hz,
        repeatedFrames: steps.filter((s) => Math.abs(s.actual) < 1e-8).length,
        maxMovementError: Math.max(
          ...steps.map((s) => Math.abs(s.actual - s.expected)),
        ),
      });
    }
    const before = JSON.stringify(sim.serialize());
    const x = scene.marine.x;
    for (let i = 0; i < 50; i++) scene.renderState();
    results.push({
      paused: scene.marine.x === x,
      saveUnchanged: JSON.stringify(sim.serialize()) === before,
    });
    return results;
  });
  console.log(results);
  for (const result of results.slice(0, -1)) {
    assert.equal(
      result.repeatedFrames,
      0,
      `${result.hz} Hz repeats movement frames`,
    );
    assert.ok(
      result.maxMovementError < 1e-6,
      `${result.hz} Hz movement jumps between simulation steps`,
    );
  }
  assert.deepEqual(results.at(-1), { paused: true, saveUnchanged: true });
} finally {
  await browser.close();
}
