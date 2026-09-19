#!/usr/bin/env node

import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const sourceDir = join(root, "assets/sorceress/audio/enemy-sfx/source");
const outputDir = join(root, "src/assets/sfx/enemies");

// name, source, exact seconds, target mean dBFS, maximum peak dBFS,
// optional initial gain fraction and curve power for a rising warning envelope
const effects = [
  ["slime_move_01", "slime_move_01_source.mp3", 0.3, -24, -5],
  ["slime_move_02", "slime_move_02_source.mp3", 0.34, -24, -5],
  ["slime_move_03", "slime_move_03_source.mp3", 0.28, -24, -5],
  ["slime_hit_01", "slime_hit_01_source.mp3", 0.18, -21, -3.5],
  ["slime_hit_02", "slime_hit_02_source.mp3", 0.2, -21, -3.5],
  ["slime_hit_03", "slime_hit_03_source.mp3", 0.22, -21, -3.5],
  ["slime_hit_04", "slime_hit_04_source.mp3", 0.16, -21, -3.5],
  ["slime_death", "slime_death_source.mp3", 0.22, -22, -5],
  ["spitter_windup", "spitter_windup_source.mp3", 0.8, -22, -4, 0.25],
  ["spitter_fire", "spitter_fire_source.mp3", 0.32, -20.5, -3.5],
  ["charger_windup", "charger_windup_source.mp3", 1.2, -22, -4, 0.08, 2],
  ["charger_rush", "charger_rush_source.mp3", 0.55, -20.5, -3.5],
  ["splitter_divide", "splitter_divide_source.mp3", 0.62, -21, -4],
  ["overmind_enter", "overmind_enter_source.mp3", 2.6, -20, -3],
  ["overmind_windup", "overmind_windup_source.mp3", 1.2, -21, -3.5, 0.1],
  ["overmind_slam", "overmind_slam_source.mp3", 1.35, -18.5, -2.5],
  ["overmind_fan", "overmind_fan_source.mp3", 0.6, -20, -3],
  ["overmind_summon", "overmind_summon_source.mp3", 0.9, -20, -3],
  ["overmind_death", "overmind_death_source.mp3", 2.6, -20, -3],
];

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} failed:\n${result.stderr || result.stdout}`);
  }
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function levels(path) {
  const log = run("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-i",
    path,
    "-af",
    "volumedetect",
    "-f",
    "null",
    "-",
  ]);
  const mean = Number(log.match(/mean_volume:\s*(-?[\d.]+) dB/)?.[1]);
  const peak = Number(log.match(/max_volume:\s*(-?[\d.]+) dB/)?.[1]);
  if (!Number.isFinite(mean) || !Number.isFinite(peak)) {
    throw new Error(`Could not measure levels for ${path}`);
  }
  return { mean, peak };
}

function duration(path) {
  return Number(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      path,
    ]).trim(),
  );
}

function friendlyTitle(name) {
  const labels = { amb: "Ambient", ui: "UI" };
  return name
    .split("_")
    .map((part) => labels[part] ?? `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

mkdirSync(outputDir, { recursive: true });
const workDir = mkdtempSync(join(tmpdir(), "math-on-mars-enemy-sfx-"));

try {
  for (const [
    name,
    sourceName,
    seconds,
    targetMean,
    targetPeak,
    rampStart,
    rampPower = 1,
  ] of effects) {
    const source = join(sourceDir, sourceName);
    const staged = join(workDir, `${name}.wav`);
    const output = join(outputDir, `${name}.wav`);
    const fadeOut = Math.min(0.025, Math.max(0.01, seconds * 0.05));
    const fadeStart = seconds - fadeOut;
    const cleanup = [
      "aformat=sample_fmts=fltp:channel_layouts=mono",
      "silenceremove=start_periods=1:start_duration=0.001:start_threshold=-50dB:start_silence=0.002",
      "asetpts=PTS-STARTPTS",
      `apad=whole_dur=${seconds}`,
      `atrim=0:${seconds}`,
      ...(rampStart
        ? [
            `volume='${rampStart}+(1-${rampStart})*${
              rampPower === 2 ? `(t/${seconds})*(t/${seconds})` : `t/${seconds}`
            }':eval=frame`,
          ]
        : []),
      "afade=t=in:st=0:d=0.002:curve=qsin",
      `afade=t=out:st=${fadeStart}:d=${fadeOut}:curve=qsin`,
    ].join(",");

    run("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      source,
      "-af",
      cleanup,
      "-ar",
      "48000",
      "-ac",
      "1",
      "-c:a",
      "pcm_f32le",
      staged,
    ]);

    const input = levels(staged);
    const gain = Math.min(targetMean - input.mean, targetPeak - input.peak);
    run("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      staged,
      "-af",
      `volume=${gain.toFixed(3)}dB`,
      "-ar",
      "48000",
      "-ac",
      "1",
      "-c:a",
      "pcm_s24le",
      "-metadata",
      `title=${friendlyTitle(name)}`,
      "-metadata",
      "artist=Math on Mars",
      "-metadata",
      "comment=Original isolated enemy game sound effect",
      output,
    ]);

    const final = levels(output);
    const actualDuration = duration(output);
    console.log(
      `${name}.wav | ${actualDuration.toFixed(3)}s | mean ${final.mean.toFixed(1)} dBFS | peak ${final.peak.toFixed(1)} dBFS`,
    );
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
