#!/usr/bin/env node

import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const sourceDir = join(root, "assets/sorceress/audio/quiz-ui-sfx/source");
const outputDir = join(root, "src/assets/sfx/interface");

// name, source, exact seconds, channels, target mean dBFS, maximum peak dBFS
const effects = [
  ["wave_start", "wave_start_source.mp3", 1.0, 1, -22, -4],
  ["wave_clear", "wave_clear_source.mp3", 2.0, 2, -19, -2.5],
  ["quiz_key", "quiz_key_source.mp3", 0.07, 1, -30, -10],
  ["quiz_backspace", "quiz_backspace_source.mp3", 0.08, 1, -30, -10],
  ["quiz_correct", "quiz_correct_source.mp3", 0.4, 1, -23, -5],
  ["quiz_incorrect", "quiz_incorrect_source.mp3", 0.3, 1, -26, -7],
  ["quiz_timer_zero", "quiz_timer_zero_source.mp3", 0.55, 1, -25, -6],
  [
    "corrections_complete",
    "corrections_complete_source.mp3",
    1.2,
    2,
    -21,
    -3.5,
  ],
  ["ui_select", "ui_select_source.mp3", 0.08, 1, -28, -8],
  ["ui_open", "ui_open_source.mp3", 0.24, 1, -26, -6],
  ["ui_close", "ui_close_source.mp3", 0.24, 1, -26, -6],
  ["ui_unavailable", "ui_unavailable_source.mp3", 0.2, 1, -28, -8],
  ["ui_pause", "ui_pause_source.mp3", 0.3, 1, -25, -6],
  ["ui_resume", "ui_resume_source.mp3", 0.3, 1, -25, -6],
  ["mission_victory", "mission_victory_source.mp3", 6.5, 2, -17.5, -2],
  ["mission_defeat", "mission_defeat_source.mp3", 4.0, 2, -21, -3.5],
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
const workDir = mkdtempSync(join(tmpdir(), "math-on-mars-quiz-ui-sfx-"));

try {
  for (const [
    name,
    sourceName,
    seconds,
    channels,
    targetMean,
    targetPeak,
  ] of effects) {
    const source = join(sourceDir, sourceName);
    const staged = join(workDir, `${name}.wav`);
    const output = join(outputDir, `${name}.wav`);
    const fadeOut = Math.min(0.06, Math.max(0.008, seconds * 0.04));
    const fadeStart = seconds - fadeOut;
    const channelLayout = channels === 1 ? "mono" : "stereo";
    const cleanup = [
      `aformat=sample_fmts=fltp:channel_layouts=${channelLayout}`,
      "silenceremove=start_periods=1:start_duration=0.001:start_threshold=-52dB:start_silence=0.001",
      "asetpts=PTS-STARTPTS",
      `apad=whole_dur=${seconds}`,
      `atrim=0:${seconds}`,
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
      String(channels),
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
      String(channels),
      "-c:a",
      "pcm_s24le",
      "-metadata",
      `title=${friendlyTitle(name)}`,
      "-metadata",
      "artist=Math on Mars",
      "-metadata",
      "comment=Original isolated quiz and interface game sound",
      output,
    ]);

    const final = levels(output);
    const actualDuration = duration(output);
    console.log(
      `${name}.wav | ${actualDuration.toFixed(3)}s | ${channels === 1 ? "mono" : "stereo"} | mean ${final.mean.toFixed(1)} dBFS | peak ${final.peak.toFixed(1)} dBFS`,
    );
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
