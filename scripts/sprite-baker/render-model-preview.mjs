#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) {
  throw new Error("Usage: render-model-preview.mjs <model.glb> <preview.png>");
}

const inputPath = path.resolve(projectRoot, input);
const outputPath = path.resolve(projectRoot, output);
if (!fs.existsSync(inputPath)) throw new Error(`Missing model: ${input}`);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const chromePath =
  process.env.MATH_ON_MARS_CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const rendererUrl = pathToFileURL(
  path.join(import.meta.dirname, "render-model-preview.html"),
).href;
const views = [
  ["front", 0],
  ["front-right", 45],
  ["right", 90],
  ["back-right", 135],
  ["back", 180],
  ["back-left", 225],
  ["left", 270],
  ["front-left", 315],
];
const decode = (dataUrl) =>
  Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");

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
  await page.waitForFunction(
    () => typeof window.renderStaticModelViews === "function",
  );
  const frames = [];
  let dimensions;
  for (const [label, yawDegrees] of views) {
    const rendered = await page.evaluate(
      (options) => window.renderStaticModelViews(options),
      {
        modelUrl: pathToFileURL(inputPath).href,
        yawDegrees,
      },
    );
    dimensions ??= rendered.dimensions;
    frames.push({ label, input: decode(rendered.image) });
  }
  await sharp({
    create: {
      width: 2048,
      height: 1024,
      channels: 4,
      background: { r: 38, g: 42, b: 50, alpha: 1 },
    },
  })
    .composite(
      frames.map(({ input }, index) => ({
        input,
        left: (index % 4) * 512,
        top: Math.floor(index / 4) * 512,
      })),
    )
    .png()
    .toFile(outputPath);
  console.log(
    `${path.relative(projectRoot, outputPath)}: ` +
      `${dimensions.x.toFixed(3)} x ${dimensions.y.toFixed(3)} x ${dimensions.z.toFixed(3)}`,
  );
} finally {
  await browser.close();
}
