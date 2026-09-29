import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ??
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const username = "browser-" + Date.now(),
    password = "local-browser-test-password";
  const errors = [];
  async function signIn(context, action) {
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:5185/connected-town.html");
    await page.waitForSelector("#auth");
    await page.type("[name=username]", username);
    await page.type("[name=password]", password);
    await page.click(`[value=${action}]`);
    await page.waitForSelector("#create");
    return page;
  }
  const first = await browser.createBrowserContext(),
    second = await browser.createBrowserContext();
  const page = await signIn(first, "register");
  await page.type("#create input", "Nova");
  await page.click("#create button");
  await page.waitForSelector("iframe");
  const frame = await (await page.$("iframe")).contentFrame();
  await frame.waitForFunction(
    () =>
      document
        .querySelector("#level-note")
        ?.textContent.includes("Connected town") &&
      document
        .querySelector("#building-description")
        ?.textContent.includes("2 adults"),
  );
  assert.equal(await frame.$eval("#upgrade", (e) => e.hidden), true);
  await frame.click("#walk");
  assert.equal(
    await frame.$eval("#walk", (e) => e.getAttribute("aria-pressed")),
    "true",
  );
  const other = await signIn(second, "login");
  await other.click("[data-cadet]");
  await other.waitForSelector("iframe");
  assert.equal(
    await page.$eval("iframe", (e) => e.src),
    await other.$eval("iframe", (e) => e.src),
  );
  await other.reload();
  await other.waitForSelector("[data-cadet]");
  assert.equal(await other.$$eval("[data-cadet]", (e) => e.length), 1);
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Two-session town ownership, snapshot cameras, reload and narrow layout passed.",
  );
} finally {
  await browser.close();
}
