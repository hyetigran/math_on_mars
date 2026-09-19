#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const FLOAT = 5126;

function fail(message) {
  console.error(`bake-glb-node-rotation: ${message}`);
  process.exit(1);
}

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
  fail(
    "usage: node scripts/bake-glb-node-rotation.mjs <input.glb> <output.glb>",
  );
}

const inputPath = path.resolve(inputArg);
const outputPath = path.resolve(outputArg);
if (inputPath === outputPath) fail("input and output paths must be different");

const source = fs.readFileSync(inputPath);
if (source.readUInt32LE(0) !== GLB_MAGIC || source.readUInt32LE(4) !== 2) {
  fail("input is not a glTF 2.0 binary");
}

let cursor = 12;
const chunks = [];
while (cursor < source.length) {
  const length = source.readUInt32LE(cursor);
  const type = source.readUInt32LE(cursor + 4);
  const data = Buffer.from(source.subarray(cursor + 8, cursor + 8 + length));
  chunks.push({ type, data });
  cursor += 8 + length;
}

const jsonChunk = chunks.find((chunk) => chunk.type === JSON_CHUNK);
const binChunk = chunks.find((chunk) => chunk.type === BIN_CHUNK);
if (!jsonChunk || !binChunk) fail("expected one JSON chunk and one BIN chunk");

const gltf = JSON.parse(
  jsonChunk.data.toString("utf8").replace(/[\u0000 ]+$/u, ""),
);
const nodesWithRotation = (gltf.nodes ?? [])
  .map((node, index) => ({ node, index }))
  .filter(
    ({ node }) => node.mesh !== undefined && Array.isArray(node.rotation),
  );

if (nodesWithRotation.length !== 1) {
  fail(
    `expected exactly one rotated mesh node, found ${nodesWithRotation.length}`,
  );
}

const { node, index: nodeIndex } = nodesWithRotation[0];
if (node.scale || node.translation || node.matrix) {
  fail(
    "the rotated mesh node also has scale, translation, or matrix; refusing an ambiguous bake",
  );
}

const [qx, qy, qz, qw] = node.rotation;
const length = Math.hypot(qx, qy, qz, qw);
if (!Number.isFinite(length) || length === 0) fail("invalid node quaternion");
const x = qx / length;
const y = qy / length;
const z = qz / length;
const w = qw / length;

const rotation = [
  1 - 2 * (y * y + z * z),
  2 * (x * y - z * w),
  2 * (x * z + y * w),
  2 * (x * y + z * w),
  1 - 2 * (x * x + z * z),
  2 * (y * z - x * w),
  2 * (x * z - y * w),
  2 * (y * z + x * w),
  1 - 2 * (x * x + y * y),
];

function componentCount(type) {
  return { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[type] ?? 0;
}

function rotateAccessor(accessorIndex, semantic) {
  const accessor = gltf.accessors?.[accessorIndex];
  const view = gltf.bufferViews?.[accessor?.bufferView];
  if (!accessor || !view)
    fail(`missing accessor or buffer view for ${semantic}`);
  if (accessor.componentType !== FLOAT || componentCount(accessor.type) < 3) {
    fail(`${semantic} must use floating-point VEC3 or VEC4 data`);
  }
  if ((view.buffer ?? 0) !== 0)
    fail(`${semantic} is not in the GLB BIN buffer`);

  const components = componentCount(accessor.type);
  const stride = view.byteStride ?? components * 4;
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const mins = [Infinity, Infinity, Infinity];
  const maxs = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < accessor.count; i += 1) {
    const offset = start + i * stride;
    const vx = binChunk.data.readFloatLE(offset);
    const vy = binChunk.data.readFloatLE(offset + 4);
    const vz = binChunk.data.readFloatLE(offset + 8);
    let rx = rotation[0] * vx + rotation[1] * vy + rotation[2] * vz;
    let ry = rotation[3] * vx + rotation[4] * vy + rotation[5] * vz;
    let rz = rotation[6] * vx + rotation[7] * vy + rotation[8] * vz;

    if (semantic !== "POSITION") {
      const magnitude = Math.hypot(rx, ry, rz);
      if (magnitude > 0) {
        rx /= magnitude;
        ry /= magnitude;
        rz /= magnitude;
      }
    }

    binChunk.data.writeFloatLE(rx, offset);
    binChunk.data.writeFloatLE(ry, offset + 4);
    binChunk.data.writeFloatLE(rz, offset + 8);
    mins[0] = Math.min(mins[0], rx);
    mins[1] = Math.min(mins[1], ry);
    mins[2] = Math.min(mins[2], rz);
    maxs[0] = Math.max(maxs[0], rx);
    maxs[1] = Math.max(maxs[1], ry);
    maxs[2] = Math.max(maxs[2], rz);
  }

  if (semantic === "POSITION") {
    accessor.min = mins;
    accessor.max = maxs;
  }
}

const transformed = new Set();
const mesh = gltf.meshes?.[node.mesh];
if (!mesh)
  fail(`mesh ${node.mesh} referenced by node ${nodeIndex} does not exist`);

for (const primitive of mesh.primitives ?? []) {
  for (const semantic of ["POSITION", "NORMAL", "TANGENT"]) {
    const accessorIndex = primitive.attributes?.[semantic];
    if (accessorIndex === undefined || transformed.has(accessorIndex)) continue;
    rotateAccessor(accessorIndex, semantic);
    transformed.add(accessorIndex);
  }
}

delete node.rotation;

function pad(buffer, multiple, byte) {
  const padding = (multiple - (buffer.length % multiple)) % multiple;
  return padding === 0
    ? buffer
    : Buffer.concat([buffer, Buffer.alloc(padding, byte)]);
}

const jsonData = pad(Buffer.from(JSON.stringify(gltf)), 4, 0x20);
const binData = pad(binChunk.data, 4, 0x00);
const totalLength = 12 + 8 + jsonData.length + 8 + binData.length;
const output = Buffer.alloc(totalLength);

output.writeUInt32LE(GLB_MAGIC, 0);
output.writeUInt32LE(2, 4);
output.writeUInt32LE(totalLength, 8);
output.writeUInt32LE(jsonData.length, 12);
output.writeUInt32LE(JSON_CHUNK, 16);
jsonData.copy(output, 20);
const binHeader = 20 + jsonData.length;
output.writeUInt32LE(binData.length, binHeader);
output.writeUInt32LE(BIN_CHUNK, binHeader + 4);
binData.copy(output, binHeader + 8);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);
console.log(
  JSON.stringify(
    {
      input: inputPath,
      output: outputPath,
      nodeIndex,
      bakedRotation: node.rotation ?? [qx, qy, qz, qw],
      transformedAccessors: [...transformed],
      bytes: output.length,
    },
    null,
    2,
  ),
);
