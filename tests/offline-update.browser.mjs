// A two-release server exercises real service-worker upgrades with an open tab.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import puppeteer from "puppeteer-core";

const template = await readFile("scripts/service-worker.js", "utf8");
let release = 1;
const server = createServer((request, response) => {
  const files = {
    "index.html": `<h1>Release ${release}</h1>`,
    [`assets/art-release${release}.txt`]: `art ${release}`,
  };
  const manifest = {
    version: String(release).repeat(16),
    files: Object.entries(files).map(([path, body]) => ({
      path,
      sha256: createHash("sha256").update(body).digest("hex"),
    })),
  };
  const path = request.url.slice(1) || "index.html";
  response.setHeader("Cache-Control", "no-store");
  response.setHeader(
    "Content-Type",
    path === "sw.js" ? "application/javascript" : "text/html",
  );
  if (path === "sw.js")
    response.end(
      template.replace("/* BUILD_MANIFEST */ null", JSON.stringify(manifest)),
    );
  else if (files[path]) response.end(files[path]);
  else {
    response.statusCode = 404;
    response.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--host-resolver-rules=MAP production.localhost 127.0.0.1"],
});
try {
  const page = await browser.newPage();
  await page.goto(`http://production.localhost:${server.address().port}/`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  release = 2;
  await page.evaluate(async () => {
    const changed = new Promise((resolve) =>
      navigator.serviceWorker.addEventListener("controllerchange", resolve, {
        once: true,
      }),
    );
    await (await navigator.serviceWorker.getRegistration()).update();
    await changed;
  });
  assert.equal(await page.$eval("h1", (el) => el.textContent), "Release 1");
  await page.setOfflineMode(true);
  assert.equal(
    await page.evaluate(() =>
      fetch("/assets/art-release1.txt").then((r) => r.text()),
    ),
    "art 1",
  );
  await page.setOfflineMode(false);
  await page.reload();
  assert.equal(await page.$eval("h1", (el) => el.textContent), "Release 2");
  await page.setOfflineMode(true);
  await page.reload();
  assert.equal(await page.$eval("h1", (el) => el.textContent), "Release 2");
  console.log(
    "Open-tab update activates; old assets survive; reload shows latest release online and offline",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
