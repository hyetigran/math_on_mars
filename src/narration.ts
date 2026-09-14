import { NARRATION_CLIPS } from "./narration-manifest";
export { NARRATION_CLIPS } from "./narration-manifest";

/** Installed audio only. Decode before exposing the timed task; playback never locks input. */
export class InstalledNarration {
  private context?: AudioContext;
  private buffers = new Map<string, AudioBuffer>();
  private loading?: Promise<void>;
  private sources: AudioBufferSourceNode[] = [];
  private generation = 0;
  get ready(): boolean {
    return this.buffers.size === NARRATION_CLIPS.length;
  }
  get playable(): boolean {
    return this.ready && this.context?.state === "running";
  }
  async enable(): Promise<void> {
    if (!this.context) throw new Error("Load speech first.");
    await this.context.resume();
  }
  async load(): Promise<void> {
    if (this.ready) return Promise.resolve();
    if (this.loading) return this.loading;
    this.context ??= new AudioContext();
    const context = this.context;
    this.loading = Promise.all(
      NARRATION_CLIPS.map(async (id) => {
        if (this.buffers.has(id)) return;
        const response = await fetch(`/audio/k1/${id}.mp3`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok)
          throw new Error("Installed narration could not be loaded.");
        const buffer = await context.decodeAudioData(
          await response.arrayBuffer(),
        );
        this.buffers.set(id, buffer);
      }),
    )
      .then(() => undefined)
      .finally(() => {
        this.loading = undefined;
      });
    return this.loading;
  }
  stop(): void {
    this.generation++;
    for (const source of this.sources) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    this.sources = [];
  }
  async play(ids: string[], status: (message: string) => void): Promise<void> {
    this.stop();
    const generation = this.generation;
    const context = this.context;
    if (!context || ids.some((id) => !this.buffers.has(id))) {
      status("Speech is unavailable. Reload the task to try again.");
      return;
    }
    status("If you cannot hear the task, tap Replay.");
    try {
      await context.resume();
      if (generation !== this.generation) return;
      let start = context.currentTime;
      for (const id of ids) {
        const source = context.createBufferSource();
        source.buffer = this.buffers.get(id)!;
        source.connect(context.destination);
        source.start(start);
        start += source.buffer.duration;
        this.sources.push(source);
      }
      const last = this.sources.at(-1);
      if (last)
        last.onended = () => {
          if (generation !== this.generation) return;
          this.sources.forEach((source) => source.disconnect());
          this.sources = [];
          status("Replay is available.");
        };
      status("Reading the task. You can answer now.");
    } catch {
      if (generation === this.generation)
        status("Tap Replay to enable speech.");
    }
  }
}
