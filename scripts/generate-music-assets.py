#!/usr/bin/env python3
"""Render the three original Math on Mars music loops.

The score and synths are intentionally self-contained: only Python's standard
library and ffmpeg are required.  Each arrangement is bar-locked, and every
effect is applied cyclically so the exported WAVs loop without a cut reverb
tail or a baked-in fade.
"""

from __future__ import annotations

import argparse
import array
import math
import os
import random
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path


SAMPLE_RATE = 48_000
TAU = math.tau
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "src" / "assets" / "music"


@dataclass(frozen=True)
class TrackSpec:
    key: str
    title: str
    bpm: float
    bars: int
    target_rms_db: float

    @property
    def beats(self) -> float:
        return self.bars * 4.0

    @property
    def duration(self) -> float:
        return self.beats * 60.0 / self.bpm


SPECS = {
    # Per-track RMS trims are calibrated to the same perceived result
    # (approximately -17.5 LUFS integrated) after each arrangement's master.
    "camp": TrackSpec("camp", "Home on Mars", 88.0, 36, -19.1),
    "battle": TrackSpec("battle", "Slime Patrol", 126.0, 48, -18.9),
    "boss": TrackSpec("boss", "The Slime Overmind", 144.0, 40, -18.1),
}


def midi_hz(note: float) -> float:
    return 440.0 * (2.0 ** ((note - 69.0) / 12.0))


def soft_clip(value: float) -> float:
    # Smooth saturation keeps layered oscillators clean without hard clipping.
    return value / (1.0 + 0.32 * abs(value))


def pan_gains(pan: float) -> tuple[float, float]:
    angle = (max(-1.0, min(1.0, pan)) + 1.0) * math.pi / 4.0
    return math.cos(angle), math.sin(angle)


