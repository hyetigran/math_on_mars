// Serve the actual built files under a repository path, without SPA fallback rewrites.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
import { createTownServer } from "../server/town-server.mjs";
const origin = "http://127.0.0.1:5189",
  prefix = "/math_on_mars",
  directory = resolve("dist");
const app = createTownServer({ origin });
const server = createServer(async (req, res) => {
  if (req.url.startsWith("/api/")) {
    app.server.emit("request", req, res);
    return;
  }
  const url = new URL(req.url, origin);
  let file = resolve(directory, "." + url.pathname.slice(prefix.length));
  if (
    !url.pathname.startsWith(prefix + "/") ||
    (!file.startsWith(directory + "/") && file !== directory)
  ) {
    res.writeHead(404).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        res.writeHead(302, { location: url.pathname + "/" + url.search }).end();
        return;
      }
      file = resolve(file, "index.html");
    }
    const mime =
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".woff2": "font/woff2",
        ".png": "image/png",
        ".webp": "image/webp",
        ".mp3": "audio/mpeg",
        ".ogg": "audio/ogg",
      }[extname(file)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
let browser;
try {
  await new Promise((r) => server.listen(5189, "127.0.0.1", r));
  browser = await puppeteer.launch({
    executablePath:
      process.env.CHROME_PATH ??
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const page = await browser.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin + prefix + "/");
  await page.waitForSelector(".play-cta");
  assert.equal(
    await page.$eval(".play-cta", (e) => new URL(e.href).pathname),
    prefix + "/play",
  );
  await page.click(".play-cta");
  await page.waitForSelector("#management");
  assert.equal(new URL(page.url()).pathname, prefix + "/play");
  await page.reload();
  await page.waitForSelector("#management");
  assert.equal(new URL(page.url()).pathname, prefix + "/play/");
  const town = await (await page.$(".town-view iframe")).contentFrame();
  await town.waitForSelector("canvas");
  await page.goto(origin + prefix + "/parents/");
  await page.waitForSelector(".parent-page [data-parent]");
  await page.goto(origin + prefix + "/play/battle/");
  await page.waitForSelector(".battle-view iframe");
  const battle = await (await page.$(".battle-view iframe")).contentFrame();
  await battle.waitForSelector("#track-dialog", { timeout: 60000 });
  await page.click(".battle-header a");
  await page.waitForSelector("#management");
  await page.goto(origin + prefix + "/connected-town.html");
  await page.waitForSelector(".play-cta");
  assert.equal(new URL(page.url()).pathname, prefix + "/");
  assert.deepEqual(errors, []);
  console.log(
    "Built repository-subpath landing, Play/reload, parents, 3D scene, battle, return and legacy redirect passed.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
  app.close();
}
