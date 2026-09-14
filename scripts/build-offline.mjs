import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
const version = (await readFile("src/build-version.ts", "utf8")).match(
  /"([a-f0-9]{16})"/,
)[1];
const files = [];
async function visit(path) {
  for (const entry of (await readdir(path, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const file = `${path}/${entry.name}`;
    if (entry.isDirectory()) await visit(file);
    else if (!["dist/sw.js", "dist/offline-manifest.json"].includes(file))
      files.push({
        path: file.slice(5),
        sha256: createHash("sha256")
          .update(await readFile(file))
          .digest("hex"),
      });
  }
}
await visit("dist");
const manifest = { version, files };
await writeFile(
  "dist/offline-manifest.json",
  JSON.stringify(manifest, null, 2),
);
const worker = await readFile("scripts/service-worker.js", "utf8");
await writeFile(
  "dist/sw.js",
  worker.replace("/* BUILD_MANIFEST */ null", JSON.stringify(manifest)),
);
console.log(`Offline pack ${version}: ${files.length} required files`);
