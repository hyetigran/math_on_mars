#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const [, , inputArg, outputArg, viewArg = "front"] = process.argv;
if (!inputArg || !outputArg) {
  console.error(
    "usage: node scripts/render-glb-pointcloud.mjs <input.glb> <output.ppm> [front|back|left|right]",
  );
  process.exit(1);
}

const source = fs.readFileSync(path.resolve(inputArg));
const jsonLength = source.readUInt32LE(12);
const gltf = JSON.parse(
  source
    .subarray(20, 20 + jsonLength)
    .toString("utf8")
    .trim(),
);
const binHeader = 20 + jsonLength;
const binOffset = binHeader + 8;
const primitive =
  gltf.meshes[gltf.nodes.find((node) => node.mesh !== undefined).mesh]
    .primitives[0];
const accessor = gltf.accessors[primitive.attributes.POSITION];
const view = gltf.bufferViews[accessor.bufferView];
const start = binOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
const stride = view.byteStride ?? 12;
const vertices = [];

for (let i = 0; i < accessor.count; i += 1) {
  const offset = start + i * stride;
  vertices.push([
    source.readFloatLE(offset),
    source.readFloatLE(offset + 4),
    source.readFloatLE(offset + 8),
  ]);
}

const projections = {
  front: ([x, y, z]) => [x, y, z],
  back: ([x, y, z]) => [-x, y, -z],
  left: ([x, y, z]) => [z, y, -x],
  right: ([x, y, z]) => [-z, y, x],
};
const project = projections[viewArg];
if (!project) throw new Error(`unsupported view: ${viewArg}`);
const points = vertices.map(project);

const width = 768;
const height = 1024;
const margin = 48;
let minU = Infinity;
let maxU = -Infinity;
let minV = Infinity;
let maxV = -Infinity;
let minD = Infinity;
let maxD = -Infinity;
for (const [u, v, depth] of points) {
  minU = Math.min(minU, u);
  maxU = Math.max(maxU, u);
  minV = Math.min(minV, v);
  maxV = Math.max(maxV, v);
  minD = Math.min(minD, depth);
  maxD = Math.max(maxD, depth);
}
const scale = Math.min(
  (width - 2 * margin) / (maxU - minU),
  (height - 2 * margin) / (maxV - minV),
);
const offsetU = (width - (maxU - minU) * scale) / 2;
const offsetV = (height - (maxV - minV) * scale) / 2;
const pixels = Buffer.alloc(width * height * 3, 245);

points.sort((a, b) => a[2] - b[2]);
for (const [u, v, depth] of points) {
  const px = Math.round(offsetU + (u - minU) * scale);
  const py = Math.round(height - offsetV - (v - minV) * scale);
  const t = maxD === minD ? 0.5 : (depth - minD) / (maxD - minD);
  const color = [
    Math.round(28 + 35 * t),
    Math.round(47 + 100 * t),
    Math.round(64 + 130 * t),
  ];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const x = px + dx;
      const y = py + dy;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const index = (y * width + x) * 3;
      pixels[index] = color[0];
      pixels[index + 1] = color[1];
      pixels[index + 2] = color[2];
    }
  }
}

const outputPath = path.resolve(outputArg);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), pixels]),
);
console.log(`${viewArg}: ${accessor.count} vertices -> ${outputPath}`);
