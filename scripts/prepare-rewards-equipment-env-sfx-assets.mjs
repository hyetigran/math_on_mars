#!/usr/bin/env node

import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const sourceDir = join(
  root,
  "assets/sorceress/audio/rewards-equipment-env/source",
);
const outputDir = join(root, "src/assets/sfx/rewards-equipment-environment");

// name, source, exact seconds, channels, target mean dBFS, maximum peak dBFS
const oneShots = [
  ["reward_reveal_white", "reward_reveal_white_source.mp3", 0.7, 2, -23, -5],
  ["reward_reveal_green", "reward_reveal_green_source.mp3", 0.9, 2, -22, -4.5],
  ["reward_reveal_blue", "reward_reveal_blue_source.mp3", 1.2, 2, -21, -4],
  [
    "reward_reveal_purple",
    "reward_reveal_purple_source.mp3",
    1.5,
    2,
    -20,
    -3.5,
  ],
  ["reward_select", "reward_select_source.mp3", 0.55, 1, -22, -4],
  ["salvage_pickup_01", "salvage_pickup_01_source.mp3", 0.16, 1, -26, -7],
  ["ammo_pickup", "ammo_pickup_source.mp3", 0.4, 1, -23, -5],
  ["cache_open", "cache_open_source.mp3", 1.0, 1, -21, -3.5],
  ["shop_purchase", "shop_purchase_source.mp3", 0.4, 1, -24, -5],
  ["shop_sell", "shop_sell_source.mp3", 0.4, 1, -24, -5],
  ["shop_refresh", "shop_refresh_source.mp3", 0.5, 1, -25, -6],
  ["ammo_equip", "ammo_equip_source.mp3", 0.3, 1, -23, -4.5],
  ["ammo_unequip", "ammo_unequip_source.mp3", 0.3, 1, -23, -4.5],
  ["ammo_merge", "ammo_merge_source.mp3", 1.05, 2, -20, -3],
  ["omni_forge", "omni_forge_source.mp3", 3.25, 2, -18, -2.5],
];

// The source includes extra material equal to crossfadeSeconds. Rotating the
// source and overlapping its original head at the end produces a circular loop
// whose boundary is an adjacent pair of source samples rather than a fade-out.
const loops = [
  ["amb_mars_wind", "amb_mars_wind_source.mp3", 24, 3, 2, -29, -10],
  ["amb_camp_machinery", "amb_camp_machinery_source.mp3", 18, 2, 2, -30, -11],
  ["amb_portal_hum", "amb_portal_hum_source.mp3", 8, 2, 1, -27, -8],
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

function master(
  staged,
  output,
  name,
  channels,
  targetMean,
  targetPeak,
  comment,
) {
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
    `comment=${comment}`,
    output,
  ]);
}

mkdirSync(outputDir, { recursive: true });
const workDir = mkdtempSync(join(tmpdir(), "math-on-mars-reward-env-sfx-"));

try {
  for (const [
    name,
    sourceName,
    seconds,
    channels,
    targetMean,
    targetPeak,
  ] of oneShots) {
    const source = join(sourceDir, sourceName);
    const staged = join(workDir, `${name}.wav`);
    const output = join(outputDir, `${name}.wav`);
    const fadeOut = Math.min(0.045, Math.max(0.009, seconds * 0.045));
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
    master(
      staged,
      output,
      name,
      channels,
      targetMean,
      targetPeak,
      "Original isolated reward, equipment or pickup game sound",
    );

    const final = levels(output);
    console.log(
      `${name}.wav | ${duration(output).toFixed(3)}s | ${channels === 1 ? "mono" : "stereo"} | mean ${final.mean.toFixed(1)} dBFS | peak ${final.peak.toFixed(1)} dBFS`,
    );
  }

  for (const [
    name,
    sourceName,
    seconds,
    crossfadeSeconds,
    channels,
    targetMean,
    targetPeak,
  ] of loops) {
    const source = join(sourceDir, sourceName);
    const staged = join(workDir, `${name}.wav`);
    const output = join(outputDir, `${name}.wav`);
    const sourceSeconds = seconds + crossfadeSeconds;
    const channelLayout = channels === 1 ? "mono" : "stereo";
    const graph = [
      `[0:a]aformat=sample_fmts=fltp:channel_layouts=${channelLayout},asplit=2[whole][headsrc]`,
      `[whole]atrim=start=${crossfadeSeconds}:end=${sourceSeconds},asetpts=PTS-STARTPTS[body]`,
      `[headsrc]atrim=start=0:end=${crossfadeSeconds},asetpts=PTS-STARTPTS[head]`,
      `[body][head]acrossfade=d=${crossfadeSeconds}:c1=qsin:c2=qsin,apad=whole_dur=${seconds},atrim=0:${seconds}[loop]`,
    ].join(";");

    run("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      source,
      "-filter_complex",
      graph,
      "-map",
      "[loop]",
      "-ar",
      "48000",
      "-ac",
      String(channels),
      "-c:a",
      "pcm_f32le",
      staged,
    ]);
    master(
      staged,
      output,
      name,
      channels,
      targetMean,
      targetPeak,
      "Original seamless environmental ambience loop",
    );

    const final = levels(output);
    console.log(
      `${name}.wav | ${duration(output).toFixed(3)}s seamless loop | ${channels === 1 ? "mono" : "stereo"} | mean ${final.mean.toFixed(1)} dBFS | peak ${final.peak.toFixed(1)} dBFS`,
    );
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