class LoopMix:
    def __init__(self, spec: TrackSpec):
        self.spec = spec
        self.frames = round(spec.duration * SAMPLE_RATE)
        self.seconds = self.frames / SAMPLE_RATE
        self.left = array.array("f", [0.0]) * self.frames
        self.right = array.array("f", [0.0]) * self.frames

    def beat_seconds(self, beat: float) -> float:
        return beat * 60.0 / self.spec.bpm

    def _add_sample(self, index: int, left: float, right: float) -> None:
        index %= self.frames
        self.left[index] += left
        self.right[index] += right

    def tone(
        self,
        beat: float,
        beats: float,
        note: float,
        amp: float,
        pan: float,
        kind: str,
        attack: float = 0.012,
        release: float = 0.10,
        brightness: float = 1.0,
    ) -> None:
        start = round(self.beat_seconds(beat) * SAMPLE_RATE)
        duration = self.beat_seconds(beats)
        total = max(2, round(duration * SAMPLE_RATE))
        attack_n = max(1, round(min(attack, duration * 0.4) * SAMPLE_RATE))
        release_n = max(1, round(min(release, duration * 0.48) * SAMPLE_RATE))
        freq = midi_hz(note)
        left_gain, right_gain = pan_gains(pan)
        phase = 0.0
        phase2 = 0.0
        step = freq / SAMPLE_RATE
        step2 = freq * 1.006 / SAMPLE_RATE
        left = self.left
        right = self.right
        frames = self.frames
        idx = start % frames

        for i in range(total):
            if i < attack_n:
                env = math.sin((i / attack_n) * math.pi * 0.5) ** 2
            elif i >= total - release_n:
                env = math.sin(((total - i) / release_n) * math.pi * 0.5) ** 2
            else:
                env = 1.0

            sine = math.sin(TAU * phase)
            sine2 = math.sin(TAU * phase2)
            tri = 1.0 - 4.0 * abs((phase % 1.0) - 0.5)

            if kind == "pad":
                sample = 0.48 * sine + 0.32 * sine2 + 0.20 * tri
                sample *= 0.78 + 0.22 * math.sin(TAU * i / (SAMPLE_RATE * 3.7))
            elif kind == "pluck":
                decay = math.exp(-5.4 * i / total)
                sample = (0.58 * sine + 0.28 * tri + 0.14 * math.sin(TAU * phase * 2.0)) * decay
            elif kind == "bass":
                sample = 0.68 * sine + 0.32 * tri
                sample = soft_clip(sample * 1.25)
            elif kind == "lead":
                square = 1.0 if sine >= 0.0 else -1.0
                sample = 0.58 * sine + 0.27 * tri + 0.15 * square * brightness
                sample = soft_clip(sample * 1.08)
            elif kind == "arp":
                decay = 0.42 + 0.58 * math.exp(-7.0 * i / total)
                sample = (0.58 * tri + 0.30 * sine + 0.12 * math.sin(TAU * phase * 2.0)) * decay
            else:
                sample = sine

            value = amp * env * sample
            left[idx] += value * left_gain
            right[idx] += value * right_gain
            idx += 1
            if idx == frames:
                idx = 0
            phase += step
            phase2 += step2
            if phase >= 1.0:
                phase -= 1.0
            if phase2 >= 1.0:
                phase2 -= 1.0

    def kick(self, beat: float, amp: float = 0.34, weight: float = 1.0) -> None:
        start = round(self.beat_seconds(beat) * SAMPLE_RATE)
        total = round((0.24 + 0.05 * weight) * SAMPLE_RATE)
        phase = 0.0
        idx = start % self.frames
        for i in range(total):
            x = i / total
            freq = 43.0 + 92.0 * math.exp(-16.0 * x)
            phase += freq / SAMPLE_RATE
            env = math.exp(-8.2 * x)
            click = math.sin(TAU * phase * 2.7) * math.exp(-55.0 * x)
            sample = amp * (math.sin(TAU * phase) * env + 0.12 * click)
            self.left[idx] += sample * 0.72
            self.right[idx] += sample * 0.72
            idx = (idx + 1) % self.frames

    def snare(self, beat: float, amp: float = 0.22, pan: float = 0.0) -> None:
        start = round(self.beat_seconds(beat) * SAMPLE_RATE)
        total = round(0.17 * SAMPLE_RATE)
        seed = int((beat + 17.0) * 10007) & 0xFFFFFFFF
        rng = random.Random(seed)
        prev = 0.0
        left_gain, right_gain = pan_gains(pan)
        idx = start % self.frames
        for i in range(total):
            x = i / total
            raw = rng.uniform(-1.0, 1.0)
            high = raw - 0.72 * prev
            prev = raw
            tone = math.sin(TAU * 185.0 * i / SAMPLE_RATE)
            env = math.exp(-10.0 * x)
            sample = amp * env * (0.74 * high + 0.26 * tone)
            self.left[idx] += sample * left_gain
            self.right[idx] += sample * right_gain
            idx = (idx + 1) % self.frames

    def hat(self, beat: float, amp: float = 0.065, open_hat: bool = False, pan: float = 0.0) -> None:
        start = round(self.beat_seconds(beat) * SAMPLE_RATE)
        seconds = 0.12 if open_hat else 0.045
        total = round(seconds * SAMPLE_RATE)
        seed = int((beat + 31.0) * 20011) & 0xFFFFFFFF
        rng = random.Random(seed)
        prev = 0.0
        left_gain, right_gain = pan_gains(pan)
        idx = start % self.frames
        for i in range(total):
            x = i / total
            raw = rng.uniform(-1.0, 1.0)
            high = raw - prev
            prev = raw
            env = math.exp(-(5.8 if open_hat else 11.0) * x)
            sample = amp * env * high
            self.left[idx] += sample * left_gain
            self.right[idx] += sample * right_gain
            idx = (idx + 1) % self.frames

    def tom(self, beat: float, note: float, amp: float, pan: float) -> None:
        start = round(self.beat_seconds(beat) * SAMPLE_RATE)
        total = round(0.22 * SAMPLE_RATE)
        freq = midi_hz(note)
        left_gain, right_gain = pan_gains(pan)
        phase = 0.0
        idx = start % self.frames
        for i in range(total):
            x = i / total
            phase += (freq * (1.0 + 0.18 * math.exp(-10.0 * x))) / SAMPLE_RATE
            sample = amp * math.sin(TAU * phase) * math.exp(-7.5 * x)
            self.left[idx] += sample * left_gain
            self.right[idx] += sample * right_gain
            idx = (idx + 1) % self.frames

    def impact(self, beat: float, amp: float = 0.38) -> None:
        # Musical entrance accent: low synth chord + electronic percussion, not an SFX sample.
        self.kick(beat, amp=amp, weight=1.3)
        self.tone(beat, 0.72, 40, amp * 0.48, -0.25, "bass", attack=0.002, release=0.22)
        self.tone(beat, 0.60, 47, amp * 0.35, 0.25, "bass", attack=0.002, release=0.18)
        self.hat(beat, amp=amp * 0.28, open_hat=True)

    def cyclic_delay(self, seconds: float, gain: float, cross: float = 0.0) -> None:
        delay = round(seconds * SAMPLE_RATE) % self.frames
        source_l = array.array("f", self.left)
        source_r = array.array("f", self.right)
        for i in range(self.frames):
            target = (i + delay) % self.frames
            self.left[target] += gain * ((1.0 - cross) * source_l[i] + cross * source_r[i])
            self.right[target] += gain * ((1.0 - cross) * source_r[i] + cross * source_l[i])

    def finalize(self) -> tuple[float, float, float]:
        # Remove microscopic DC, match RMS, then constrain peak with one global gain.
        mean_l = sum(self.left) / self.frames
        mean_r = sum(self.right) / self.frames
        energy = 0.0
        peak = 0.0
        for i in range(self.frames):
            l = self.left[i] - mean_l
            r = self.right[i] - mean_r
            self.left[i] = l
            self.right[i] = r
            energy += 0.5 * (l * l + r * r)
            peak = max(peak, abs(l), abs(r))
        rms = math.sqrt(energy / self.frames)
        target_rms = 10.0 ** (self.spec.target_rms_db / 20.0)
        gain = target_rms / max(rms, 1e-9)
        ceiling = 10.0 ** (-1.5 / 20.0)

        # A gentle tanh mastering stage controls isolated drum transients while
        # preserving the loop boundary. Iterate the makeup gain to match all
        # three tracks to the same RMS target without peak normalization.
        for _ in range(3):
            trial_energy = 0.0
            for i in range(self.frames):
                l = ceiling * math.tanh(self.left[i] * gain / ceiling)
                r = ceiling * math.tanh(self.right[i] * gain / ceiling)
                trial_energy += 0.5 * (l * l + r * r)
            trial_rms = math.sqrt(trial_energy / self.frames)
            gain *= target_rms / max(trial_rms, 1e-9)

        out_energy = 0.0
        out_peak = 0.0
        for i in range(self.frames):
            l = ceiling * math.tanh(self.left[i] * gain / ceiling)
            r = ceiling * math.tanh(self.right[i] * gain / ceiling)
            self.left[i] = l
            self.right[i] = r

        # Bridge only the final 12 ms toward the opening sample. This is not a
        # fade: it is a smooth, inaudible endpoint correction that makes the
        # last and first PCM samples identical even at a percussion boundary.
        bridge = round(0.012 * SAMPLE_RATE)
        delta_l = self.left[0] - self.left[-1]
        delta_r = self.right[0] - self.right[-1]
        for offset in range(bridge):
            u = (offset + 1) / bridge
            smooth = u * u * (3.0 - 2.0 * u)
            index = self.frames - bridge + offset
            self.left[index] = max(-ceiling, min(ceiling, self.left[index] + delta_l * smooth))
            self.right[index] = max(-ceiling, min(ceiling, self.right[index] + delta_r * smooth))

        for i in range(self.frames):
            l = self.left[i]
            r = self.right[i]
            out_energy += 0.5 * (l * l + r * r)
            out_peak = max(out_peak, abs(l), abs(r))
        out_rms = math.sqrt(out_energy / self.frames)
        seam = max(abs(self.left[0] - self.left[-1]), abs(self.right[0] - self.right[-1]))
        return 20.0 * math.log10(out_rms), 20.0 * math.log10(out_peak), seam

    def export(self, path: Path) -> tuple[float, float, float]:
        metrics = self.finalize()
        path.parent.mkdir(parents=True, exist_ok=True)
        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            raise RuntimeError("ffmpeg is required to encode 24-bit WAV files")

        with tempfile.NamedTemporaryFile(prefix=f"{self.spec.key}-", suffix=".f32", delete=False) as handle:
            raw_path = Path(handle.name)
            chunk = 32_768
            for start in range(0, self.frames, chunk):
                end = min(self.frames, start + chunk)
                interleaved = array.array("f")
                interleaved.extend(
                    value
                    for pair in zip(self.left[start:end], self.right[start:end])
                    for value in pair
                )
                if sys.byteorder != "little":
                    interleaved.byteswap()
                handle.write(interleaved.tobytes())

        try:
            subprocess.run(
                [
                    ffmpeg,
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-y",
                    "-f",
                    "f32le",
                    "-ar",
                    str(SAMPLE_RATE),
                    "-ac",
                    "2",
                    "-i",
                    str(raw_path),
                    "-c:a",
                    "pcm_s24le",
                    "-metadata",
                    f"title={self.spec.title}",
                    "-metadata",
                    "artist=Math on Mars",
                    "-metadata",
                    "comment=Original seamless game music loop",
                    str(path),
                ],
                check=True,
            )
        finally:
            raw_path.unlink(missing_ok=True)
        return metrics


