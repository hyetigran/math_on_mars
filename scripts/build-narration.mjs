import { readFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Author-time only: the game ships MP3 files and never synthesizes live speech.
const clips = JSON.parse(
  await readFile("content/narration/k1-en.json", "utf8"),
);
const temporary = await mkdtemp(join(tmpdir(), "mars-narration-"));
await mkdir("public/audio/k1", { recursive: true });
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
          `public/audio/k1/${id}.mp3`,
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
