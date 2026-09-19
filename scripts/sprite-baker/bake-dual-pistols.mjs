#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const rendererUrl = pathToFileURL(
  path.join(import.meta.dirname, "render-model-preview.html"),
).href;
const outputRoot = path.join(
  projectRoot,
  "../tmp_assets/unused/assets/sorceress/3d/marine-dual-pistols-v001/sprites",
);
const previewRoot = path.join(
  projectRoot,
  "../tmp_assets/unused/assets/sorceress/3d/marine-dual-pistols-v001/previews",
);
const chromePath =
  process.env.MATH_ON_MARS_CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ffmpegPath = "/opt/homebrew/bin/ffmpeg";
const frameWidth = 512;
const frameHeight = 512;
const renderScale = 2;
const fps = 15;
const maximumColumns = 5;
const directions = [
  { slug: "s", yawDegrees: 0 },
  { slug: "se", yawDegrees: 45 },
  { slug: "e", yawDegrees: 90 },
  { slug: "ne", yawDegrees: 135 },
  { slug: "n", yawDegrees: 180 },
  { slug: "nw", yawDegrees: 225 },
  { slug: "w", yawDegrees: -90 },
  { slug: "sw", yawDegrees: -45 },
];
const motions = [
  {
    name: "run",
    source:
      "../tmp_assets/unused/assets/sorceress/3d/marine-v005/animations/running.glb",
  },
  {
    name: "attack",
    source:
      "src/assets/characters/marine/source/rigged/character-rigged-1789585407607.glb",
  },
  {
    name: "run-attack",
    source:
      "../tmp_assets/unused/assets/sorceress/3d/marine-v005/animations/running.glb",
  },
];
const requestedDirections = new Set(
  (process.env.MOM_DUAL_PISTOL_DIRECTIONS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const requestedMotions = new Set(
  (process.env.MOM_DUAL_PISTOL_MOTIONS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const selectedDirections = requestedDirections.size
  ? directions.filter(({ slug }) => requestedDirections.has(slug))
  : directions;
const selectedMotions = requestedMotions.size
  ? motions.filter(({ name }) => requestedMotions.has(name))
  : motions;
const decode = (dataUrl) =>
  Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function frameDelta(left, right) {
  const [leftRaw, rightRaw] = await Promise.all([
    sharp(left).ensureAlpha().raw().toBuffer(),
    sharp(right).ensureAlpha().raw().toBuffer(),
  ]);
  let difference = 0;
  for (let index = 0; index < leftRaw.length; index += 1)
    difference += Math.abs(leftRaw[index] - rightRaw[index]);
  return difference / (leftRaw.length * 255);
}

async function writeSheet(direction, motion, rendered) {
  const frames = await Promise.all(
    rendered.frames.map((frame) =>
      sharp(decode(frame))
        .resize(frameWidth, frameHeight, { kernel: sharp.kernel.lanczos3 })
        .png()
        .toBuffer(),
    ),
  );
  const columns = Math.min(maximumColumns, frames.length);
  const rows = Math.ceil(frames.length / columns);
  const outputDir = path.join(outputRoot, direction.slug);
  fs.mkdirSync(outputDir, { recursive: true });
  const imageName = `${motion.name}-${direction.slug}.png`;
  const imagePath = path.join(outputDir, imageName);
  await sharp({
    create: {
      width: columns * frameWidth,
      height: rows * frameHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      frames.map((input, index) => ({
        input,
        left: (index % columns) * frameWidth,
        top: Math.floor(index / columns) * frameHeight,
      })),
    )
    .png()
    .toFile(imagePath);

  const stepDeltas = [];
  for (let index = 0; index < frames.length - 1; index += 1)
    stepDeltas.push(await frameDelta(frames[index], frames[index + 1]));
  const seamDelta = await frameDelta(frames.at(-1), frames[0]);
  const medianStepDelta = median(stepDeltas);
  const seamRatio = medianStepDelta === 0 ? 0 : seamDelta / medianStepDelta;
  const isLoop = motion.name !== "attack";
  const seamPassThreshold =
    motion.name === "attack" ? 0.002 : motion.name === "idle" ? 1.75 : 1.5;
  const metadata = {
    name: `${motion.name}-${direction.slug}`,
    direction: direction.slug,
    motion: motion.name,
    image: imageName,
    frameWidth,
    frameHeight,
    columns,
    rows,
    frameCount: frames.length,
    fps,
    durationSeconds: rendered.duration,
    loop: isLoop,
    endpointExcluded: rendered.endpointExcluded,
    pivot: rendered.pivot,
    sourceModel: path.relative(
      outputDir,
      path.join(projectRoot, motion.source),
    ),
    sourceClip: rendered.clipName,
    loadout: "dual-pistols-prototype",
    camera: {
      projection: "orthographic",
      elevationDegrees: 30,
      characterYawDegrees: direction.yawDegrees,
    },
    loopQa: {
      purpose: isLoop ? "loop-seam" : "return-to-ready-pose",
      seamDelta: Number(seamDelta.toFixed(6)),
      medianStepDelta: Number(medianStepDelta.toFixed(6)),
      seamToMedianRatio: Number(seamRatio.toFixed(3)),
      passThreshold: seamPassThreshold,
      pass: isLoop
        ? seamRatio <= seamPassThreshold
        : seamDelta <= seamPassThreshold,
    },
    ...(rendered.fireFrame === undefined
      ? {}
      : {
          fireFrame: rendered.fireFrame,
          muzzlePivots: rendered.muzzlePivots,
        }),
  };
  fs.writeFileSync(
    path.join(outputDir, `${motion.name}-${direction.slug}.json`),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
  return { frames, imagePath, metadata };
}

async function writeAnimatedPreview(
  frames,
  name,
  width,
  height,
  stillFrameIndex = 0,
) {
  if (!fs.existsSync(ffmpegPath)) return null;
  fs.mkdirSync(previewRoot, { recursive: true });
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mom-dual-pistols-"));
  try {
    const stillPath = path.join(previewRoot, `${name}-lossless.png`);
    await sharp(frames[stillFrameIndex])
      .resize(width, height, { kernel: sharp.kernel.lanczos3 })
      .png()
      .toFile(stillPath);
    await Promise.all(
      frames.map((frame, index) =>
        sharp(frame)
          .resize(width, height, { kernel: sharp.kernel.lanczos3 })
          .flatten({ background: { r: 38, g: 42, b: 50 } })
          .png()
          .toFile(
            path.join(tempDir, `frame-${String(index).padStart(3, "0")}.png`),
          ),
      ),
    );
    const outputPath = path.join(previewRoot, `${name}.mp4`);
    const result = spawnSync(
      ffmpegPath,
      [
        "-y",
        "-loglevel",
        "error",
        "-framerate",
        String(fps),
        "-i",
        path.join(tempDir, "frame-%03d.png"),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        "16",
        "-preset",
        "slow",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      { encoding: "utf8" },
    );
    if (result.status !== 0)
      throw new Error(result.stderr || "ffmpeg preview encoding failed");
    console.log(path.relative(projectRoot, stillPath));
    return outputPath;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    "--allow-file-access-from-files",
    "--disable-background-timer-throttling",
    "--disable-gpu-sandbox",
    "--enable-webgl",
    "--use-angle=swiftshader",
  ],
});

try {
  const page = await browser.newPage();
  await page.goto(rendererUrl, { waitUntil: "load" });
  await page.waitForFunction(
    () => typeof window.bakeDualPistolAnimation === "function",
  );
  const manifest = [];
  for (const motion of selectedMotions) {
    for (const direction of selectedDirections) {
      const rendered = await page.evaluate(
        (options) => window.bakeDualPistolAnimation(options),
        {
          modelUrl: pathToFileURL(path.join(projectRoot, motion.source)).href,
          motion: motion.name,
          yawDegrees: direction.yawDegrees,
          fps,
          width: frameWidth * renderScale,
          height: frameHeight * renderScale,
        },
      );
      const result = await writeSheet(direction, motion, rendered);
      manifest.push({
        state: motion.name,
        direction: direction.slug,
        image: path.relative(outputRoot, result.imagePath),
        metadata: `${direction.slug}/${motion.name}-${direction.slug}.json`,
        frameWidth,
        frameHeight,
        frameCount: result.metadata.frameCount,
        fps,
      });
      if (direction.slug === "se") {
        const highResolutionPreview = await page.evaluate(
          (options) => window.bakeDualPistolAnimation(options),
          {
            modelUrl: pathToFileURL(path.join(projectRoot, motion.source)).href,
            motion: motion.name,
            yawDegrees: direction.yawDegrees,
            fps,
            width: 2048,
            height: 2048,
          },
        );
        const preview = await writeAnimatedPreview(
          highResolutionPreview.frames.map(decode),
          `dual-pistols-${motion.name}-se`,
          1024,
          1024,
          highResolutionPreview.previewFrame,
        );
        if (preview) console.log(path.relative(projectRoot, preview));
      }
      console.log(
        `${motion.name}-${direction.slug}: ${result.metadata.frameCount} frames, seam ratio ${result.metadata.loopQa.seamToMedianRatio}`,
      );
    }
  }
  const manifestPath = path.join(outputRoot, "manifest.json");
  const previousAnimations = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8")).animations
    : [];
  const renderedKeys = new Set(
    manifest.map(({ state, direction }) => `${state}:${direction}`),
  );
  const motionOrder = new Map(motions.map(({ name }, index) => [name, index]));
  const directionOrder = new Map(
    directions.map(({ slug }, index) => [slug, index]),
  );
  const animations = [
    ...previousAnimations.filter(
      ({ state, direction }) =>
        motionOrder.has(state) && !renderedKeys.has(`${state}:${direction}`),
    ),
    ...manifest,
  ].sort(
    (left, right) =>
      motionOrder.get(left.state) - motionOrder.get(right.state) ||
      directionOrder.get(left.direction) - directionOrder.get(right.direction),
  );
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        version: "marine-dual-pistols-v001",
        frameWidth,
        frameHeight,
        fps,
        animations,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await browser.close();
}
