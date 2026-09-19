#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const input = process.argv[2];
if (!input) throw new Error("Usage: inspect-glb.mjs <model.glb>");
const inputPath = path.resolve(projectRoot, input);
if (!fs.existsSync(inputPath)) throw new Error(`Missing model: ${input}`);
const chromePath =
  process.env.MATH_ON_MARS_CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const rendererUrl = pathToFileURL(
  path.join(import.meta.dirname, "render-model-preview.html"),
).href;

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    "--allow-file-access-from-files",
    "--disable-gpu-sandbox",
    "--enable-webgl",
    "--use-angle=swiftshader",
  ],
});
try {
  const page = await browser.newPage();
  await page.goto(rendererUrl, { waitUntil: "load" });
  await page.waitForFunction(() => typeof window.inspectModel === "function");
  const result = await page.evaluate(
    (modelUrl) => window.inspectModel({ modelUrl }),
    pathToFileURL(inputPath).href,
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
