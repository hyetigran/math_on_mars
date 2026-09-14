/** Serial background saves. Coalesce waiting snapshots; retain an exact failed job for retry. */
export class CheckpointQueue {
  private pending?: () => Promise<void>;
  private failed?: () => Promise<void>;
  private error?: unknown;
  private running?: Promise<void>;
  constructor(private readonly onError: (error: unknown) => void) {}
  enqueue(job: () => Promise<void>): void {
    this.pending = job;
    if (!this.running && !this.failed) this.start();
  }
  private start(retry?: () => Promise<void>): void {
    this.running = this.pump(retry);
    void this.running.catch((error) => this.onError(error));
  }
  private async pump(retry?: () => Promise<void>): Promise<void> {
    let job = retry ?? this.pending;
    if (!retry) this.pending = undefined;
    try {
      while (job) {
        try {
          await job();
        } catch (error) {
          this.failed = job;
          this.error = error;
          throw error;
        }
        job = this.pending;
        this.pending = undefined;
      }
    } finally {
      this.running = undefined;
    }
  }
  async drain(retry = false): Promise<void> {
    if (this.failed) {
      if (!retry) throw this.error;
      const job = this.failed;
      this.failed = undefined;
      this.error = undefined;
      this.start(job);
    }
    if (this.running) await this.running;
  }
}
