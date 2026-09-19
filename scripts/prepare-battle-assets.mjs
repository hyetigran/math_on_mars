import { mkdir, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

// The supplied 4K arena PNG is used directly; no image conversion is needed.
const output = "src/assets/audio/runtime";
await mkdir(output, { recursive: true });
const files = [
  "src/assets/music/music_camp.wav",
  "src/assets/music/music_battle.wav",
  "src/assets/music/music_boss.wav",
];
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) await collect(`${dir}/${entry.name}`);
    else if (entry.name.endsWith(".wav") && !/_0[2-4]\.wav$/.test(entry.name))
      files.push(`${dir}/${entry.name}`);
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
console.log(`Prepared ${files.length} audio assets.`);
