import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// Runtime-sized exports. Keep the original illustrations and 3D bake untouched.
const output = "src/assets/characters/marine/runtime";
const campOutput = "src/assets/environment/camp/runtime";
const splashOutput = "src/assets/screens/splash/runtime";
const source = "src/assets/characters/marine/sprites";
const runtimeVersion = "v005-r3";
const expectedDirections = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
for (const folder of [output, campOutput, splashOutput])
  await mkdir(folder, { recursive: true });
await sharp("src/assets/environment/camp/masters/base-camp-v3-expanded.png")
  .resize({ width: 2400 })
  .webp({ quality: 92 })
  .toFile(`${campOutput}/base-camp-v3.webp`);
await sharp("src/assets/screens/splash/masters/splash.png")
  .resize({ width: 1920 })
  .webp({ quality: 90 })
  .toFile(`${splashOutput}/splash.webp`);
const manifest = JSON.parse(await readFile(`${source}/manifest.json`, "utf8"));
const walks = new Map(
  manifest.animations
    .filter(({ state }) => state === "walk")
    .map((animation) => [animation.direction, animation]),
);
const idles = new Map(
  manifest.animations
    .filter(({ state }) => state === "idle")
    .map((animation) => [animation.direction, animation]),
);
const jumps = new Map(
  manifest.animations
    .filter(({ state }) => state === "jump")
    .map((animation) => [animation.direction, animation]),
);
const runningJumps = new Map(
  manifest.animations
    .filter(({ state }) => state === "run_jump")
    .map((animation) => [animation.direction, animation]),
);
for (const direction of expectedDirections) {
  if (!walks.has(direction))
    throw new Error(`Missing v005 walk animation for ${direction}`);
  if (!idles.has(direction))
    throw new Error(`Missing v005 idle pose for ${direction}`);
  if (!jumps.has(direction))
    throw new Error(`Missing v005 jump animation for ${direction}`);
  if (!runningJumps.has(direction))
    throw new Error(`Missing v005 running jump animation for ${direction}`);
}

async function prepareSheet(sourcePath, metadata, outputPath) {
  const frameSize = 192;
  const frames = [];
  for (let index = 0; index < metadata.frameCount; index += 1) {
    const input = await sharp(sourcePath)
      .extract({
        left: (index % metadata.columns) * metadata.frameWidth,
        top: Math.floor(index / metadata.columns) * metadata.frameHeight,
        width: metadata.frameWidth,
        height: metadata.frameHeight,
      })
      .resize(frameSize, frameSize, { fit: "fill" })
      .png()
      .toBuffer();
    frames.push({
      input,
      left: (index % metadata.columns) * frameSize,
      top: Math.floor(index / metadata.columns) * frameSize,
    });
  }
  await sharp({
    create: {
      width: metadata.columns * frameSize,
      height: metadata.rows * frameSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(frames)
    .webp({ lossless: true })
    .toFile(outputPath);
}

const animations = [];
for (const direction of expectedDirections) {
  const entry = walks.get(direction);
  const idleEntry = idles.get(direction);
  const jumpEntry = jumps.get(direction);
  const runningJumpEntry = runningJumps.get(direction);
  const metadata = JSON.parse(
    await readFile(`${source}/${entry.metadata}`, "utf8"),
  );
  const jumpMetadata = JSON.parse(
    await readFile(`${source}/${jumpEntry.metadata}`, "utf8"),
  );
  const runningJumpMetadata = JSON.parse(
    await readFile(`${source}/${runningJumpEntry.metadata}`, "utf8"),
  );
  // Keep the bake version in every runtime URL. A manifest cached from the
  // previous sprite layout must never be paired with these sheets.
  const image = `walk-${runtimeVersion}-${direction}.webp`;
  const idleImage = `idle-${runtimeVersion}-${direction}.webp`;
  const jumpImage = `jump-${runtimeVersion}-${direction}.webp`;
  const runningJumpImage = `run-jump-${runtimeVersion}-${direction}.webp`;
  await sharp(`${source}/${entry.image}`)
    .resize(metadata.columns * 192, metadata.rows * 192)
    .webp({ lossless: true })
    .toFile(`${output}/${image}`);
  await sharp(`${source}/${idleEntry.image}`)
    .resize(192, 192)
    .webp({ lossless: true })
    .toFile(`${output}/${idleImage}`);
  await prepareSheet(
    `${source}/${jumpEntry.image}`,
    jumpMetadata,
    `${output}/${jumpImage}`,
  );
  await prepareSheet(
    `${source}/${runningJumpEntry.image}`,
    runningJumpMetadata,
    `${output}/${runningJumpImage}`,
  );
  animations.push({
    direction,
    image,
    idleImage,
    jumpImage,
    runningJumpImage,
    source: `${source}/${entry.image}`,
    idleSource: `${source}/${idleEntry.image}`,
    jumpSource: `${source}/${jumpEntry.image}`,
    runningJumpSource: `${source}/${runningJumpEntry.image}`,
    frameWidth: 192,
    frameHeight: 192,
    columns: metadata.columns,
    frameCount: metadata.frameCount,
    // Camp movement is 165 units/s; this preserves the authored 15 FPS gait.
    stride: (165 * metadata.frameCount) / metadata.fps,
    framePivots: Array.from({ length: metadata.frameCount }, () => ({
      x: metadata.pivot.normalizedX,
      y: metadata.pivot.normalizedY,
    })),
    idlePivot: {
      x: idleEntry.pivot.normalizedX,
      y: idleEntry.pivot.normalizedY,
    },
    jumpColumns: jumpMetadata.columns,
    jumpFrameCount: jumpMetadata.frameCount,
    jumpFps: jumpMetadata.fps,
    jumpDisplayScale: jumpMetadata.displayScale,
    jumpPivots: Array.from({ length: jumpMetadata.frameCount }, () => ({
      x: jumpMetadata.pivot.normalizedX,
      y: jumpMetadata.pivot.normalizedY,
    })),
    runningJumpColumns: runningJumpMetadata.columns,
    runningJumpFrameCount: runningJumpMetadata.frameCount,
    runningJumpFps: runningJumpMetadata.fps,
    runningJumpDisplayScale: runningJumpMetadata.displayScale,
    runningJumpPivots: Array.from(
      { length: runningJumpMetadata.frameCount },
      () => ({
        x: runningJumpMetadata.pivot.normalizedX,
        y: runningJumpMetadata.pivot.normalizedY,
      }),
    ),
  });
}
await writeFile(
  `${output}/marine-${runtimeVersion}.json`,
  JSON.stringify(animations, null, 2) + "\n",
);
console.log(
  `Prepared camp, splash and ${animations.length} unarmed walk/standing-jump/running-jump directions.`,
);
