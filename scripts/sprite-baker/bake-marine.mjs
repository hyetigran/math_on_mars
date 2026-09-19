#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const rendererUrl = pathToFileURL(
  path.join(import.meta.dirname, "render.html"),
).href;
const chromePath =
  process.env.MATH_ON_MARS_CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const frameWidth = 512;
const frameHeight = 512;
const fps = 15;
const maximumColumns = 5;

const allDirections = [
  { slug: "n", label: "north", yawDegrees: 0 },
  { slug: "ne", label: "northeast", yawDegrees: -45 },
  { slug: "e", label: "east", yawDegrees: -90 },
  { slug: "se", label: "southeast", yawDegrees: -135 },
  { slug: "s", label: "south", yawDegrees: 180 },
  { slug: "sw", label: "southwest", yawDegrees: 135 },
  { slug: "w", label: "west", yawDegrees: 90 },
  { slug: "nw", label: "northwest", yawDegrees: 45 },
];

const characterProfiles = {
  "marine-v004": {
    yawOffsetDegrees: 0,
    motions: {
      walk: {
        source:
          "../tmp_assets/unused/assets/sorceress/3d/marine-v004/animations/marine-v004-walk-textured.glb",
      },
      run: {
        source:
          "../tmp_assets/unused/assets/sorceress/3d/marine-v004/animations/marine-v004-run-textured.glb",
      },
    },
  },
  "marine-v005": {
    yawOffsetDegrees: 180,
    motions: {
      idle: {
        source:
          "src/assets/characters/marine/source/rigged/character-rigged-1789585407607.glb",
        staticPose: true,
      },
      walk: {
        source: "src/assets/characters/marine/source/animations/walking.glb",
        armStabilization: 0.8,
      },
      jump: {
        source:
          "src/assets/characters/marine/source/rigged/character-rigged-1789585407607.glb",
        proceduralMotion: "jump",
        durationSeconds: 0.6,
      },
      run_jump: {
        source: "src/assets/characters/marine/source/animations/walking.glb",
        proceduralMotion: "runningJump",
        durationSeconds: 0.8,
        armStabilization: 0.35,
      },
    },
  },
};

