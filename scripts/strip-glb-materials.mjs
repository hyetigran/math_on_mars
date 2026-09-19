#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
  console.error(
    "usage: node scripts/strip-glb-materials.mjs <input.glb> <output.glb>",
  );
  process.exit(1);
}

const source = fs.readFileSync(path.resolve(inputArg));
const jsonLength = source.readUInt32LE(12);
const jsonType = source.readUInt32LE(16);
if (source.toString("ascii", 0, 4) !== "glTF" || jsonType !== 0x4e4f534a) {
  throw new Error("input is not a glTF 2.0 binary");
}

const gltf = JSON.parse(
  source
    .subarray(20, 20 + jsonLength)
    .toString("utf8")
    .trim(),
);
for (const mesh of gltf.meshes ?? []) {
  for (const primitive of mesh.primitives ?? []) delete primitive.material;
}
delete gltf.materials;
delete gltf.textures;
delete gltf.images;
delete gltf.samplers;

const json = Buffer.from(JSON.stringify(gltf));
const jsonPadding = (4 - (json.length % 4)) % 4;
const paddedJson = Buffer.concat([json, Buffer.alloc(jsonPadding, 0x20)]);
const oldBinHeader = 20 + jsonLength;
const binLength = source.readUInt32LE(oldBinHeader);
const binType = source.readUInt32LE(oldBinHeader + 4);
const bin = source.subarray(oldBinHeader + 8, oldBinHeader + 8 + binLength);
const totalLength = 12 + 8 + paddedJson.length + 8 + bin.length;
const output = Buffer.alloc(totalLength);

output.write("glTF", 0, "ascii");
output.writeUInt32LE(2, 4);
output.writeUInt32LE(totalLength, 8);
output.writeUInt32LE(paddedJson.length, 12);
output.writeUInt32LE(0x4e4f534a, 16);
paddedJson.copy(output, 20);
const newBinHeader = 20 + paddedJson.length;
output.writeUInt32LE(bin.length, newBinHeader);
output.writeUInt32LE(binType, newBinHeader + 4);
bin.copy(output, newBinHeader + 8);

fs.mkdirSync(path.dirname(path.resolve(outputArg)), { recursive: true });
fs.writeFileSync(path.resolve(outputArg), output);
