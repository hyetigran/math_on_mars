#!/usr/bin/env node

import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const sourceDir = join(root, "assets/sorceress/audio/marine-sfx/source");
const outputDir = join(root, "src/assets/sfx");

const effects = [
  ["marine_footstep_01", "marine_footstep_01_source.mp3", 0.18, -24, -5],
  ["marine_footstep_02", "marine_footstep_02_source.mp3", 0.2, -24, -5],
  ["marine_footstep_03", "marine_footstep_03_source.mp3", 0.18, -24, -5],
  ["marine_footstep_04", "marine_footstep_04_source.mp3", 0.22, -24, -5],
  ["portal_enter", "portal_enter_source.mp3", 1.55, -20, -3],
  ["blaster_fire_01", "blaster_fire_01_source.mp3", 0.24, -19, -2.5],
  ["blaster_fire_02", "blaster_fire_02_source.mp3", 0.24, -19, -2.5],
  ["blaster_fire_03", "blaster_fire_03_source.mp3", 0.22, -19, -2.5],
  ["ammo_piercing_hit", "ammo_piercing_hit_source.mp3", 0.22, -22, -4],
  ["ammo_multishot_accent", "ammo_multishot_accent_source.mp3", 0.28, -22, -4],
  ["ammo_electric_arc", "ammo_electric_arc_source.mp3", 0.45, -22, -4],
  ["ammo_frost_apply", "ammo_frost_apply_source.mp3", 0.5, -22, -4],
  ["ammo_fiery_apply", "ammo_fiery_apply_source.mp3", 0.55, -22, -4],
  ["ammo_omni_fire", "ammo_omni_fire_source.mp3", 0.4, -18.5, -2],
  ["marine_damage", "marine_damage_source.mp3", 0.4, -20, -3],
  ["marine_low_health", "marine_low_health_source.mp3", 0.5, -22, -4],
  ["medkit_use", "medkit_use_source.mp3", 0.95, -20, -3],
  [
    "marine_shutdown",
    "marine_shutdown_source.mp3",
    1.5,
    -21,
    -3,
    "shutdown-tone",
  ],
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
const workDir = mkdtempSync(join(tmpdir(), "math-on-mars-sfx-"));

try {
  for (const [
    name,
    sourceName,
    seconds,
    targetMean,
    targetPeak,
    design,
  ] of effects) {
    const source = join(sourceDir, sourceName);
    const staged = join(workDir, `${name}.wav`);
    const output = join(outputDir, `${name}.wav`);
    const fadeOut = Math.min(0.025, Math.max(0.012, seconds * 0.08));
    const fadeStart = seconds - fadeOut;
    const cleanup = [
      "aformat=sample_fmts=fltp:channel_layouts=mono",
      "silenceremove=start_periods=1:start_duration=0.002:start_threshold=-48dB:start_silence=0.003",
      "asetpts=PTS-STARTPTS",
      `apad=whole_dur=${seconds}`,
      `atrim=0:${seconds}`,
      "afade=t=in:st=0:d=0.003:curve=qsin",
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

    let masteringInput = staged;
    if (design === "shutdown-tone") {
      const enhanced = join(workDir, `${name}-enhanced.wav`);
      run("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "aevalsrc=0.12*(sin(2*PI*(640*t-153.333*t*t))+0.28*sin(2*PI*(1280*t-306.666*t*t)))*exp(-1.15*t):s=48000:d=1.5",
        "-i",
        staged,
        "-filter_complex",
        "[0:a]afade=t=in:d=0.02,afade=t=out:st=1.25:d=0.25[tone];[1:a][tone]amix=inputs=2:weights='1 1':normalize=0[mix]",
        "-map",
        "[mix]",
        "-ar",
        "48000",
        "-ac",
        "1",
        "-c:a",
        "pcm_f32le",
        enhanced,
      ]);
      masteringInput = enhanced;
    }

    const input = levels(masteringInput);
    const gain = Math.min(targetMean - input.mean, targetPeak - input.peak);
    run("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      masteringInput,
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
      "comment=Original isolated game sound effect",
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