CHORDS = [
    (52, 55, 59, 62),  # Em7
    (48, 52, 55, 59),  # Cmaj7
    (43, 47, 50, 52),  # G6
    (50, 55, 57, 62),  # Dsus4/A
]
ROOTS = [40, 36, 43, 38]
MOTIF = [64, 67, 69, 71, 69, 67, 64, 62]  # E-G-A-B-A-G-E-D: the Mars beacon


def add_camp(spec: TrackSpec) -> LoopMix:
    mix = LoopMix(spec)
    for bar in range(spec.bars):
        base = bar * 4.0
        chord = CHORDS[bar % 4]
        root = ROOTS[bar % 4]
        cycle = bar // 4

        for voice, note in enumerate(chord):
            mix.tone(base - 0.04, 4.22, note, 0.040, -0.62 + voice * 0.41, "pad", attack=0.16, release=0.34)
        mix.tone(base, 1.72, root, 0.082, -0.08, "bass", attack=0.035, release=0.24)
        mix.tone(base + 2.0, 1.66, root + (7 if bar % 4 == 3 else 12), 0.062, 0.08, "bass", attack=0.035, release=0.22)

        # Soft clockwork plucks keep the camp curious without pushing forward.
        arp = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 12]
        for step, note in enumerate(arp):
            pan = -0.38 if step % 2 == 0 else 0.38
            mix.tone(base + step + 0.5, 0.54, note, 0.055, pan, "pluck", release=0.12)

        mix.kick(base, amp=0.092)
        mix.hat(base + 1.5, amp=0.023, pan=-0.28)
        mix.snare(base + 2.0, amp=0.045, pan=0.18)
        mix.hat(base + 3.5, amp=0.020, pan=0.28)

        if bar % 4 in (0, 2):
            phrase = MOTIF[:4] if bar % 4 == 0 else MOTIF[4:]
            variant = 12 if cycle in (2, 6) and bar % 4 == 2 else 0
            for step, note in enumerate(phrase):
                length = 0.66 if step < 3 else 1.05
                mix.tone(base + step, length, note + variant, 0.082, -0.18 + step * 0.12, "lead", attack=0.018, release=0.18, brightness=0.35)

    mix.cyclic_delay(0.285, 0.095, cross=0.45)
    mix.cyclic_delay(0.515, 0.050, cross=0.25)
    return mix


