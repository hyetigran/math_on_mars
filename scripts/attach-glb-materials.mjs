#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function fail(message) {
  console.error(`attach-glb-materials: ${message}`);
  process.exit(1);
}

function parseGlb(filePath) {
  const bytes = fs.readFileSync(path.resolve(filePath));
  if (bytes.readUInt32LE(0) !== GLB_MAGIC || bytes.readUInt32LE(4) !== 2) {
    fail(`${filePath} is not a glTF 2.0 binary`);
  }
  let cursor = 12;
  let json;
  let bin;
  while (cursor < bytes.length) {
    const length = bytes.readUInt32LE(cursor);
    const type = bytes.readUInt32LE(cursor + 4);
    const data = Buffer.from(bytes.subarray(cursor + 8, cursor + 8 + length));
    if (type === JSON_CHUNK) json = JSON.parse(data.toString("utf8").trim());
    if (type === BIN_CHUNK) bin = data;
    cursor += 8 + length;
  }
  if (!json || !bin) fail(`${filePath} is missing its JSON or BIN chunk`);
  return { json, bin };
}

function pad(buffer, multiple, byte = 0) {
  const count = (multiple - (buffer.length % multiple)) % multiple;
  return count === 0
    ? buffer
    : Buffer.concat([buffer, Buffer.alloc(count, byte)]);
}

const [, , targetArg, sourceArg, outputArg] = process.argv;
if (!targetArg || !sourceArg || !outputArg) {
  fail(
    "usage: node scripts/attach-glb-materials.mjs <rigged.glb> <material-source.glb> <output.glb>",
  );
}

const target = parseGlb(targetArg);
const source = parseGlb(sourceArg);
if (!source.json.materials?.length || !source.json.images?.length) {
  fail("material source does not contain embedded materials and images");
}
if (!target.json.meshes?.length) fail("rigged target contains no mesh");

const appendedChunks = [pad(target.bin, 4)];
const imageBufferViews = [];
let byteOffset = appendedChunks[0].length;

for (const image of source.json.images) {
  if (image.bufferView === undefined)
    fail("only embedded source images are supported");
  const view = source.json.bufferViews[image.bufferView];
  if ((view.buffer ?? 0) !== 0) fail("source image is not stored in buffer 0");
  const imageBytes = Buffer.from(
    source.bin.subarray(
      view.byteOffset ?? 0,
      (view.byteOffset ?? 0) + view.byteLength,
    ),
  );
  imageBufferViews.push(target.json.bufferViews.length);
  target.json.bufferViews.push({
    buffer: 0,
    byteOffset,
    byteLength: imageBytes.length,
  });
  const padded = pad(imageBytes, 4);
  appendedChunks.push(padded);
  byteOffset += padded.length;
}

target.json.samplers = structuredClone(source.json.samplers ?? []);
target.json.images = source.json.images.map((image, index) => ({
  ...structuredClone(image),
  bufferView: imageBufferViews[index],
  uri: undefined,
}));
for (const image of target.json.images) delete image.uri;
target.json.textures = structuredClone(source.json.textures ?? []);
target.json.materials = structuredClone(source.json.materials);
for (const mesh of target.json.meshes) {
  for (const primitive of mesh.primitives ?? []) primitive.material = 0;
}

const used = new Set([
  ...(target.json.extensionsUsed ?? []),
  ...(source.json.extensionsUsed ?? []),
]);
if (used.size) target.json.extensionsUsed = [...used];
const required = new Set([
  ...(target.json.extensionsRequired ?? []),
  ...(source.json.extensionsRequired ?? []),
]);
if (required.size) target.json.extensionsRequired = [...required];

const bin = Buffer.concat(appendedChunks);
target.json.buffers[0].byteLength = bin.length;
const json = pad(Buffer.from(JSON.stringify(target.json)), 4, 0x20);
const totalLength = 12 + 8 + json.length + 8 + bin.length;
const output = Buffer.alloc(totalLength);

output.writeUInt32LE(GLB_MAGIC, 0);
output.writeUInt32LE(2, 4);
output.writeUInt32LE(totalLength, 8);
output.writeUInt32LE(json.length, 12);
output.writeUInt32LE(JSON_CHUNK, 16);
json.copy(output, 20);
const binHeader = 20 + json.length;
output.writeUInt32LE(bin.length, binHeader);
output.writeUInt32LE(BIN_CHUNK, binHeader + 4);
bin.copy(output, binHeader + 8);

const outputPath = path.resolve(outputArg);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);
console.log(
  JSON.stringify(
    {
      output: outputPath,
      material: target.json.materials[0].name ?? "material-0",
      images: target.json.images.length,
      bytes: output.length,
    },
    null,
    2,
  ),
);
