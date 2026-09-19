import {
  campBackgroundUrl,
  splashUrl,
  marineManifestUrl,
  marineSheetUrl,
} from "./assets/campAssets";
export { splashUrl } from "./assets/campAssets";
import { loadBoundaries } from "./camp-boundaries";
import {
  CAMP_HEIGHT,
  CAMP_WIDTH,
  CAMP_SPAWN,
  CAMP_PORTAL,
  campCamera,
  facing,
  moveInCamp,
  nearPortal,
  type Direction,
  type Point,
} from "./camp-world";

interface Animation {
  direction: Direction;
  image: string;
  idleImage: string;
  jumpImage: string;
  runningJumpImage: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  frameCount: number;
  stride: number;
  framePivots: Point[];
  idlePivot: Point;
  jumpColumns: number;
  jumpFrameCount: number;
  jumpFps: number;
  jumpDisplayScale: number;
  jumpPivots: Point[];
  runningJumpColumns: number;
  runningJumpFrameCount: number;
  runningJumpFps: number;
  runningJumpDisplayScale: number;
  runningJumpPivots: Point[];
}
interface CampAssets {
  background: HTMLImageElement;
  animations: Map<
    Direction,
    Animation & {
      sheet: HTMLImageElement;
      idleSheet: HTMLImageElement;
      jumpSheet: HTMLImageElement;
      runningJumpSheet: HTMLImageElement;
    }
  >;
}
let assets: CampAssets | undefined;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(
      () =>
        finish(
          new Error("Loading timed out. Check your connection and retry."),
        ),
      30000,
    );
    function finish(error?: Error) {
      window.clearTimeout(timeout);
      image.onload = image.onerror = null;
      if (error) reject(error);
      else resolve(image);
    }
    image.onload = () => {
      void image.decode().then(
        () => finish(),
        () => finish(new Error("Could not decode camp artwork.")),
      );
    };
    image.onerror = () =>
      finish(
        new Error(
          "Could not load camp artwork. Check your connection and retry.",
        ),
      );
    image.src = url;
  });
}

