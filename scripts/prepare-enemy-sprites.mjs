import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "assets/sorceress/enemies/sprites");
const runtimeRoot = path.join(root, "src/assets/characters/enemies");

const sheets = [
  ["repairs/drifter-run-full-frame.png", "drifter/runtime/drifter-run.webp"],
  ["drifter-attack-hd.png", "drifter/runtime/drifter-attack.webp"],
  ["repairs/spitter-run-full-frame.png", "spitter/runtime/spitter-run.webp"],
  ["spitter-attack-hd.png", "spitter/runtime/spitter-attack.webp"],
  ["charger-run-hd.png", "charger/runtime/charger-run.webp"],
  ["charger-attack-hd.png", "charger/runtime/charger-attack.webp"],
  ["summoner-run-hd.png", "splitter/runtime/summoner-run.webp"],
  ["summoner-attack-hd.png", "splitter/runtime/summoner-attack.webp"],
  ["repairs/overmind-run-full-frame.png", "overmind/runtime/overmind-run.webp"],
  [
    "repairs/overmind-attack-full-frame.png",
    "overmind/runtime/overmind-attack.webp",
  ],
];

const runtimeFrame = 256;
// Shrink the complete source cell once, then anchor the visible silhouette to
// one ground line. This keeps authored squash/stretch while preventing camera
// drift or raised limbs from crossing a Phaser frame boundary.
const normalizedSourceFrame = 512;
const normalizedFrame = 220;
const frameInset = (runtimeFrame - normalizedFrame) / 2;
const groundLine = runtimeFrame - frameInset;
const columns = 8;
const rows = 4;
const frameCount = 31;

function removeSmallAlphaComponents(pixels, width, height, minimumPixels = 64) {
  const visited = new Uint8Array(width * height);
  const neighbors = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];

  for (let start = 0; start < visited.length; start += 1) {
    if (visited[start] || pixels[start * 4 + 3] === 0) continue;
    const component = [];
    const queue = [start];
    visited[start] = 1;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      component.push(current);
      const x = current % width;
      const y = Math.floor(current / width);
      for (const [dx, dy] of neighbors) {
        const nextX = x + dx;
        const nextY = y + dy;
        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height)
          continue;
        const next = nextY * width + nextX;
        if (visited[next] || pixels[next * 4 + 3] === 0) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }
    if (component.length >= minimumPixels) continue;
    for (const pixel of component) pixels.fill(0, pixel * 4, pixel * 4 + 4);
  }
}

for (const [sourceName, outputName] of sheets) {
  const source = path.join(sourceRoot, sourceName);
  const output = path.join(runtimeRoot, outputName);
  const frames = [];
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read dimensions for ${sourceName}`);
  }

  for (let index = 0; index < frameCount; index++) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = Math.round((column * metadata.width) / columns);
    const right = Math.round(((column + 1) * metadata.width) / columns);
    const top = Math.round((row * metadata.height) / rows);
    const bottom = Math.round(((row + 1) * metadata.height) / rows);
    const { data: normalizedPixels, info: normalizedInfo } = await sharp(source)
      .extract({
        left,
        top,
        width: right - left,
        height: bottom - top,
      })
      .resize(normalizedSourceFrame, normalizedSourceFrame, { fit: "fill" })
      .resize(normalizedFrame, normalizedFrame, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let offset = 0; offset < normalizedPixels.length; offset += 4) {
      if (normalizedPixels[offset + 3] >= 16) continue;
      normalizedPixels[offset] = 0;
      normalizedPixels[offset + 1] = 0;
      normalizedPixels[offset + 2] = 0;
      normalizedPixels[offset + 3] = 0;
    }
    removeSmallAlphaComponents(
      normalizedPixels,
      normalizedInfo.width,
      normalizedInfo.height,
    );
    const normalized = await sharp(normalizedPixels, {
      raw: normalizedInfo,
    })
      .png()
      .toBuffer();
    const trimmed = await sharp(normalized)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 2 })
      .png()
      .toBuffer();
    const trimmedMetadata = await sharp(trimmed).metadata();
    if (!trimmedMetadata.width || !trimmedMetadata.height) {
      throw new Error(`${sourceName} frame ${index} is empty`);
    }
    const input = await sharp({
      create: {
        width: runtimeFrame,
        height: runtimeFrame,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: trimmed,
          left: Math.round((runtimeFrame - trimmedMetadata.width) / 2),
          top: Math.round(groundLine - trimmedMetadata.height),
        },
      ])
      .png()
      .toBuffer();
    frames.push({
      input,
      left: (index % columns) * runtimeFrame,
      top: Math.floor(index / columns) * runtimeFrame,
    });
  }

  await mkdir(path.dirname(output), { recursive: true });
  await sharp({
    create: {
      width: columns * runtimeFrame,
      height: rows * runtimeFrame,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(frames)
    .webp({ lossless: true, effort: 4, alphaQuality: 100 })
    .toFile(output);

  console.log(path.relative(root, output));
}
