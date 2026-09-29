import puppeteer from "puppeteer-core";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const bank = JSON.parse(
  await readFile("content/questions/im-lower.json", "utf8"),
);
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ??
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 1280, height: 1000 });
  await page.goto(
    process.env.REHEARSAL_URL ?? "http://127.0.0.1:5184/town-rehearsal.html",
  );
  await page.click('[data-start="greenhouse"]');
  await page.click('[data-advance="10"]');
  await page.click("#seed");
  await page.click("#worker");
  await page.click('[data-start="house"]');
  await page.click("#practice");
  for (let i = 0; i < 5; i++) {
    const prompt = await page.$eval(".question", (e) => e.textContent);
    const q = bank.find((q) => q.prompt === prompt);
    assert.ok(q);
    await page.type("#response", `${q.answer[0]}/${q.answer[1]}`);
    await page.click("#answer button");
  }
  assert.match(await page.$eval(".success", (e) => e.textContent), /complete/);
  await page.click('[data-credit="house"]');
  assert.match(await page.$eval("li", (e) => e.textContent), /40m 0s/);
  await page.click('[data-advance="3600"]');
  assert.match(await page.$eval(".stats", (e) => e.textContent), /30/);
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: "/tmp/v2-rehearsal-phone.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Browser loop, practice reward, upgrade acceleration and narrow layout passed.",
  );
} finally {
  await browser.close();
}
