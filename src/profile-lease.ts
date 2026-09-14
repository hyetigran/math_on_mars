interface ProfileLockManager {
  request(
    name: string,
    options: { ifAvailable: true; mode: "exclusive" },
    callback: (lock: object | null) => Promise<void>,
  ): Promise<unknown>;
}
/** Browser-wide ownership; revision checks remain authoritative when locks are unavailable. */
export class ProfileLease {
  private heldId?: string;
  private releaseHeld?: () => void;
  private generation = 0;
  constructor(
    private readonly manager?: ProfileLockManager,
    private readonly namespace = "math-on-mars",
  ) {}
  async acquire(id: string): Promise<boolean> {
    if (this.heldId === id) return true;
    this.release();
    if (!this.manager) return true;
    const generation = this.generation;
    return new Promise<boolean>((resolve, reject) => {
      void this.manager!.request(
        `${this.namespace}:profile:${id}`,
        { ifAvailable: true, mode: "exclusive" },
        async (lock) => {
          if (!lock || generation !== this.generation) {
            resolve(false);
            return;
          }
          const held = new Promise<void>((release) => {
            this.releaseHeld = release;
          });
          this.heldId = id;
          resolve(true);
          await held;
        },
      ).catch(reject);
    });
  }
  release(): void {
    this.generation++;
    this.releaseHeld?.();
    this.releaseHeld = undefined;
    this.heldId = undefined;
  }
}