def add_battle(spec: TrackSpec) -> LoopMix:
    mix = LoopMix(spec)
    for bar in range(spec.bars):
        base = bar * 4.0
        chord = CHORDS[bar % 4]
        root = ROOTS[bar % 4]
        section = (bar // 8) % 3

        # Compact chord stabs and sparse arps preserve space for blasters/warnings.
        for beat in (0.0, 2.5):
            for voice, note in enumerate(chord[1:]):
                mix.tone(base + beat, 0.38, note + 12, 0.035, -0.46 + voice * 0.46, "pluck", release=0.08)

        bass_pattern = [0.0, 0.5, 1.5, 2.0, 2.75, 3.5]
        if section == 1:
            bass_pattern = [0.0, 0.5, 1.0, 1.75, 2.0, 2.5, 3.25, 3.75]
        for step, offset in enumerate(bass_pattern):
            note = root + (12 if step in (2, 5) else 0)
            mix.tone(base + offset, 0.38, note, 0.105, -0.06, "bass", attack=0.004, release=0.07)

        arp_notes = [chord[0] + 24, chord[1] + 24, chord[2] + 24, chord[1] + 24]
        for step in range(8):
            if section == 2 and step in (3, 7):
                continue
            note = arp_notes[(step + (bar % 2)) % 4]
            mix.tone(base + step * 0.5 + 0.25, 0.26, note, 0.042, -0.42 if step % 2 == 0 else 0.42, "arp", release=0.045)

        # Groove is present from beat zero and changes at each eight-bar section.
        for beat in (0.0, 2.0):
            mix.kick(base + beat, amp=0.245)
        if section == 1:
            mix.kick(base + 3.5, amp=0.17)
        elif section == 2 and bar % 2:
            mix.kick(base + 1.5, amp=0.15)
        mix.snare(base + 1.0, amp=0.155, pan=-0.08)
        mix.snare(base + 3.0, amp=0.168, pan=0.08)
        for step in range(8):
            mix.hat(base + step * 0.5, amp=0.047 if step % 2 else 0.034, open_hat=(step == 7 and bar % 4 == 3), pan=-0.22 if step % 2 == 0 else 0.22)

        # Short hooks answer the common motif without monopolizing the midrange.
        if bar % 4 in (0, 2):
            phrase = MOTIF[:4] if bar % 4 == 0 else MOTIF[4:]
            rhythm = [0.0, 0.75, 1.5, 2.5]
            for step, note in enumerate(phrase):
                octave = 12 if section == 2 and step == 3 else 0
                mix.tone(base + rhythm[step], 0.42, note + octave, 0.095, -0.26 + 0.17 * step, "lead", attack=0.005, release=0.08, brightness=0.62)

        if bar % 8 == 7:
            mix.tom(base + 3.0, 48, 0.13, -0.45)
            mix.tom(base + 3.25, 50, 0.13, -0.15)
            mix.tom(base + 3.5, 52, 0.14, 0.20)
            mix.tom(base + 3.75, 55, 0.15, 0.48)

    mix.cyclic_delay(0.190, 0.072, cross=0.58)
    return mix


def add_boss(spec: TrackSpec) -> LoopMix:
    mix = LoopMix(spec)
    dramatic = [64, 67, 76, 71, 69, 79, 64, 74]
    boss_chords = [
        (40, 47, 52, 55),
        (39, 47, 51, 54),
        (36, 43, 48, 52),
        (38, 45, 50, 55),
    ]
    boss_roots = [28, 27, 24, 26]

    for bar in range(spec.bars):
        base = bar * 4.0
        chord = boss_chords[bar % 4]
        root = boss_roots[bar % 4]
        section = (bar // 8) % 5

        if bar % 8 == 0:
            mix.impact(base, amp=0.39 if bar == 0 else 0.31)

        for voice, note in enumerate(chord[1:]):
            mix.tone(base, 1.35, note + 12, 0.045, -0.52 + voice * 0.52, "pad", attack=0.016, release=0.20)
            mix.tone(base + 2.0, 1.30, note + 12, 0.038, 0.52 - voice * 0.52, "pad", attack=0.012, release=0.17)

        bass_pattern = [0.0, 0.5, 1.0, 1.75, 2.0, 2.5, 3.0, 3.5]
        for step, offset in enumerate(bass_pattern):
            note = root + (12 if step in (2, 5, 7) else 0)
            mix.tone(base + offset, 0.34, note, 0.12, -0.02, "bass", attack=0.002, release=0.055)

        tense = [chord[1] + 24, chord[2] + 24, chord[3] + 24, chord[2] + 24]
        for step in range(16):
            note = tense[(step + bar) % 4]
            if section == 3 and step % 4 == 3:
                note += 12
            mix.tone(base + step * 0.25, 0.16, note, 0.039, -0.55 if step % 2 == 0 else 0.55, "arp", release=0.025)

        # Heavy but tidy drums: urgency without horror/noise-wall density.
        for offset in (0.0, 1.5, 2.0, 3.25):
            mix.kick(base + offset, amp=0.275 if offset in (0.0, 2.0) else 0.19, weight=1.15)
        mix.snare(base + 1.0, amp=0.185, pan=-0.10)
        mix.snare(base + 3.0, amp=0.205, pan=0.10)
        for step in range(8):
            mix.hat(base + step * 0.5, amp=0.052 if step % 2 else 0.037, open_hat=(step == 7), pan=-0.30 if step % 2 == 0 else 0.30)

        if bar % 4 in (0, 2):
            phrase = dramatic[:4] if bar % 4 == 0 else dramatic[4:]
            starts = [0.0, 0.5, 1.25, 2.25]
            for step, note in enumerate(phrase):
                mix.tone(base + starts[step], 0.55 if step < 3 else 1.10, note, 0.125, -0.34 + step * 0.22, "lead", attack=0.003, release=0.11, brightness=0.78)

        if bar % 8 == 7:
            for step, note in enumerate((45, 48, 50, 52)):
                mix.tom(base + 3.0 + step * 0.25, note, 0.16, -0.55 + step * 0.36)

    mix.cyclic_delay(0.145, 0.064, cross=0.52)
    mix.cyclic_delay(0.292, 0.035, cross=0.30)
    return mix


BUILDERS = {"camp": add_camp, "battle": add_battle, "boss": add_boss}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--track", choices=["all", *SPECS], default="all")
    args = parser.parse_args()
    selected = list(SPECS) if args.track == "all" else [args.track]

    for key in selected:
        spec = SPECS[key]
        print(f"Composing {spec.title}: {spec.bars} bars, {spec.bpm:g} BPM, {spec.duration:.6f}s", flush=True)
        mix = BUILDERS[key](spec)
        path = args.output / f"music_{key}.wav"
        rms_db, peak_db, seam = mix.export(path)
        print(f"Wrote {path} | RMS {rms_db:.2f} dBFS | peak {peak_db:.2f} dBFS | seam delta {seam:.6f}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
