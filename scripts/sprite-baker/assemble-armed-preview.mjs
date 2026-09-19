#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const characterPath = path.join(
  projectRoot,
  "src/assets/characters/marine/source/rigged/character-rigged-1789585407607.glb",
);
const weaponPath = path.join(
  projectRoot,
  "../tmp_assets/unused/assets/sorceress/3d/marine-armed-v001/blaster/hunyuan3d-3-1-1789623986641.glb",
);
const outputRoot = path.join(
  projectRoot,
  "../tmp_assets/unused/assets/sorceress/3d/marine-armed-v001",
);
const previewRoot = path.join(outputRoot, "previews");
fs.mkdirSync(previewRoot, { recursive: true });

const chromePath =
  process.env.MATH_ON_MARS_CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const rendererUrl = pathToFileURL(
  path.join(import.meta.dirname, "render-model-preview.html"),
).href;
const views = [
  ["s", 0],
  ["se", 45],
  ["e", 90],
  ["ne", 135],
  ["n", 180],
  ["nw", 225],
  ["w", -90],
  ["sw", -45],
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
    () => typeof window.renderArmedCharacterViews === "function",
  );
  const rendered = await page.evaluate(
    (options) => window.renderArmedCharacterViews(options),
    {
      characterUrl: pathToFileURL(characterPath).href,
      weaponUrl: pathToFileURL(weaponPath).href,
      yawDegrees: views.map(([, yawDegrees]) => yawDegrees),
      width: 1024,
      height: 1024,
    },
  );
  const pose = rendered.pose;
  const dimensions = rendered.dimensions;
  const frames = rendered.images.map((image, index) => ({
    direction: views[index][0],
    input: decode(image),
  }));

  const turntablePath = path.join(previewRoot, "armed-turntable.png");
  await sharp({
    create: {
      width: 4096,
      height: 2048,
      channels: 4,
      background: { r: 38, g: 42, b: 50, alpha: 1 },
    },
  })
    .composite(
      frames.map(({ input }, index) => ({
        input,
        left: (index % 4) * 1024,
        top: Math.floor(index / 4) * 1024,
      })),
    )
    .png()
    .toFile(turntablePath);

  const campImage = await sharp(
    path.join(
      projectRoot,
      "src/assets/characters/marine/runtime/idle-v005-r2-s.webp",
    ),
  )
    .resize(1024, 1024)
    .png()
    .toBuffer();
  const label = (text, x) => ({
    input: Buffer.from(
      `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><text x="512" y="970" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff">${text}</text></svg>`,
    ),
    left: x,
    top: 0,
  });
  await sharp({
    create: {
      width: 2048,
      height: 1024,
      channels: 4,
      background: { r: 38, g: 42, b: 50, alpha: 1 },
    },
  })
    .composite([
      { input: campImage, left: 0, top: 0 },
      { input: frames[0].input, left: 1024, top: 0 },
      label("CURRENT CAMP MC", 0),
      label("ARMED 3D ASSEMBLY", 1024),
    ])
    .png()
    .toFile(path.join(previewRoot, "armed-vs-camp.png"));

  fs.writeFileSync(
    path.join(outputRoot, "attachment.json"),
    `${JSON.stringify(
      {
        ...pose,
        dimensions,
        viewingDirections: views.map(([direction, yawDegrees]) => ({
          direction,
          yawDegrees,
        })),
      },
      null,
      2,
    )}\n`,
  );
  console.log(path.relative(projectRoot, turntablePath));
  console.log(
    path.relative(projectRoot, path.join(previewRoot, "armed-vs-camp.png")),
  );
} finally {
  await browser.close();
}