function readArgument(name, fallback) {
  const flagIndex = process.argv.indexOf(`--${name}`);
  if (flagIndex === -1) return fallback;
  const value = process.argv[flagIndex + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for --${name}`);
  }
  return value;
}

const character = readArgument("character", "marine-v005");
const profile = characterProfiles[character];
if (!profile) {
  throw new Error(
    `Unknown character ${character}. Expected one of: ${Object.keys(characterProfiles).join(", ")}`,
  );
}
const directionSlugs = readArgument(
  "directions",
  allDirections.map(({ slug }) => slug).join(","),
)
  .split(",")
  .map((slug) => slug.trim().toLowerCase())
  .filter(Boolean);
const invalidDirections = directionSlugs.filter(
  (slug) => !allDirections.some((direction) => direction.slug === slug),
);
if (invalidDirections.length) {
  throw new Error(`Unknown directions: ${invalidDirections.join(", ")}`);
}
const directions = directionSlugs.map((slug) => {
  const direction = allDirections.find((candidate) => candidate.slug === slug);
  return {
    ...direction,
    yawDegrees: direction.yawDegrees + profile.yawOffsetDegrees,
  };
});
const motionNames = readArgument(
  "motions",
  Object.keys(profile.motions).join(","),
)
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const invalidMotions = motionNames.filter((name) => !profile.motions[name]);
if (invalidMotions.length) {
  throw new Error(`Unknown motions: ${invalidMotions.join(", ")}`);
}
const outputRoot = path.join(
  projectRoot,
  character === "marine-v005"
    ? "src/assets/characters/marine/sprites"
    : `../tmp_assets/unused/assets/sorceress/3d/${character}/sprites`,
);
const motions = motionNames.map((name) => ({
  name,
  armStabilization: 0,
  armOffsets: {},
  staticPose: false,
  ...profile.motions[name],
}));

const jobs = directions.flatMap((direction) =>
  motions.map((motion) => ({
    ...motion,
    ...direction,
    motion: motion.name,
    name: `${motion.name}-${direction.slug}`,
    outputDir: path.join(outputRoot, direction.slug),
  })),
);

function pngBuffer(dataUrl) {
  const prefix = "data:image/png;base64,";
  if (!dataUrl.startsWith(prefix))
    throw new Error("Renderer returned a non-PNG frame.");
  return Buffer.from(dataUrl.slice(prefix.length), "base64");
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function frameDelta(left, right) {
  const leftRaw = await sharp(left).ensureAlpha().raw().toBuffer();
  const rightRaw = await sharp(right).ensureAlpha().raw().toBuffer();
  if (leftRaw.length !== rightRaw.length)
    throw new Error("Frame dimensions differ.");
  let difference = 0;
  for (let index = 0; index < leftRaw.length; index += 1) {
    difference += Math.abs(leftRaw[index] - rightRaw[index]);
  }
  return difference / (leftRaw.length * 255);
}

async function writeSheet(job, rendered) {
  const frames = rendered.frames.map(pngBuffer);
  const frameCount = frames.length;
  const columns = Math.min(maximumColumns, frameCount);
  const rows = Math.ceil(frameCount / columns);
  const composites = frames.map((input, index) => ({
    input,
    left: (index % columns) * frameWidth,
    top: Math.floor(index / columns) * frameHeight,
  }));
  const imageName = `${job.name}.png`;
  const imagePath = path.join(job.outputDir, imageName);
  await sharp({
    create: {
      width: columns * frameWidth,
      height: rows * frameHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(imagePath);

  let seamDelta = 0;
  let medianStepDelta = 0;
  let seamRatio = 0;
  if (frames.length > 1) {
    const stepDeltas = [];
    for (let index = 0; index < frames.length - 1; index += 1) {
      stepDeltas.push(await frameDelta(frames[index], frames[index + 1]));
    }
    seamDelta = await frameDelta(frames.at(-1), frames[0]);
    medianStepDelta = median(stepDeltas);
    seamRatio = medianStepDelta === 0 ? 0 : seamDelta / medianStepDelta;
  }
  const metadata = {
    name: job.name,
    direction: job.slug,
    image: imageName,
    frameWidth,
    frameHeight,
    columns,
    rows,
    frameCount,
    fps,
    durationSeconds: rendered.duration,
    displayScale: Number(rendered.displayScale.toFixed(6)),
    loop: !job.staticPose && !job.proceduralMotion,
    endpointExcluded: !job.staticPose && !job.proceduralMotion,
    pivot: {
      x: Number(rendered.pivot.x.toFixed(2)),
      y: Number(rendered.pivot.y.toFixed(2)),
      normalizedX: Number((rendered.pivot.x / frameWidth).toFixed(6)),
      normalizedY: Number((rendered.pivot.y / frameHeight).toFixed(6)),
      meaning: "fixed world origin at ground level",
    },
    sourceModel: path.relative(
      job.outputDir,
      path.join(projectRoot, job.source),
    ),
    sourceClip: rendered.clipName,
    poseCorrections: rendered.poseCorrections,
    camera: {
      projection: "orthographic",
      elevationDegrees: 30,
      characterYawDegrees: job.yawDegrees,
      facingConvention: `Yaw ${job.yawDegrees} renders ${job.label} for ${character}`,
    },
    loopQa: {
      seamDelta: Number(seamDelta.toFixed(6)),
      medianStepDelta: Number(medianStepDelta.toFixed(6)),
      seamToMedianRatio: Number(seamRatio.toFixed(3)),
      pass: seamRatio <= 1.5,
    },
  };
  fs.writeFileSync(
    path.join(job.outputDir, `${job.name}.json`),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
  return { imagePath, metadata };
}

if (!fs.existsSync(chromePath)) {
  throw new Error(`Chrome executable not found: ${chromePath}`);
}
for (const direction of directions) {
  fs.mkdirSync(path.join(outputRoot, direction.slug), { recursive: true });
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
  const bakedAnimations = [];
  page.on("console", (message) =>
    console.log(`[browser:${message.type()}] ${message.text()}`),
  );
  page.on("pageerror", (error) =>
    console.error(`[browser:error] ${error.message}`),
  );
  await page.goto(rendererUrl, { waitUntil: "load" });
  await page.waitForFunction(
    () => typeof window.bakeSpriteFrames === "function",
  );

  for (const job of jobs) {
    const modelPath = path.join(projectRoot, job.source);
    if (!fs.existsSync(modelPath))
      throw new Error(`Missing source model: ${job.source}`);
    const rendered = await page.evaluate(
      (options) => window.bakeSpriteFrames(options),
      {
        modelUrl: pathToFileURL(modelPath).href,
        fps,
        width: frameWidth,
        height: frameHeight,
        yawDegrees: job.yawDegrees,
        armStabilization: job.armStabilization,
        armOffsets: job.armOffsets,
        staticPose: job.staticPose,
        proceduralMotion: job.proceduralMotion,
        durationSeconds: job.durationSeconds,
      },
    );
    const result = await writeSheet(job, rendered);
    bakedAnimations.push({
      state: job.motion,
      direction: job.slug,
      image: path.relative(outputRoot, result.imagePath),
      metadata: path.relative(
        outputRoot,
        path.join(job.outputDir, `${job.name}.json`),
      ),
      frameWidth,
      frameHeight,
      frameCount: result.metadata.frameCount,
      fps,
      displayScale: result.metadata.displayScale,
      pivot: result.metadata.pivot,
    });
    console.log(
      `${job.name}: ${path.relative(projectRoot, result.imagePath)} ` +
        `(loop ratio ${result.metadata.loopQa.seamToMedianRatio}, ` +
        `${result.metadata.loopQa.pass ? "pass" : "review"})`,
    );
  }
  const manifestPath = path.join(outputRoot, "manifest.json");
  const previousManifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    : undefined;
  const replacedKeys = new Set(
    bakedAnimations.map(({ state, direction }) => `${state}:${direction}`),
  );
  const preservedAnimations = (previousManifest?.animations ?? []).filter(
    ({ state, direction }) => !replacedKeys.has(`${state}:${direction}`),
  );
  const animations = [...preservedAnimations, ...bakedAnimations].sort(
    (left, right) => {
      const directionDifference =
        allDirections.findIndex(({ slug }) => slug === left.direction) -
        allDirections.findIndex(({ slug }) => slug === right.direction);
      return directionDifference || left.state.localeCompare(right.state);
    },
  );
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        character,
        projection: "orthographic",
        cameraElevationDegrees: 30,
        directions: directions.map(({ slug, label, yawDegrees }) => ({
          slug,
          label,
          yawDegrees,
        })),
        animations,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `manifest: ${path.relative(projectRoot, path.join(outputRoot, "manifest.json"))}`,
  );
} finally {
  await browser.close();
}