export async function loadCampAssets(
  progress: (fraction: number) => void,
): Promise<void> {
  if (assets) {
    progress(1);
    return;
  }
  const response = await fetch(marineManifestUrl, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("Could not load the marine animations.");
  const manifest = (await response.json()) as Animation[];
  let complete = 0;
  const loaded = () => progress(++complete / (manifest.length * 4 + 2));
  const background = loadImage(campBackgroundUrl).then((image) => {
    loaded();
    return image;
  });
  const splash = loadImage(splashUrl).then(loaded);
  const animations = new Map<
    Direction,
    Animation & {
      sheet: HTMLImageElement;
      idleSheet: HTMLImageElement;
      jumpSheet: HTMLImageElement;
      runningJumpSheet: HTMLImageElement;
    }
  >();
  await Promise.all([
    background,
    splash,
    ...manifest.map(async (animation) => {
      const [sheet, idleSheet, jumpSheet, runningJumpSheet] = await Promise.all(
        [
          loadImage(marineSheetUrl(animation.image)).then((image) => {
            loaded();
            return image;
          }),
          loadImage(marineSheetUrl(animation.idleImage)).then((image) => {
            loaded();
            return image;
          }),
          loadImage(marineSheetUrl(animation.jumpImage)).then((image) => {
            loaded();
            return image;
          }),
          loadImage(marineSheetUrl(animation.runningJumpImage)).then(
            (image) => {
              loaded();
              return image;
            },
          ),
        ],
      );
      animations.set(animation.direction, {
        ...animation,
        sheet,
        idleSheet,
        jumpSheet,
        runningJumpSheet,
      });
    }),
  ]);
  assets = { background: await background, animations };
}

/** A quiet exploration scene; combat remains owned by CombatController. */
export class BaseCampController {
  private boundaries = loadBoundaries();
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private bubble: HTMLButtonElement;
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private abort = new AbortController();
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private lastTime = 0;
  private walkDistance = 0;
  private jumpElapsed: number | null = null;
  private runningJump = false;
  private position: Point = { ...CAMP_SPAWN };
  private cameraFocus: Point = { ...CAMP_SPAWN };
  private direction: Direction = "s";
  private keys = new Set<string>();
  private touch: Point = { x: 0, y: 0 };
  private stopped = false;
  private nearby = false;
  private width = 0;
  private height = 0;
  private ratio = 1;
  private resetStick = () => {};

  constructor(
    private host: HTMLElement,
    private onEnter: () => void,
  ) {
    if (!assets) throw new Error("Camp assets have not finished loading.");
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute(
      "aria-label",
      "Base camp. Move with WASD or arrow keys, and jump with Space. Approach the north portal and press E to enter the arena.",
    );
    this.canvas.tabIndex = 0;
    this.canvas.className = "camp-canvas";
    this.context = this.canvas.getContext("2d")!;
    this.bubble = document.createElement("button");
    this.bubble.className = "portal-bubble";
    this.bubble.textContent = "E";
    this.bubble.setAttribute("aria-label", "Enter arena");
    this.bubble.hidden = true;
    host.append(this.canvas, this.bubble);
    const { signal } = this.abort;
    this.bubble.addEventListener("click", () => this.enter(), { signal });
    window.addEventListener(
      "keydown",
      (event) => {
        if (
          this.stopped ||
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLSelectElement ||
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLButtonElement ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        )
          return;
        const key = event.key.toLowerCase();
        if (
          [
            "w",
            "a",
            "s",
            "d",
            "arrowup",
            "arrowdown",
            "arrowleft",
            "arrowright",
          ].includes(key)
        ) {
          event.preventDefault();
          this.keys.add(key);
        }
        if (key === "e" && !event.repeat) {
          event.preventDefault();
          this.enter();
        }
        if (event.code === "Space" && !event.repeat) {
          event.preventDefault();
          this.startJump();
        }
      },
      { signal },
    );
    window.addEventListener(
      "keyup",
      (event) => this.keys.delete(event.key.toLowerCase()),
      { signal },
    );
    window.addEventListener("blur", () => this.clearInput(), { signal });
    document.addEventListener(
      "visibilitychange",
      () => {
        this.clearInput();
        this.lastTime = 0;
      },
      { signal },
    );
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.frame = requestAnimationFrame((time) => this.update(time));
  }

  bindJoystick(zone: HTMLElement, knob: HTMLElement): void {
    let pointer: number | null = null;
    let origin: Point = { x: 0, y: 0 };
    const { signal } = this.abort;
    const move = (event: PointerEvent) => {
      if (pointer !== event.pointerId || this.stopped) return;
      const x = (event.clientX - origin.x) / 38;
      const y = (event.clientY - origin.y) / 38;
      const length = Math.max(1, Math.hypot(x, y));
      this.touch = { x: x / length, y: y / length };
      knob.style.transform = `translate(${this.touch.x * 32}px, ${this.touch.y * 32}px)`;
    };
    zone.addEventListener(
      "pointerdown",
      (event) => {
        if (pointer !== null || this.stopped) return;
        pointer = event.pointerId;
        origin = { x: event.clientX, y: event.clientY };
        zone.setPointerCapture(pointer);
        move(event);
      },
      { signal },
    );
    zone.addEventListener("pointermove", move, { signal });
    this.resetStick = () => {
      const held = pointer;
      pointer = null;
      if (held !== null && zone.hasPointerCapture(held))
        zone.releasePointerCapture(held);
      this.touch = { x: 0, y: 0 };
      knob.style.transform = "none";
    };
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
      zone.addEventListener(
        name,
        (event) => {
          if ((event as PointerEvent).pointerId === pointer) this.resetStick();
        },
        { signal },
      );
    }
  }

  setPaused(paused: boolean): void {
    this.stopped = paused;
    this.bubble.disabled = paused;
    this.clearInput();
    if (paused) {
      this.jumpElapsed = null;
      this.runningJump = false;
    }
  }

  private startJump(): void {
    if (this.stopped || this.jumpElapsed !== null) return;
    this.runningJump =
      this.keys.has("w") ||
      this.keys.has("a") ||
      this.keys.has("s") ||
      this.keys.has("d") ||
      this.keys.has("arrowup") ||
      this.keys.has("arrowdown") ||
      this.keys.has("arrowleft") ||
      this.keys.has("arrowright") ||
      Math.hypot(this.touch.x, this.touch.y) > 0.1;
    this.jumpElapsed = 0;
  }

  private clearInput(): void {
    this.keys.clear();
    this.resetStick();
  }

  private enter(): void {
    if (this.stopped || !nearPortal(this.position)) return;
    this.setPaused(true);
    this.onEnter();
  }

  private resize(): void {
    this.width = this.host.clientWidth;
    this.height = this.host.clientHeight;
    this.ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.ratio);
    this.canvas.height = Math.round(this.height * this.ratio);
  }

  private update(time: number): void {
    const seconds = this.lastTime
      ? Math.min((time - this.lastTime) / 1000, 0.05)
      : 0;
    this.lastTime = time;
    const pressed = (...keys: string[]) =>
      keys.some((key) => this.keys.has(key)) ? 1 : 0;
    const input =
      this.stopped || document.hidden
        ? { x: 0, y: 0 }
        : {
            x:
              pressed("d", "arrowright") -
              pressed("a", "arrowleft") +
              this.touch.x,
            y:
              pressed("s", "arrowdown") -
              pressed("w", "arrowup") +
              this.touch.y,
          };
    const next = moveInCamp(this.position, input, seconds, this.boundaries);
    const distance = Math.hypot(
      next.x - this.position.x,
      next.y - this.position.y,
    );
    const walking = distance > 0.01;
    if (Math.hypot(input.x, input.y) > 0.1)
      this.direction = facing(input.x, input.y);
    this.position = next;
    const follow = 1 - Math.exp(-10 * seconds);
    this.cameraFocus.x += (next.x - this.cameraFocus.x) * follow;
    this.cameraFocus.y += (next.y - this.cameraFocus.y) * follow;
    // Actual ground travel drives the gait, including slow joystick movement.
    this.walkDistance = walking ? this.walkDistance + distance : 0;
    if (this.jumpElapsed !== null) {
      this.jumpElapsed += seconds;
      const animation = assets!.animations.get(this.direction)!;
      const frameCount = this.runningJump
        ? animation.runningJumpFrameCount
        : animation.jumpFrameCount;
      const fps = this.runningJump
        ? animation.runningJumpFps
        : animation.jumpFps;
      // Procedural sheets include a duplicate endpoint so their first and last
      // poses match. End after the authored intervals, before holding that
      // duplicate frame for an extra tick.
      if (this.jumpElapsed >= (frameCount - 1) / fps) {
        this.jumpElapsed = null;
        this.runningJump = false;
      }
    }
    this.draw(walking, this.jumpElapsed !== null);
    this.frame = requestAnimationFrame((nextTime) => this.update(nextTime));
  }

  private draw(walking: boolean, jumping: boolean): void {
    if (!this.width || !this.height) return;
    const ctx = this.context;
    const { scale, offsetX, offsetY } = campCamera(
      this.width,
      this.height,
      this.cameraFocus,
    );
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.fillStyle = "#201819";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.drawImage(assets!.background, 0, 0, CAMP_WIDTH, CAMP_HEIGHT);
    // Light belongs to the doorway and ramp, underneath the marine.
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    // A slow breathing glow; keep it steady when reduced motion is requested.
    ctx.globalAlpha = this.reducedMotion.matches
      ? 0.8
      : 0.7 + 0.3 * Math.sin((this.lastTime / 2800) * Math.PI * 2);
    ctx.translate(CAMP_PORTAL.x, CAMP_PORTAL.y - 96);
    ctx.scale(1, 1.1);
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 105);
    glow.addColorStop(0, "rgba(110, 245, 255, 0.72)");
    glow.addColorStop(0.45, "rgba(25, 205, 245, 0.42)");
    glow.addColorStop(1, "rgba(25, 205, 245, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-105, -105, 210, 210);
    ctx.restore();
    // A beacon points at the doorway, or toward it when it is above the camera.
    const beaconY = offsetY + (CAMP_PORTAL.y - 170) * scale;
    const offscreen = beaconY < 75;
    const bob = this.reducedMotion.matches
      ? 0
      : Math.sin((this.lastTime / 1800) * Math.PI * 2) * 4;
    ctx.save();
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.translate(
      Math.max(28, Math.min(this.width - 28, offsetX + CAMP_PORTAL.x * scale)),
      Math.max(90, beaconY) + bob,
    );
    if (offscreen) ctx.rotate(Math.PI);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (const y of [-12, 0]) {
      ctx.moveTo(-14, y);
      ctx.lineTo(0, y + 10);
      ctx.lineTo(14, y);
    }
    ctx.strokeStyle = "#12333e";
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = "#a4faff";
    ctx.shadowColor = "#38dfff";
    ctx.shadowBlur = 16;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(35, 25, 28, 0.3)";
    ctx.beginPath();
    ctx.ellipse(this.position.x, this.position.y + 2, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    const animation = assets!.animations.get(this.direction)!;
    const runningJump = jumping && this.runningJump;
    const frame = runningJump
      ? Math.min(
          animation.runningJumpFrameCount - 1,
          Math.floor((this.jumpElapsed ?? 0) * animation.runningJumpFps),
        )
      : jumping
        ? Math.min(
            animation.jumpFrameCount - 1,
            Math.floor((this.jumpElapsed ?? 0) * animation.jumpFps),
          )
        : walking
          ? Math.floor(
              (this.walkDistance / animation.stride) * animation.frameCount,
            ) % animation.frameCount
          : 0;
    const pivot = runningJump
      ? animation.runningJumpPivots[frame]
      : jumping
        ? animation.jumpPivots[frame]
        : walking
          ? animation.framePivots[frame]
          : animation.idlePivot;
    const sheet = runningJump
      ? animation.runningJumpSheet
      : jumping
        ? animation.jumpSheet
        : walking
          ? animation.sheet
          : animation.idleSheet;
    const columns = runningJump
      ? animation.runningJumpColumns
      : jumping
        ? animation.jumpColumns
        : animation.columns;
    const size =
      94 *
      (runningJump
        ? animation.runningJumpDisplayScale
        : jumping
          ? animation.jumpDisplayScale
          : 1);
    ctx.drawImage(
      sheet,
      walking || jumping ? (frame % columns) * animation.frameWidth : 0,
      walking || jumping
        ? Math.floor(frame / columns) * animation.frameHeight
        : 0,
      animation.frameWidth,
      animation.frameHeight,
      this.position.x - size * pivot.x,
      this.position.y - size * pivot.y,
      size,
      size,
    );
    const nearby = nearPortal(this.position);
    if (nearby !== this.nearby) {
      this.nearby = nearby;
      this.bubble.hidden = !nearby;
      this.host.dispatchEvent(
        new CustomEvent("portal-proximity", { detail: nearby }),
      );
    }
    this.bubble.style.left = `${offsetX + this.position.x * scale}px`;
    this.bubble.style.top = `${offsetY + (this.position.y - size * pivot.y - 10) * scale}px`;
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.clearInput();
    this.abort.abort();
    this.resizeObserver.disconnect();
    this.canvas.remove();
    this.bubble.remove();
  }
}
