import { battleAudioUrl } from "./assets/battleAssets";

let context: AudioContext | undefined;
const buffers = new Map<string, Promise<AudioBuffer | undefined>>();
function audioContext(): AudioContext {
  if (!context) {
    context = new AudioContext();
  }
  return context;
}

// Prime the context during the portal/start gesture, before Phaser's async loader.
const unlockAudio = () => {
  try {
    void audioContext()
      .resume()
      .catch(() => {});
  } catch {
    /* Optional audio. */
  }
};
window.addEventListener("pointerdown", unlockAudio);
window.addEventListener("keydown", unlockAudio);

/** Presentation-only audio: never advances simulation or consumes its RNG. */
export class BattleAudio {
  private active = true;
  private disposed = false;
  private generation = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private lastPlayed = new Map<string, number>();
  private track: string;
  private loops = new Map<
    AudioBufferSourceNode,
    { name: string; started: number; offset: number }
  >();
  private offsets = new Map<string, number>();
  private ctx: AudioContext | undefined;

  constructor(boss: boolean) {
    this.track = boss ? "music_boss" : "music_battle";
    try {
      this.ctx = audioContext();
    } catch {
      /* Audio is optional. */
    }
    void this.ctx?.resume().catch(() => {});
    this.startLoops();
    this.play("wave_start");
  }

  private async buffer(name: string): Promise<AudioBuffer | undefined> {
    const url = battleAudioUrl(name);
    if (!url || !this.ctx) return;
    if (!buffers.has(name)) {
      buffers.set(
        name,
        fetch(url)
          .then((response) =>
            response.ok ? response.arrayBuffer() : Promise.reject(),
          )
          .then((data) => this.ctx!.decodeAudioData(data))
          .catch(() => undefined),
      );
    }
    return buffers.get(name);
  }

  private async start(
    name: string,
    volume: number,
    loop: boolean,
    outro = false,
  ): Promise<void> {
    const generation = this.generation;
    const buffer = await this.buffer(name);
    if (
      !buffer ||
      !this.ctx ||
      generation !== this.generation ||
      (!outro && (!this.active || this.disposed))
    )
      return;
    // Do not accumulate effects behind the browser's audio unlock gate.
    if (!loop && this.ctx.state !== "running") return;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    source.loop = loop;
    gain.gain.value = volume;
    source.connect(gain).connect(this.ctx.destination);
    if (!outro) this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      this.loops.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    const offset = loop ? (this.offsets.get(name) ?? 0) % buffer.duration : 0;
    if (loop)
      this.loops.set(source, { name, started: this.ctx.currentTime, offset });
    source.start(0, offset);
  }

  play(name: string, volume = 0.45, cooldownMs = 100): void {
    if (!this.active || this.disposed) return;
    const now = performance.now();
    if (now - (this.lastPlayed.get(name) ?? -Infinity) < cooldownMs) return;
    this.lastPlayed.set(name, now);
    void this.start(name, volume, false);
  }

  private startLoops(): void {
    void this.start(this.track, 0.24, true);
    void this.start("amb_mars_wind", 0.12, true);
  }

  private stopSources(): void {
    this.generation++;
    for (const source of this.sources) {
      const loop = this.loops.get(source);
      if (loop && this.ctx)
        this.offsets.set(
          loop.name,
          loop.offset + this.ctx.currentTime - loop.started,
        );
      source.stop();
    }
    this.sources.clear();
  }

  pause(): void {
    this.active = false;
    this.stopSources();
  }
  resume(): void {
    if (this.active || this.disposed) return;
    this.active = true;
    this.startLoops();
  }
  finish(defeat: boolean, finalWave: boolean): void {
    this.pause();
    // Terminal effects can finish after the arena is replaced by its overlay.
    if (defeat || finalWave)
      void this.start(
        defeat ? "marine_shutdown" : "overmind_death",
        0.4,
        false,
        true,
      );
    void this.start(
      defeat ? "mission_defeat" : finalWave ? "mission_victory" : "wave_clear",
      0.55,
      false,
      true,
    );
  }
  destroy(): void {
    this.disposed = true;
    if (this.active) this.pause();
  }
}
