import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Author-time only: the game ships MP3 files and never synthesizes live speech.
const pack = process.argv[2] ?? "k1";
if (!["k1", "equipment"].includes(pack))
  throw new Error("Unknown narration pack");
const clips = JSON.parse(
  await readFile(`content/narration/${pack}-en.json`, "utf8"),
);
const temporary = await mkdtemp(join(tmpdir(), "mars-narration-"));
await mkdir(`public/audio/${pack}`, { recursive: true });
try {
  for (const [id, text] of Object.entries(clips)) {
    const source = join(temporary, `${id}.aiff`);
    for (const [command, args] of [
      ["say", ["-v", "Samantha", "-r", "155", "-o", source, text]],
      [
        "ffmpeg",
        [
          "-v",
          "error",
          "-y",
          "-i",
          source,
          "-codec:a",
          "libmp3lame",
          "-b:a",
          "64k",
          `public/audio/${pack}/${id}.mp3`,
        ],
      ],
    ]) {
      const result = spawnSync(command, args, { stdio: "inherit" });
      if (result.error || result.status !== 0)
        throw result.error ?? new Error(`${command} failed`);
    }
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}

await writeFile(
  pack === "k1"
    ? "src/narration-manifest.ts"
    : "src/equipment-narration-manifest.ts",
  `// Generated from content/narration/${pack}-en.json by build-narration.mjs.\nexport const ${pack === "k1" ? "NARRATION_CLIPS" : "EQUIPMENT_CLIPS"}: string[] = ${JSON.stringify(Object.keys(clips), null, 2)};\n`,
);
