import { mkdir, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const arena = "src/assets/environment/arena";
await mkdir(`${arena}/runtime`, { recursive: true });
await sharp(`${arena}/masters/mars_arena_fence_v001.png`)
  .resize({ width: 3840, height: 2160, fit: "fill" })
  .webp({ quality: 88 })
  .toFile(`${arena}/runtime/mars-arena-fence.webp`);
const output = "src/assets/audio/runtime";
await mkdir(output, { recursive: true });
const files = [
  "src/assets/music/music_battle.wav",
  "src/assets/music/music_boss.wav",
];
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) await collect(`${dir}/${entry.name}`);
    else if (entry.name.endsWith(".wav")) files.push(`${dir}/${entry.name}`);
  }
}
await collect("src/assets/sfx");
for (const file of files) {
  const name = file.split("/").at(-1).replace(".wav", ".mp3");
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-i",
      file,
      "-codec:a",
      "libmp3lame",
      "-q:a",
      "3",
      `${output}/${name}`,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`Could not encode ${file}`);
}
console.log(`Prepared arena and ${files.length} audio assets.`);
