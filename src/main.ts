import { bindAmmoDragging } from "./ammo-drag";
import { arenaBackgroundUrl } from "./assets/battleAssets";
import { BATTLE_WORLD, BATTLE_CENTER } from "./battle-world";
import {
  BATTLE_BOUNDARIES_KEY,
  defaultBattleBoundaries,
  loadBattleBoundaries,
  validateBattleBoundaries,
} from "./battle-boundaries";
import { openBoundaryEditor } from "./camp-boundary-editor";
import { BaseCampController, loadCampAssets, splashUrl } from "./base-camp";
import { BUILD_VERSION } from "./build-version";
import { requireOfflinePack, releaseLocation } from "./offline";
import { ProfileLease } from "./profile-lease";
import {
  usesFractionInput,
  fractionFields,
  bindFractionInput,
} from "./fraction-input";
import {
  previewForge,
  omniEquipped,
  omniRateBonus,
  capacityRateBonus,
} from "./forge";
import { ammoSellPrice, previewMerges } from "./ammo";
import { rerollPrice } from "./shop";
import { CheckpointQueue } from "./checkpoint-queue";
import { modifiers, moduleTotal } from "./modules";
import "./style.css";
import "./camp.css";
import "./assets/ui/states.css";
import "./game-art.css";
import "./reward.css";
import "./shop.css";
import "./battle-overlay.css";
import "./manage-items.css";
import "./typography.css";
import "./cursors.css";

import {
  itemArt,
  offerArt,
  ammoArtKey,
  moduleArtKey,
  decorateControls,
} from "./game-art";
import { CombatController, type CombatSnapshot } from "./combat";
import { parseNumericAnswer } from "./questions";
import {
  RunSession,
  canForge,
  shopOffers,
  timeQuality,
  type Checkpoint,
} from "./session";
import { IndexedProfileRepository } from "./indexeddb";
import {
  uid,
  AMMO_TYPES,
  GRADES,
  QUALITY_LABEL,
  QUALITY_ORDER,
  type Ammo,
  type AmmoType,
  type Grade,
  type Module,
  type Profile,
  type Quality,
  type Question,
  type RunState,
} from "./types";

const STORAGE_KEY =
  (import.meta.env.DEV && document.documentElement.dataset.profileStorageKey) ||
  "math-on-mars-profiles-v1";
const app = document.querySelector<HTMLElement>("#app")!;
const announcer = document.querySelector<HTMLElement>("#announcer")!;
let repository: IndexedProfileRepository;
const profileLease = new ProfileLease(navigator.locks, STORAGE_KEY);
let session: RunSession;
let screenGeneration = 0;
let quizDraft = "";
let quizElapsedAtStart = 0;
let activeProfileId: string | null = null;
let combat: CombatController | null = null;
let camp: BaseCampController | null = null;
let campProfileId: string | null = null;
let campGrade: Grade = "3";
let timerId: number | null = null;
let quizStartedAt = 0;
let paused = false;
let saving = false;
let pendingPause: string | null = null;
const checkpointQueue = new CheckpointQueue(() => {
  if (!saving) showPause("Combat save failed — retry to continue");
});
let quizKeyHandler: ((event: KeyboardEvent) => void) | null = null;
let resetTouch: (() => void) | null = null;

function activeProfile(): Profile {
  const profile = activeProfileId
    ? session.profile(activeProfileId)
    : undefined;
  if (!profile) throw new Error("No active profile");
  return profile;
}

function activeRun(): RunState {
  const run = activeProfile().activeRun;
  if (!run) throw new Error("No active run");
  return run;
}

function announce(message: string): void {
  announcer.textContent = "";
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

function cleanup(keepBattle = false): void {
  // Retain the last rendered battlefield before disposing of its simulation.
  if (
    combat &&
    activeProfileId &&
    activeProfile().activeRun &&
    (keepBattle || activeRun().phase !== "combat")
  ) {
    const source = document.querySelector<HTMLCanvasElement>(
      "#combat-canvas canvas",
    );
    if (source) {
      document.querySelector("#battle-backdrop")?.remove();
      const backdrop = document.createElement("canvas");
      backdrop.id = "battle-backdrop";
      backdrop.setAttribute("aria-hidden", "true");
      backdrop.width = source.width;
      backdrop.height = source.height;
      backdrop.getContext("2d")!.drawImage(source, 0, 0);
      app.before(backdrop);
    }
  }
  screenGeneration++;

  resetTouch?.();
  resetTouch = null;
  if (timerId !== null) window.clearInterval(timerId);
  timerId = null;
  camp?.destroy();
  camp = null;
  combat?.destroy();
  combat = null;
  if (quizKeyHandler) window.removeEventListener("keydown", quizKeyHandler);
  quizKeyHandler = null;
  paused = false;
  session.setPaused(false);
  app.inert = false;
}

const powerEmblems = import.meta.glob("./assets/ui/power/*.svg", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;
function qualityLevel(quality: Quality): string {
  return `<img class="power-emblem" src="${powerEmblems[`./assets/ui/power/${quality}.svg`]}" alt="${QUALITY_LABEL[quality]} reward power">`;
}

function shell(content: string, screenClass = ""): string {
  const betweenWaves =
    activeProfileId &&
    activeProfile().activeRun &&
    (activeRun().phase !== "combat" || screenClass.includes("loot-shell"));
  return `<div class="app-shell ${screenClass}${betweenWaves ? " battle-overlay" : ""}">
    ${
      betweenWaves
        ? ""
        : `<header class="topbar">
      <a class="brand" href="#" id="home-link" aria-label="Math on Mars home">
        <span class="planet-mark" aria-hidden="true"><i></i></span>
        <span><b>MATH</b><em>ON MARS</em></span>
      </a>
      <span class="build-tag">HOME MISSION // 01</span>
    </header>`
    }
    ${content}
  </div>`;
}

function bindHome(): void {
  document.querySelector("#qa-skip-quiz")?.addEventListener("click", () => {
    if (!paused)
      void perform(() => session.skipQuizForQA(activeProfileId!), resumeRun);
  });
  decorateControls();
  document.querySelector("#home-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    if (activeProfileId && activeProfile().activeRun) {
      exitMission();
      return;
    }
    renderBaseCamp();
  });
}

let openingProfile = false;
async function openProfile(id: string): Promise<void> {
  if (openingProfile) return;
  openingProfile = true;
  camp?.setPaused(true);
  app.inert = true;
  const generation = screenGeneration;
  try {
    const acquired = await profileLease.acquire(id);
    if (generation !== screenGeneration) {
      if (acquired) profileLease.release();
      return;
    }
    if (!acquired) {
      document.querySelector("#profile-status")!.textContent =
        "This profile is in use in another tab. Exit the mission there, then try again.";
      return;
    }
    await requireOfflinePack();
    if (generation !== screenGeneration) {
      profileLease.release();
      return;
    }
    activeProfileId = id;
    await perform(() => session.start(id, campGrade), renderCombat);
  } catch (error) {
    profileLease.release();
    if (generation === screenGeneration)
      document.querySelector("#profile-status")!.textContent =
        error instanceof Error ? error.message : "Could not open this profile.";
  } finally {
    if (generation === screenGeneration) app.inert = saving || paused;
    if (camp && !saving && !paused) {
      activeProfileId = null;
      camp.setPaused(false);
    }
    openingProfile = false;
  }
}

function arenaBoundaryOptions(): import("./camp-boundary-editor").BoundaryEditorOptions {
  return {
    name: "arena",
    width: BATTLE_WORLD.width,
    height: BATTLE_WORLD.height,
    image: arenaBackgroundUrl,
    key: BATTLE_BOUNDARIES_KEY,
    markers: [[BATTLE_CENTER, "Spawn"]],
    defaults: defaultBattleBoundaries,
    load: loadBattleBoundaries,
    validate: validateBattleBoundaries,
  };
}

function renderBaseCamp(): void {
  document.querySelector("#battle-backdrop")?.remove();
  if (activeProfileId) campProfileId = activeProfileId;
  cleanup();
  profileLease.release();
  activeProfileId = null;
  const profile =
    session.profiles.find((p) => p.id === campProfileId) ?? session.profiles[0];
  campProfileId = profile?.id ?? null;
  if (profile) campGrade = profile.grade;
  app.innerHTML = `<section class="camp-screen" aria-label="Base camp">
    <div id="camp-world" class="camp-world"></div>
    <header class="camp-hud">
      <button class="camp-edit-boundaries" id="edit-boundaries" aria-label="Edit map boundaries"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 19 7 17 19 4 17Z" fill="none" stroke="currentColor" stroke-width="1.5"/><g fill="currentColor"><circle cx="5" cy="5" r="2"/><circle cx="19" cy="7" r="2"/><circle cx="17" cy="19" r="2"/><circle cx="4" cy="17" r="2"/></g></svg></button>
    </header>
    <p id="profile-status" class="sr-only" role="status"></p>
    <div class="camp-joystick" id="camp-joystick" aria-label="Drag to move"><span id="camp-stick"></span></div>
  </section>`;
  const host = document.querySelector<HTMLElement>("#camp-world")!;
  camp = new BaseCampController(host, () => {
    void enterCampPortal();
  });
  document.querySelector("#edit-boundaries")!.addEventListener("click", () => {
    camp?.setPaused(true);
    const picker = document.createElement("dialog");
    picker.className = "track-dialog";
    picker.setAttribute("aria-labelledby", "boundary-map-title");
    picker.innerHTML = `<h1 id="boundary-map-title">Edit map boundaries</h1><p>Choose a map to draw its walkable area and blocked scenery. Each map saves separately in this browser.</p><div class="track-actions"><button data-map="camp" class="button primary">Base camp</button><button data-map="arena" class="button primary">Battleground</button><button data-map="cancel" class="button secondary">Cancel</button></div>`;
    document.body.append(picker);
    picker.addEventListener("click", (event) => {
      const choice = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-map]",
      )?.dataset.map;
      if (choice) picker.close(choice);
    });
    picker.addEventListener(
      "close",
      () => {
        const choice = picker.returnValue;
        picker.remove();
        const finish = (saved: boolean) => {
          if (saved) renderBaseCamp();
          else {
            camp?.setPaused(false);
            host.querySelector("canvas")?.focus();
          }
        };
        if (choice === "camp") openBoundaryEditor(finish);
        else if (choice === "arena")
          openBoundaryEditor(finish, {
            ...arenaBoundaryOptions(),
            saveLabel: "Save & return to camp",
          });
        else finish(false);
      },
      { once: true },
    );
    picker.showModal();
  });
  camp.bindJoystick(
    document.querySelector("#camp-joystick")!,
    document.querySelector("#camp-stick")!,
  );
  host.addEventListener("portal-proximity", (event) => {
    const nearby = (event as CustomEvent<boolean>).detail;
    if (nearby)
      announce(
        "Portal nearby. Press E or tap the portal icon to enter the arena.",
      );
  });
  host
    .querySelector<HTMLCanvasElement>("canvas")!
    .focus({ preventScroll: true });
}

function enterCampPortal(): void {
  if (openingProfile || saving || document.querySelector("#track-dialog"))
    return;
  camp?.setPaused(true);
  const labels: Record<Grade, string> = {
    K: "Count & compare",
    "1": "Within 20",
    "2": "Within 100",
    "3": "Multiply & divide",
    "4": "Fractions & products",
    "5": "Decimals & fractions",
  };
  const dialog = document.createElement("dialog");
  dialog.id = "track-dialog";
  dialog.className = "track-dialog";
  dialog.setAttribute("aria-labelledby", "track-title");
  dialog.innerHTML = `<form id="portal-mission-form">
    <p class="eyebrow warm">ARENA MISSION</p>
    <h1 id="track-title">Choose your math track</h1>
    <fieldset><legend>Grade level</legend><div class="portal-tracks">${GRADES.map((grade) => `<label class="portal-track"><input type="radio" name="grade" value="${grade}" ${grade === campGrade ? "checked" : ""} required><span><b>${grade === "K" ? "Kindergarten" : `Grade ${grade}`}</b><small>${labels[grade]}</small></span></label>`).join("")}</div></fieldset>
    <div class="track-actions"><button type="button" id="cancel-track" class="button secondary">Back to camp</button><button type="submit" class="button primary">Start mission</button></div>
  </form>`;
  document.querySelector(".camp-screen")!.append(dialog);
  let launching = false;
  dialog.addEventListener("close", () => {
    dialog.remove();
    if (!launching) {
      camp?.setPaused(false);
      document
        .querySelector<HTMLCanvasElement>(".camp-canvas")
        ?.focus({ preventScroll: true });
    }
  });
  dialog
    .querySelector("#cancel-track")!
    .addEventListener("click", () => dialog.close());
  dialog.querySelector("form")!.addEventListener("submit", (event) => {
    event.preventDefault();
    if (launching) return;
    const grade = new FormData(event.currentTarget as HTMLFormElement).get(
      "grade",
    ) as Grade;
    if (!GRADES.includes(grade)) return;
    campGrade = grade;
    launching = true;
    dialog.close();
    void startCampMission();
  });
  decorateControls(dialog);
  dialog.showModal();
  dialog.querySelector<HTMLInputElement>("input:checked")!.focus();
}

async function startCampMission(): Promise<void> {
  if (openingProfile || saving) return;
  document.querySelector("#profile-status")!.textContent = "Preparing arena…";
  if (!campProfileId) {
    await perform(
      () => session.createProfile("Cadet"),
      (id) => {
        campProfileId = id;
        void openProfile(id);
      },
    );
  } else await openProfile(campProfileId);
}

function resumeRun(): void {
  const run = activeRun();
  if (run.phase === "combat") renderCombat();
  else if (run.phase === "quiz") renderQuiz();
  else if (run.phase === "reward") renderReward();
  else if (run.phase === "correction") renderCorrection();
  else if (run.phase === "cache") renderCache();
  else renderShop();
}

function renderCombat(): void {
  cleanup();
  document.querySelector("#battle-backdrop")?.remove();
  const profile = activeProfile();
  const run = activeRun();
  const activeNames = run.activeAmmoIds
    .map((id) => run.ammo.find((a) => a.id === id))
    .filter(Boolean)
    .map((a) => (a!.legendary ? "Omni" : a!.type));
  app.innerHTML = `<div class="combat-screen ${profile.handedness === "right" ? "mirrored" : ""}" id="content">
    <div class="combat-hud top-left"><div class="portrait-mini"><span></span></div><div class="meter-stack"><div class="hud-label"><span>SUIT INTEGRITY</span><b id="hp-text">${Math.ceil(run.hp)} / ${run.maxHp}</b></div><div class="hp-track"><i id="hp-fill" style="width:${(run.hp / run.maxHp) * 100}%"></i></div><div class="ammo-readout">PULSE BLASTER · ${activeNames.join(" + ") || "STANDARD"}</div></div></div>
    <div class="wave-badge"><small>WAVE</small><b>${run.wave}<span>/ ${run.totalWaves}</span></b><em id="enemy-count">Incoming</em></div>
    <div class="combat-hud top-right"><div class="salvage-hud">${itemArt("salvage_bundle")}<small>SALVAGE</small><b id="salvage-count">${run.salvage}</b></div><div class="chest-hud"><span aria-hidden="true">${itemArt("supply_cache_closed")}</span><small>CHESTS</small><b id="chest-count">${run.combatSave?.version === 2 ? (run.combatSave.chestLoot?.length ?? 0) : 0}</b></div><button id="pause-button" class="icon-button" aria-label="Pause game">Ⅱ</button></div>
    <div id="combat-canvas" class="combat-canvas" aria-label="Combat arena"></div>
    <div class="touch-controls"><div id="joystick" class="joystick" aria-label="Movement control"><div id="stick-knob"></div></div>
      <button id="medkit-button" class="medkit-button" aria-label="Use med-kit">${itemArt("med_kit")}<span>MED-GEL <b id="medkit-count">${run.medkits}</b></span></button></div>
    <div class="combat-tip">${matchMedia("(pointer: coarse)").matches ? "DRAG TO MOVE · TAP MED-GEL TO HEAL · FIRING IS AUTOMATIC" : "MOVE: WASD / ARROWS · MED-GEL: Q · FIRING IS AUTOMATIC"}</div>
  </div>`;
  decorateControls();
  const host = document.querySelector<HTMLElement>("#combat-canvas")!;
  let checkpointTick =
    run.combatSave?.version === 2 ? (run.combatSave.simulationTick ?? 0) : 0;
  combat = new CombatController({
    parent: host,
    wave: run.wave,
    totalWaves: run.totalWaves,
    difficulty: run.difficulty,
    hp: run.hp,
    maxHp: run.maxHp,
    salvage: run.salvage,
    medkits: run.medkits,
    ammo: run.ammo,
    ammoBag: run.ammoBag,
    ammoCapacity: run.ammoCapacity,
    activeAmmoIds: run.activeAmmoIds,
    modules: run.modules,
    restore: run.combatSave,
    seed: hashSeed(`${run.id}-${run.wave}`),
    onHud: (state) => {
      updateCombatHud(state);
      const tick = state.simulationTick ?? 0;
      if (!paused && !saving && tick - checkpointTick >= 300) {
        checkpointTick = tick;
        saveBackgroundCheckpoint();
      }
    },
    onComplete: (state) => finishWave(state),
    onDefeat: (state) => endRun(false, state),
  });
  bindTouchControls();
  document
    .querySelector("#pause-button")!
    .addEventListener("click", () => showPause("Mission paused"));
}

function updateCombatHud(state: CombatSnapshot): void {
  const hp = document.querySelector<HTMLElement>("#hp-text");
  if (hp) hp.textContent = `${Math.ceil(state.hp)} / ${state.maxHp}`;
  const fill = document.querySelector<HTMLElement>("#hp-fill");
  if (fill)
    fill.style.width = `${Math.max(0, (state.hp / state.maxHp) * 100)}%`;
  const salvage = document.querySelector<HTMLElement>("#salvage-count");
  if (salvage) salvage.textContent = String(state.salvage);
  const chests = document.querySelector<HTMLElement>("#chest-count");
  if (chests) chests.textContent = String(state.chestLoot?.length ?? 0);
  const medkits = document.querySelector<HTMLElement>("#medkit-count");
  if (medkits) medkits.textContent = String(state.medkits);
  const enemies = document.querySelector<HTMLElement>("#enemy-count");
  if (enemies)
    enemies.textContent = state.enemiesLeft
      ? state.remainingMs === null
        ? "Boss wave"
        : `${Math.ceil(state.remainingMs / 1000)}s`
      : "Area clear";
}

function checkpoint(): Checkpoint {
  const run = activeRun();
  return {
    runId: run.id,
    combat: run.phase === "combat" ? combat?.snapshot() : undefined,
    elapsedMs: run.phase === "quiz" ? currentElapsed() : undefined,
    draft: run.phase === "quiz" ? quizDraft : undefined,
    correctionDraft:
      run.phase === "correction"
        ? document.querySelector<HTMLInputElement>("#correction-input")?.value
        : undefined,
  };
}

function saveBackgroundCheckpoint(): void {
  const data = structuredClone(checkpoint());
  const profileId = activeProfileId!;
  const commandId = uid("checkpoint");
  let prepared: ReturnType<RunSession["prepare"]> | undefined;
  checkpointQueue.enqueue(async () => {
    prepared ??= session.prepare(() => session.checkpoint(profileId, data));
    await repository.commit(prepared.profiles, commandId);
    prepared.publish();
  });
}

function bindTouchControls(): void {
  const zone = document.querySelector<HTMLElement>("#joystick")!;
  const knob = document.querySelector<HTMLElement>("#stick-knob")!;
  let pointerId: number | null = null;
  let origin = { x: 0, y: 0 };
  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId || paused) return;
    const rect = zone.getBoundingClientRect();
    let x = (event.clientX - origin.x) / (rect.width * 0.32);
    let y = (event.clientY - origin.y) / (rect.height * 0.32);
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    knob.style.translate = `${origin.x - rect.left - rect.width / 2 + x * 34}px ${origin.y - rect.top - rect.height / 2 + y * 34}px`;
    combat?.setTouchVector(x, y);
  };
  zone.addEventListener("pointerdown", (event) => {
    if (pointerId !== null || paused) return;
    origin = { x: event.clientX, y: event.clientY };
    const rect = zone.getBoundingClientRect();
    zone.style.setProperty(
      "--stick-x",
      `${origin.x - rect.left - rect.width / 2}px`,
    );
    zone.style.setProperty(
      "--stick-y",
      `${origin.y - rect.top - rect.height / 2}px`,
    );
    pointerId = event.pointerId;
    zone.setPointerCapture(event.pointerId);
    move(event);
  });
  zone.addEventListener("pointermove", move);
  resetTouch = () => {
    const held = pointerId;
    pointerId = null;
    if (held !== null && zone.hasPointerCapture(held))
      zone.releasePointerCapture(held);
    knob.style.translate = "0 0";
    zone.style.removeProperty("--stick-x");
    zone.style.removeProperty("--stick-y");
    combat?.setTouchVector(0, 0);
  };
  const release = (event: PointerEvent) => {
    if (event.pointerId === pointerId) resetTouch?.();
  };
  zone.addEventListener("pointerup", release);
  zone.addEventListener("pointercancel", release);
  zone.addEventListener("lostpointercapture", release);
  document
    .querySelector("#medkit-button")!
    .addEventListener("pointerup", () => combat?.useMedkit());
}

function finishWave(state: CombatSnapshot): void {
  if (activeRun().wave === activeRun().totalWaves) {
    endRun(true, state);
    return;
  }
  perform(
    () => session.finishWave(activeProfileId!, state),
    () => renderQuiz(),
  );
}

function currentElapsed(): number {
  return Math.min(
    30000,
    quizElapsedAtStart +
      (paused ? 0 : Math.max(0, performance.now() - quizStartedAt)),
  );
}

function questionVisuals(question: Question): string {
  const groups =
    question.visualGroups ??
    (question.visualCount !== undefined ? [question.visualCount] : []);
  return groups
    .map(
      (count, index) =>
        `<div>${groups.length > 1 ? `<p>${escapeHtml(question.visualGroupLabels?.[index] ?? `Group ${index + 1}`)}</p>` : ""}<div class="cell-grid" aria-label="${count} energy cells">${count === 0 ? "<span>No cells</span>" : Array.from({ length: count }, () => "<i></i>").join("")}</div></div>`,
    )
    .join("");
}

function renderQuiz(message = ""): void {
  cleanup();
  const run = activeRun();
  const quiz = run.quiz!;
  const question = quiz.questions[quiz.index];
  quizDraft = quiz.draft ?? "";
  app.innerHTML = shell(
    `<section class="quiz-layout" id="content">
    <aside class="rarity-rail" aria-label="Reward power bands"><div class="rail-title">POWER LEVEL</div>${["purple", "blue", "green", "white"].map((q) => `<div class="rail-step ${q}" data-quality="${q}">${qualityLevel(q as Quality)}<small>${q === "purple" ? "> 20s" : q === "blue" ? "> 10s" : q === "green" ? "> 0s" : "0s"}</small></div>`).join("")}</aside>
    <div class="quiz-main">
      <div class="quiz-topline"><div><p class="eyebrow warm">1 / 4 · QUIZ</p><h1>Question ${quiz.index + 1} <span>of 5</span></h1></div><div class="countdown" id="countdown" aria-label="Time remaining"><small>TIME LEFT</small><b>${formatTime(quiz.remainingMs)}</b></div></div>
      <div class="mobile-tier-strip" id="mobile-tier">${qualityLevel(timeQuality(quiz.remainingMs))}</div>
      <div class="question-panel"><div class="question-copy"><p class="prompt">${escapeHtml(question.prompt)}</p>${questionVisuals(question)}
        ${usesFractionInput(question) ? fractionFields : '<label for="answer">Your answer</label>'}<output id="answer" class="answer-field" aria-live="polite" ${usesFractionInput(question) ? "hidden" : ""}>&nbsp;</output><p class="input-error" id="input-error">${escapeHtml(message)}</p>
        <div class="quiz-tools"><button id="qa-skip-quiz" class="text-button" type="button">QA · Skip quiz</button></div></div>
        <div class="keypad" aria-label="Number keypad">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => `<button data-key="${n}" aria-label="${n}">${n}</button>`).join("")}
          <button data-key="." aria-label="Decimal point">.</button><button data-key="0" aria-label="0">0</button><button data-key="/" aria-label="Fraction bar">⁄</button>
          <button data-key="back" class="key-muted" aria-label="Backspace">⌫</button><button data-key="clear" class="key-muted">Clear</button><button data-key="check" class="key-check">Check</button>
        </div></div>
      <div class="question-progress" aria-label="Question progress">${quiz.questions.map((_, i) => `<i class="${i < quiz.index ? "done" : i === quiz.index ? "current" : ""}"></i>`).join("")}</div>
    </div>
  </section>`,
    "quiz-screen",
  );
  bindHome();
  quizDraft = quiz.draft ?? "";
  const output = document.querySelector<HTMLOutputElement>("#answer")!;
  const updateDraft = () => {
    output.textContent = quizDraft || " ";
  };
  const editFraction = usesFractionInput(question)
    ? bindFractionInput(
        quizDraft,
        (draft) => {
          quizDraft = draft;
          updateDraft();
        },
        () => {
          if (!paused) submitInitial(quizDraft, question.id);
        },
      )
    : undefined;
  const press = (key: string) => {
    if (paused || activeRun().phase !== "quiz") return;
    if (key === "check") {
      submitInitial(quizDraft, question.id);
      return;
    }
    if (editFraction) {
      editFraction(key);
      return;
    }
    if (key === "back") quizDraft = quizDraft.slice(0, -1);
    else if (key === "clear") quizDraft = "";
    else if (
      quizDraft.length < 12 &&
      !(key === "/" && quizDraft.includes("/")) &&
      !(key === "." && quizDraft.includes("."))
    )
      quizDraft += key;
    updateDraft();
  };
  document
    .querySelectorAll<HTMLButtonElement>("[data-key]")
    .forEach((button) =>
      button.addEventListener("click", () => press(button.dataset.key!)),
    );
  updateDraft();
  quizKeyHandler = (event: KeyboardEvent) => {
    if (paused || event.repeat) return;
    if (/^[0-9./-]$/.test(event.key)) {
      press(event.key);
      event.preventDefault();
    } else if (event.key === "Backspace") {
      press("back");
      event.preventDefault();
    } else if (event.key === "Enter") {
      press("check");
      event.preventDefault();
    }
  };
  window.addEventListener("keydown", quizKeyHandler);
  quizElapsedAtStart = quiz.elapsedMs;
  quizStartedAt = performance.now();
  timerId = window.setInterval(updateTimer, 50);

  updateTierRail();
}

function updateTimer(): void {
  const run = activeRun();
  if (run.phase !== "quiz" || paused) return;
  const remaining = 30000 - currentElapsed();
  const timer = document.querySelector<HTMLElement>("#countdown b");
  if (timer) timer.textContent = formatTime(remaining);
  updateTierRail(remaining);
}

function updateTierRail(remaining = activeRun().quiz!.remainingMs): void {
  const quality = timeQuality(remaining);
  document
    .querySelectorAll(".rail-step")
    .forEach((step) =>
      step.classList.toggle(
        "active",
        (step as HTMLElement).dataset.quality === quality,
      ),
    );
  const strip = document.querySelector<HTMLElement>("#mobile-tier");
  if (strip) strip.innerHTML = `${qualityLevel(quality)}`;
}

function submitInitial(value: string, occurrenceId: string): void {
  if (paused || activeRun().phase !== "quiz") return;
  if (!parseNumericAnswer(value)) {
    document.querySelector("#input-error")!.textContent =
      "Enter a complete number or fraction.";
    return;
  }
  const elapsed = currentElapsed();
  perform(
    () => session.submit(activeProfileId!, occurrenceId, value, elapsed),
    (message) => {
      if (activeRun().phase === "quiz") renderQuiz(message ?? "");
      else resumeRun();
    },
  );
}

function renderReward(): void {
  cleanup();
  const run = activeRun();
  const quiz = run.quiz!;
  const quality = quiz.rewardQuality!;
  app.innerHTML = shell(
    `<section class="reward-screen" id="content" aria-labelledby="reward-title">
    <header class="reward-heading"><div><p class="flow-step">2 / 4</p><h1 id="reward-title">Select reward</h1></div><span>Wave ${run.wave}</span></header>
    <div class="reward-selection">
      ${rewardStats(run)}
      <div class="reward-grid">${quiz
        .rewardChoices!.map(
          (module) =>
            `<button type="button" class="reward-card level-card ${quality}" data-reward="${escapeHtml(module.id)}" aria-label="Choose ${escapeHtml(module.name)}: ${escapeHtml(statText(module))}, ${QUALITY_LABEL[quality]} rarity">${itemArt(moduleArtKey(module.name), "reward-art")}<strong>${escapeHtml(module.name)}</strong><span class="stat-gain">${statText(
              module,
            )
              .split(" · ")
              .map((stat) => `<span>${stat}</span>`)
              .join(
                "",
              )}</span>${levelBadge(QUALITY_ORDER.indexOf(quality) + 1)}</button>`,
        )
        .join("")}</div>
    </div>

  </section>`,
    "reward-shell",
  );
  bindHome();
  document
    .querySelectorAll<HTMLElement>("[data-reward]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        chooseReward(button.dataset.reward!),
      ),
    );
}

function chooseReward(id: string): void {
  if (paused) return;
  perform(() => session.chooseReward(activeProfileId!, id), resumeRun);
}

function renderCorrection(message = ""): void {
  cleanup();
  const run = activeRun();
  const quiz = run.quiz!;
  const misses = quiz.attempts.filter((a) => !a.correct && !a.corrected);
  if (!misses.length) {
    resumeRun();
    return;
  }
  const attempt = misses[0];
  app.innerHTML = shell(
    `<section class="correction-screen" id="content"><div class="correction-copy"><p class="eyebrow warm">1 / 4 · QUIZ REVIEW</p><h1>Try this one again.</h1><p>Untimed · Your reward level is already set.</p></div>
    <div class="correction-card"><div><span class="correction-count">${quiz.attempts.filter((a) => !a.correct).length - misses.length + 1} / ${quiz.attempts.filter((a) => !a.correct).length}</span><p class="prompt">${escapeHtml(attempt.question.prompt)}</p>${questionVisuals(attempt.question)}<div class="hint-box"><b>Hint</b><p>${escapeHtml(attempt.question.hint)}</p></div><details><summary>Show solution</summary><p>${escapeHtml(attempt.question.explanation)}</p></details></div>
      <div>${usesFractionInput(attempt.question) ? fractionFields : '<label for="correction-input">Correct answer</label>'}<input id="correction-input" ${usesFractionInput(attempt.question) ? "hidden" : ""} inputmode="none" autocomplete="off" value="${escapeHtml(quiz.correctionDraft ?? "")}"><div class="keypad correction-keypad" aria-label="Correction number keypad">${["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "/", "back", "clear", "-"].map((key) => `<button type="button" data-correction-key="${key}" aria-label="${key === "/" ? "Fraction bar" : key === "back" ? "Backspace" : key === "-" ? "Minus" : key}">${key === "back" ? "⌫" : key === "clear" ? "Clear" : key}</button>`).join("")}</div><p class="input-error" id="correction-error">${escapeHtml(message)}</p><button id="correction-check" class="button primary">Check answer</button></div></div>
    <button id="qa-skip-quiz" class="text-button centered">QA · Skip quiz</button></section>`,
    "correction-shell",
  );
  bindHome();
  const input = document.querySelector<HTMLInputElement>("#correction-input")!;

  if (!usesFractionInput(attempt.question)) input.focus();
  const submit = () => {
    if (paused || activeRun().phase !== "correction") return;
    const value = input.value;
    if (!parseNumericAnswer(value)) {
      document.querySelector("#correction-error")!.textContent =
        "Enter a complete number or fraction.";
      return;
    }
    const correctionId = uid("correction");
    perform(
      () =>
        session.correct(
          activeProfileId!,
          attempt.question.id,
          value,
          correctionId,
        ),
      (message) => {
        if (activeRun().phase === "correction") renderCorrection(message ?? "");
        else resumeRun();
      },
    );
  };
  const editFraction = usesFractionInput(attempt.question)
    ? bindFractionInput(
        input.value,
        (draft) => {
          input.value = draft;
        },
        submit,
      )
    : undefined;
  document
    .querySelectorAll<HTMLElement>("[data-correction-key]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        if (paused) return;
        const key = button.dataset.correctionKey!;
        if (editFraction) {
          editFraction(key);
          return;
        }
        if (key === "back") input.value = input.value.slice(0, -1);
        else if (key === "clear") input.value = "";
        else if (input.value.length < 18) input.value += key;
      }),
    );
  document
    .querySelector("#correction-check")!
    .addEventListener("click", submit);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!event.repeat) submit();
    }
  });
}

function renderCache(): void {
  renderShop();
}

function levelBadge(level: number, legendary = false): string {
  return `<span class="sr-only" aria-label="${legendary ? "Legendary" : `Level ${level}`}">${legendary ? "★" : `Lv ${level}`}</span>`;
}

function manageLoot(run: RunState): string {
  const loot = run.waveLoot ?? [];
  if (!loot.length) return "";
  return `<section class="loot-panel" aria-labelledby="loot-title"><div class="panel-heading"><h2 id="loot-title">Loot${loot.length ? ` · ${loot.length}` : ""}</h2>${loot.length > 1 ? '<div class="loot-bulk"><button class="button secondary" data-loot="all" data-disposition="accept">Accept all</button><button class="text-button" data-loot="all" data-disposition="sell">Sell all</button></div>' : ""}</div>
  ${loot.length ? `<div class="loot-grid">${loot.map((item) => `<article class="loot-card level-card ${item.legendary ? "legendary" : qualityFromTier(item.tier)}">${levelBadge(item.tier, item.legendary)}${itemArt(ammoArtKey(item.type, item.legendary))}<h3>${escapeHtml(item.legendary ? "Omni Ammo" : item.type)}</h3><p>${item.legendary ? "All five ammo effects" : ammoEffect(item.type)}</p><small>Owned: ${run.ammo.filter((a) => a.type === item.type && a.tier === item.tier && !!a.legendary === !!item.legendary).length}</small><div class="loot-actions"><button class="button secondary" data-loot="${escapeHtml(item.id)}" data-disposition="accept">Accept</button><button class="text-button" data-loot="${escapeHtml(item.id)}" data-disposition="sell">Sell · ${ammoSellPrice(item)}</button></div></article>`).join("")}</div>` : ""}
  </section>`;
}

function renderLoot(): void {
  cleanup();
  const run = activeRun();
  if (!run.waveLoot?.length) {
    renderShop();
    return;
  }
  app.innerHTML = shell(
    `<section class="shop-screen manage-screen loot-screen" id="content" aria-labelledby="manage-title">
    <header class="shop-top"><div><p class="flow-step">3 / 4</p><h1 id="manage-title">Loot drops</h1></div><div class="salvage-chip">${itemArt("salvage_bundle")}<b>${run.salvage}</b><span>salvage</span></div></header>
    <div class="loot-content">${manageLoot(run)}</div>
  </section>`,
    "shop-shell",
  );
  bindHome();
  document.querySelectorAll<HTMLElement>("[data-loot]").forEach((button) =>
    button.addEventListener("click", () => {
      if (!paused)
        void perform(
          () =>
            session.settleWaveLoot(
              activeProfileId!,
              button.dataset.loot!,
              button.dataset.disposition as "accept" | "sell",
            ),
          () => renderLoot(),
        );
    }),
  );
}

let inventoryPage = 0;
function renderShop(message = ""): void {
  if (activeRun().waveLoot?.length) {
    renderLoot();
    return;
  }
  const previousScroll = document.querySelector(".manage-grid")?.scrollTop ?? 0;
  const focused = document.activeElement as HTMLElement | null;
  const focusSelector = focused?.id
    ? `#${CSS.escape(focused.id)}`
    : ["data-buy", "data-ammo-id", "data-sell-ammo", "data-loot"]
        .filter((attr) => focused?.hasAttribute(attr))
        .map(
          (attr) => `[${attr}="${CSS.escape(focused!.getAttribute(attr)!)}"]`,
        )
        .join("");
  cleanup();
  const run = activeRun();
  if (!run.shop || run.phase === "cache") {
    void perform(
      () => session.openShop(activeProfileId!),
      () => renderShop(),
    );
    return;
  }
  const offers = shopOffers(run);
  const activeAmmo = run.activeAmmoIds
    .map((id) => run.ammo.find((ammo) => ammo.id === id))
    .filter((ammo): ammo is Ammo => Boolean(ammo));
  const mergePreview = previewMerges(run);
  const purpleTypes = new Set(
    run.ammo
      .filter((ammo) => ammo.tier === 4 && !ammo.legendary)
      .map((ammo) => ammo.type),
  ).size;
  app.innerHTML = shell(
    `<section class="shop-screen manage-screen" id="content" aria-labelledby="manage-title">
    <header class="shop-top"><div><p class="flow-step">4 / 4</p><h1 id="manage-title">Shop & inventory</h1></div><div class="salvage-chip">${itemArt("salvage_bundle")}<b>${run.salvage}</b><span>salvage</span></div></header>
    <p class="shop-message" role="status">${escapeHtml(message)}</p>
    <div class="manage-grid">${rewardStats(run)}<div class="manage-content">

      <section class="market-panel" aria-labelledby="shop-title"><div class="panel-heading"><h2 id="shop-title">Shop</h2><button id="reroll-shop" class="button secondary" ${run.salvage < rerollPrice(run) ? "disabled" : ""}>Reroll · ${rerollPrice(run)}</button></div>
      <div class="shop-offers">${offers.map((offer) => (offer.purchased ? `<article class="shop-offer bought"><span>Sold</span></article>` : `<article class="shop-offer level-card ${offer.kind === "module" ? offer.module.quality : qualityFromTier(offer.kind === "ammo" ? (offer.ammoTier ?? 1) : 1)}">${offer.kind === "module" ? levelBadge(QUALITY_ORDER.indexOf(offer.module.quality) + 1) : offer.kind === "ammo" ? levelBadge(offer.ammoTier ?? 1) : ""}${offerArt(offer)}<h3>${escapeHtml(offer.title)}</h3><p>${offer.kind === "module" ? statText(offer.module) : offer.kind === "ammo" ? ammoEffect(offer.ammoType) : offer.detail}</p><button class="button secondary" data-buy="${escapeHtml(offer.id)}" aria-label="Buy ${escapeHtml(offer.title)} for ${offer.price} salvage" ${offer.disabled || run.salvage < offer.price ? "disabled" : ""}>Buy · ${offer.price}</button></article>`)).join("")}</div>
      </section>
      <section class="loadout" aria-labelledby="inventory-title"><div class="panel-heading"><h2 id="inventory-title">Inventory</h2><span class="inventory-total">${run.ammo.length + run.medkits} items owned</span></div>
        <p class="inventory-summary">${activeAmmo.length} / ${run.ammoCapacity} equipped · ${run.ammo.length} ammo · ${run.medkits} med-gel</p>
        ${inventorySlots(run)}
        <div class="inventory-tools">${mergePreview.pairs.length ? '<button id="merge-all" class="button secondary">Merge all</button>' : ""}${purpleTypes > 0 || canForge(run) ? `<button id="forge-button" class="button secondary">Forge · ${purpleTypes}/5</button>` : ""}${omniEquipped(run) ? `<small>Omni · +${Math.round(omniRateBonus(run) * 100)}% fire rate</small>` : ""}</div>
      </section>
    </div></div>
    <footer class="shop-actions"><div>${run.waveLoot?.length ? "<small>Accept or sell your loot to continue</small>" : ""}<button id="next-wave" class="button launch" ${run.waveLoot?.length ? "disabled" : ""}>Start wave ${run.wave + 1} →</button></div></footer>
    </section>`,
    "shop-shell",
  );
  bindHome();
  document
    .querySelector(".stats-toggle")
    ?.addEventListener("click", (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      const expanded = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(expanded));
      button
        .closest(".reward-stats")
        ?.classList.toggle("stats-expanded", expanded);
    });

  document
    .querySelectorAll<HTMLElement>("[data-inventory-page]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        inventoryPage += Number(button.dataset.inventoryPage);
        renderShop();
        document
          .querySelector<HTMLElement>(
            `[data-inventory-page="${button.dataset.inventoryPage}"]:not(:disabled)`,
          )
          ?.focus();
      });
    });
  document.querySelector("#reroll-shop")!.addEventListener("click", () => {
    void perform(
      () => session.reroll(activeProfileId!),
      (message) => renderShop(message ?? ""),
    );
  });
  document
    .querySelectorAll<HTMLElement>("[data-buy]")
    .forEach((button) =>
      button.addEventListener("click", () => buyOffer(button.dataset.buy!)),
    );
  document
    .querySelectorAll<HTMLElement>("[data-ammo-id]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        toggleAmmo(button.dataset.ammoId!),
      ),
    );
  document.querySelector("#merge-all")?.addEventListener("click", () => {
    if (!paused)
      void perform(
        () => session.mergeAll(activeProfileId!),
        (message) => renderShop(message),
      );
  });
  bindAmmoDragging(
    document.querySelector<HTMLElement>(".inventory-six")!,
    run.ammo,
    (pair) => {
      if (!paused)
        void perform(
          () =>
            session.mergePreview(activeProfileId!, {
              ...mergePreview,
              pairs: [pair],
            }),
          (message) => renderShop(message),
        );
    },
  );
  document.querySelectorAll<HTMLElement>("[data-sell-ammo]").forEach((button) =>
    button.addEventListener("click", () => {
      if (!paused)
        void perform(
          () => session.sellAmmo(activeProfileId!, button.dataset.sellAmmo!),
          (message) => renderShop(message),
        );
    }),
  );
  document.querySelector("#forge-button")?.addEventListener("click", forgeOmni);
  document.querySelector("#next-wave")!.addEventListener("click", () => {
    if (!paused) perform(() => session.nextWave(activeProfileId!), resumeRun);
  });
  const grid = document.querySelector(".manage-grid");
  if (grid) grid.scrollTop = previousScroll;
  if (focusSelector) {
    const target =
      document.querySelector<HTMLElement>(focusSelector) ??
      document.querySelector<HTMLElement>(
        "[data-loot], [data-buy]:not(:disabled), #next-wave",
      );
    target?.focus({ preventScroll: true });
  }
  if (run.forgeIngredientIds) showForgeDialog(run);
}

function buyOffer(id: string): void {
  if (!paused)
    perform(
      () => session.buy(activeProfileId!, id),
      (message) => renderShop(message),
    );
}

function toggleAmmo(id: string): void {
  if (!paused)
    perform(
      () => session.toggleAmmo(activeProfileId!, id),
      (message) => renderShop(message),
    );
}

function inventorySlots(run: RunState): string {
  const groups = new Map<string, Ammo[]>();
  for (const ammo of run.ammo) {
    const active = run.activeAmmoIds.includes(ammo.id);
    const key = active
      ? ammo.id
      : `${ammo.type}:${ammo.tier}:${!!ammo.legendary}`;
    const group = groups.get(key) ?? [];
    group.push(ammo);
    groups.set(key, group);
  }
  const stacks = [...groups.values()].sort(
    (a, b) =>
      Number(run.activeAmmoIds.includes(b[0].id)) -
        Number(run.activeAmmoIds.includes(a[0].id)) ||
      AMMO_TYPES.indexOf(a[0].type) - AMMO_TYPES.indexOf(b[0].type) ||
      b[0].tier - a[0].tier,
  );
  const pages = Math.max(1, Math.ceil(stacks.length / 6));
  inventoryPage = Math.min(inventoryPage, pages - 1);
  const visible = stacks.slice(inventoryPage * 6, inventoryPage * 6 + 6);
  const cards = Array.from({ length: 6 }, (_, index) => {
    const group = visible[index];
    if (!group) return '<div class="empty-slot"><span>Empty</span></div>';
    const ammo = group[0];
    const active = run.activeAmmoIds.includes(ammo.id);
    return `<article class="inventory-stack"><div class="stack-count">${active ? "Equipped" : `×${group.length}`}</div>${ammoChip(ammo, active)}${!active && !ammo.legendary ? `<button class="text-button" data-sell-ammo="${escapeHtml(ammo.id)}" aria-label="Sell one ${escapeHtml(ammo.type)} level ${ammo.tier} for ${ammoSellPrice(ammo)} salvage">Sell · ${ammoSellPrice(ammo)}</button>` : ""}</article>`;
  }).join("");
  return `<div class="reserve-grid inventory-six">${cards}</div><div class="inventory-pager" ${pages === 1 ? "hidden" : ""}><button class="button secondary" data-inventory-page="-1" aria-label="Previous inventory page" ${inventoryPage === 0 ? "disabled" : ""}>←</button><span>${inventoryPage + 1} / ${pages}</span><button class="button secondary" data-inventory-page="1" aria-label="Next inventory page" ${inventoryPage === pages - 1 ? "disabled" : ""}>→</button></div>`;
}

function forgeOmni(): void {
  if (!paused)
    void perform(
      () => session.selectForgeIngredients(activeProfileId!),
      () => renderShop(),
    );
}

function showForgeDialog(run: RunState): void {
  const preview = previewForge(run);
  const dialog = document.createElement("dialog");
  dialog.className = "forge-dialog";
  dialog.setAttribute("aria-labelledby", "forge-title");
  dialog.innerHTML = `<h2 id="forge-title">Forge Omni Ammo</h2><p>One purple ammo of each type → all five effects in one slot.</p>${AMMO_TYPES.map(
    (type) => {
      const copies = run.ammo.filter(
        (a) => !a.legendary && a.type === type && a.tier === 4,
      );
      return `<label class="forge-ingredient">${itemArt(ammoArtKey(type))}${type}<select data-forge-type="${type}" ${copies.length ? "" : "disabled"}>${copies.length ? copies.map((a, index) => `<option value="${escapeHtml(a.id)}" ${preview.ingredientIds.includes(a.id) ? "selected" : ""}>Copy ${index + 1}${run.activeAmmoIds.includes(a.id) ? " · equipped" : ""}</option>`).join("") : '<option value="">Missing</option>'}</select></label>`;
    },
  ).join(
    "",
  )}<p>+${Math.round(capacityRateBonus(run.ammoCapacity) * 100)}% fire rate while equipped. Once per mission.</p><div class="loot-actions"><button id="confirm-forge" class="button primary" ${canForge(run) ? "" : "disabled"}>Forge</button><button id="close-forge" class="button secondary">Close</button></div>`;
  app.append(dialog);
  const close = () => {
    if (!paused)
      void perform(
        () => session.cancelForge(activeProfileId!),
        () => {
          dialog.close();
          renderShop();
          document.querySelector<HTMLButtonElement>("#forge-button")?.focus();
        },
      );
  };
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.querySelector("#close-forge")!.addEventListener("click", close);
  dialog.querySelector("#confirm-forge")!.addEventListener("click", () => {
    const ingredientIds = Array.from(
      dialog.querySelectorAll<HTMLSelectElement>("[data-forge-type]"),
    ).map((select) => select.value);
    if (!paused)
      void perform(
        () => session.forge(activeProfileId!, { ...preview, ingredientIds }),
        () => renderShop("Omni forged."),
      );
  });
  dialog.showModal();
}

function endRun(victory: boolean, state?: CombatSnapshot): void {
  perform(
    () => session.end(activeProfileId!, victory, state),
    (summary) => {
      if (!summary) return;
      cleanup();
      document.querySelector("#battle-backdrop")?.remove();
      const profile = activeProfile();
      const run = summary;
      const missionHistory = profile.history.filter((entry) =>
        entry.occurrenceId.startsWith(`${run.id}:`),
      );
      const accuracy = missionHistory.length
        ? Math.round(
            (missionHistory.filter((h) => h.correctInitially).length /
              missionHistory.length) *
              100,
          )
        : 0;
      app.innerHTML = shell(
        `<section class="summary-screen" id="content"><div class="summary-mark ${victory ? "victory" : "defeat"}"><i></i></div><p class="eyebrow warm">${victory ? "MISSION COMPLETE" : "SUIT OFFLINE"}</p><h1>${victory ? "Mars is secure." : "The slimes broke through."}</h1><p>${victory ? "The Overmind is down and the outpost reactor is stable." : "Your learning record is safe. Refit and launch again."}</p>
    <div class="summary-stats"><div><small>WAVES</small><b>${run.wave}</b></div><div><small>FIRST-TRY ACCURACY</small><b>${accuracy}%</b></div><div><small>MODULES</small><b>${run.modules.length}</b></div><div><small>SALVAGE</small><b>${run.salvage}</b></div></div>
    <div class="summary-actions">${victory ? "" : `<button id="retry-mission" class="button primary">Retry mission</button>`}<button id="return-home" class="button ${victory ? "launch" : "secondary"}">Return to base camp</button></div></section>`,
        "summary-shell",
      );
      bindHome();
      document
        .querySelector("#retry-mission")
        ?.addEventListener("click", async () => {
          const generation = screenGeneration;
          const button =
            document.querySelector<HTMLButtonElement>("#retry-mission")!;
          if (button.disabled) return;
          button.disabled = true;
          const status = document.createElement("p");
          status.setAttribute("role", "status");
          status.textContent = "Checking installed mission content…";
          button.parentElement!.append(status);
          try {
            await requireOfflinePack();
            if (generation !== screenGeneration) return;
            await perform(
              () => session.start(profile.id, run.grade),
              renderCombat,
            );
          } catch (error) {
            if (generation === screenGeneration)
              status.textContent = String(error);
          } finally {
            if (generation === screenGeneration) button.disabled = false;
          }
        });
      document
        .querySelector("#return-home")!
        .addEventListener("click", renderBaseCamp);
    },
  );
}

function setBlocked(blocked: boolean): void {
  paused = blocked;
  session.setPaused(blocked);
  app.inert = blocked;
  camp?.setPaused(blocked);
  if (blocked) {
    resetTouch?.();
    if (timerId !== null) window.clearInterval(timerId);
    timerId = null;
    combat?.pause();
    combat?.clearInput();
  }
}

async function perform<T>(
  action: () => T,
  after: (result: T) => void,
): Promise<void> {
  if (saving) return;
  const wasPaused = paused;
  const previousPause = document.querySelector<HTMLElement>("#pause-overlay");
  const commandId = uid("command");
  let prepared:
    { profiles: Profile[]; result: T; publish: () => void } | undefined;
  const attempt = async () => {
    if (saving) return;
    saving = true;
    setBlocked(true);
    if (previousPause) previousPause.inert = true;
    try {
      await checkpointQueue.drain(
        Boolean(document.querySelector("#retry-save")),
      );
      session.setPaused(wasPaused);
      // Capture domain changes once; retries retain generated offers, time and IDs.
      if (!prepared) prepared = session.prepare(action);
      setBlocked(true);
      if (previousPause) previousPause.inert = true;
      await repository.commit(prepared.profiles, commandId);
    } catch (error) {
      saving = false;
      setBlocked(true);
      document.querySelector("#pause-overlay")?.remove();
      const overlay = document.createElement("div");
      overlay.id = "pause-overlay";
      overlay.className = "pause-overlay";
      overlay.innerHTML = `<div class="pause-dialog" role="alertdialog" aria-modal="true"><h2>Progress could not be saved</h2><p>${escapeHtml(error instanceof Error ? error.message : "Storage is unavailable.")}</p><p>The change has not been applied. Retry saving before continuing.</p><button class="button primary" id="retry-save">Retry save</button><button class="text-button" id="export-safe">Export last saved progress</button><button class="button secondary" id="reload-saved">Reload saved profiles</button></div>`;
      document.body.append(overlay);
      decorateControls(overlay);
      overlay
        .querySelector("#reload-saved")!
        .addEventListener("click", () => location.reload());
      overlay.querySelector<HTMLButtonElement>("#retry-save")!.focus();
      overlay.querySelector("#retry-save")!.addEventListener("click", () => {
        void attempt();
      });
      overlay
        .querySelector("#export-safe")!
        .addEventListener("click", () =>
          downloadProfiles(JSON.stringify(session.profiles)),
        );
      return;
    }
    prepared.publish();
    document.querySelector("#pause-overlay")?.remove();
    setBlocked(wasPaused);
    if (previousPause) {
      previousPause.inert = false;
      document.body.append(previousPause);
    }
    saving = false;
    after(prepared.result);
    if (pendingPause) {
      const title = pendingPause;
      pendingPause = null;
      showPause(title);
    } else {
      if (combat && !paused) combat.resume();
      if (
        !paused &&
        activeProfileId &&
        activeProfile().activeRun?.phase === "quiz" &&
        timerId === null
      )
        renderQuiz();
    }
    previousPause?.querySelector<HTMLButtonElement>("#resume-button")?.focus();
  };
  await attempt();
}

function showPause(title: string): void {
  if (saving) {
    pendingPause = title;
    return;
  }
  if (paused || !activeProfileId || !activeProfile().activeRun) return;
  const elapsed = currentElapsed();
  const data = checkpoint();
  setBlocked(true);
  perform(
    () => session.checkpoint(activeProfileId!, data),
    () => {
      setBlocked(true);
      quizElapsedAtStart = elapsed;
      const overlay = document.createElement("div");
      overlay.className = "pause-overlay mission-pause";
      overlay.id = "pause-overlay";
      overlay.innerHTML = `<div class="pause-dialog" role="dialog" aria-modal="true" aria-labelledby="pause-title"><h2 id="pause-title">Paused</h2>${title.includes("failed") ? `<p>${escapeHtml(title)}</p>` : ""}<button id="resume-button" class="button primary">Resume</button>${activeRun().phase === "combat" ? '<button id="edit-arena-bounds" class="button secondary">Edit arena bounds</button>' : ""}<button id="pause-exit" class="text-button">Exit mission</button><p class="pause-exit-note">Exiting loses this mission’s progress.</p></div>`;
      document.body.append(overlay);
      decorateControls(overlay);
      overlay.querySelector<HTMLButtonElement>("#resume-button")!.focus();
      overlay.querySelector("#resume-button")!.addEventListener("click", () => {
        if (saving) return;
        overlay.remove();
        setBlocked(false);
        combat?.resume();
        if (activeRun().phase === "quiz") {
          quizElapsedAtStart = activeRun().quiz!.elapsedMs;
          quizStartedAt = performance.now();
          timerId = window.setInterval(updateTimer, 50);
        }
      });
      overlay
        .querySelector("#edit-arena-bounds")
        ?.addEventListener("click", () => {
          openBoundaryEditor((saved) => {
            if (saved) {
              overlay.remove();
              setBlocked(false);
              renderCombat();
            } else
              overlay
                .querySelector<HTMLButtonElement>("#edit-arena-bounds")
                ?.focus();
          }, arenaBoundaryOptions());
        });
      overlay.querySelector("#pause-exit")!.addEventListener("click", () => {
        if (saving) return;
        exitMission();
      });
    },
  );
}

function exitMission(): void {
  if (saving || !activeProfileId) return;
  const id = activeProfileId;
  void perform(
    () => {
      // Exiting is allowed from the pause menu as well as every active phase.
      session.setPaused(false);
      session.end(id, false);
    },
    () => {
      document.querySelector("#pause-overlay")?.remove();
      renderBaseCamp();
    },
  );
}

function downloadProfiles(text: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "math-on-mars-backup.json";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function statText(module: Module): string {
  return modifiers(module)
    .map((m) => {
      const absolute = m.stat === "maxHp" || m.stat === "armor";
      const label = {
        maxHp: "max integrity",
        armor: "armor",
        damage: "damage",
        attackSpeed: "attack speed",
        moveSpeed: "move speed",
        healing: "healing",
        projectileSpeed: "projectile speed",
        pickupRadius: "pickup radius",
        luck: "luck",
      }[m.stat];
      return `+${Number((m.value * (absolute ? 1 : 100)).toFixed(2))}${absolute ? "" : "%"} ${label}`;
    })
    .join(" · ");
}

function rewardStats(run: RunState): string {
  const stats: [Module["stat"], string][] = [
    ["damage", "Damage"],
    ["attackSpeed", "Attack speed"],
    ["armor", "Armor"],
    ["moveSpeed", "Move speed"],
    ["projectileSpeed", "Projectile speed"],
    ["pickupRadius", "Pickup radius"],
    ["healing", "Healing"],
    ["luck", "Luck"],
  ];
  return `<aside class="reward-stats" aria-labelledby="marine-stats-title"><div class="marine-avatar" role="img" aria-label="Marine"></div><h2 id="marine-stats-title">Marine stats</h2><button class="stats-toggle button secondary" aria-expanded="false" aria-controls="marine-stat-values">Marine stats</button><dl id="marine-stat-values"><div><dt>Integrity</dt><dd>${Number(run.hp.toFixed(1))} / ${run.maxHp}</dd></div>${stats
    .map(([stat, label]) => {
      const value = moduleTotal(run.modules, stat);
      return `<div><dt>${label}</dt><dd>${stat === "armor" ? value : `+${Number((value * 100).toFixed(2))}%`}</dd></div>`;
    })
    .join("")}</dl></aside>`;
}

function ammoChip(ammo: Ammo, active: boolean): string {
  const quality = ammo.legendary ? "purple" : qualityFromTier(ammo.tier);
  return `<button class="ammo-chip level-card ${ammo.legendary ? "legendary" : quality} ${active ? "active" : ""}" data-ammo-id="${escapeHtml(ammo.id)}" title="${escapeHtml(ammo.legendary ? "All five ammo effects" : ammoEffect(ammo.type))}" aria-label="${active ? "Unequip" : "Equip"} ${escapeHtml(ammo.type)}, level ${ammo.tier}" aria-pressed="${active}">${levelBadge(ammo.tier, ammo.legendary)}${itemArt(ammoArtKey(ammo.type, ammo.legendary))}<span class="ammo-copy"><b>${ammo.legendary ? "Omni" : ammo.type}</b></span><span class="ammo-effect">${ammo.legendary ? "All five ammo effects" : ammoEffect(ammo.type)}</span><span class="ammo-action">${active ? "Unequip" : "Equip"}</span></button>`;
}

function ammoEffect(type: AmmoType): string {
  return (
    {
      Piercing: "Shots pass through extra slimes.",
      "Multi Shot": "Fires extra projectiles with every shot.",
      "Electric Chain": "Jumps from one slime to nearby targets.",
      Frost: "Slows slimes so you can keep your distance.",
      Fiery: "Burns slimes after the shot lands.",
    } as Record<AmmoType, string>
  )[type];
}
function qualityFromTier(tier: number): Quality {
  return QUALITY_ORDER[Math.max(0, Math.min(3, tier - 1))];
}
function formatTime(ms: number): string {
  return (Math.max(0, ms) / 1000).toFixed(1).padStart(4, "0");
}
function hashSeed(value: string): number {
  return [...value].reduce(
    (seed, character) => (seed * 31 + character.charCodeAt(0)) >>> 0,
    2166136261,
  );
}
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ]!,
  );
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && activeProfileId && activeProfile().activeRun)
    showPause("App switched away");
});
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !activeProfileId || !activeProfile().activeRun)
    return;
  if (document.querySelector("dialog[open]")) return;
  event.preventDefault();
  showPause("Mission paused");
});
window.addEventListener("blur", () => {
  if (activeProfileId && activeProfile().activeRun)
    showPause("Window focus changed");
});
window.addEventListener("orientationchange", () => {
  if (activeProfileId && activeProfile().activeRun) showPause("Screen rotated");
});

async function boot(): Promise<void> {
  app.innerHTML = `<section class="loading-screen" aria-label="Loading Math on Mars"><img class="splash-backdrop" src="${splashUrl}" alt="" aria-hidden="true"><img src="${splashUrl}" alt="Math on Mars"><div class="loading-progress"><p id="loading-status" role="status">Loading base camp…</p><progress id="camp-progress" max="1" value="0" aria-label="Loading base camp"></progress></div></section>`;
  try {
    await loadCampAssets((fraction) => {
      const progress =
        document.querySelector<HTMLProgressElement>("#camp-progress");
      if (progress) progress.value = fraction;
    });
  } catch (error) {
    document.querySelector(".loading-progress")!.innerHTML =
      `<p role="alert">${escapeHtml(error instanceof Error ? error.message : "Camp could not load.")}</p><button id="retry-camp" class="button primary">Retry loading</button>`;
    document.querySelector("#retry-camp")!.addEventListener("click", boot);
    return;
  }
  if (!import.meta.env.DEV)
    history.replaceState(null, "", releaseLocation(BUILD_VERSION));
  try {
    repository?.close();
    repository = new IndexedProfileRepository(
      indexedDB,
      STORAGE_KEY,
      localStorage,
    );
    session = new RunSession(await repository.load(), {
      commit: () => {
        throw new Error("Use a durable command.");
      },
    });
    // Opt-in development fixture; production always enters camp.
    if (
      import.meta.env.DEV &&
      document.documentElement.dataset.previewRun === "true" &&
      STORAGE_KEY.startsWith("math-on-mars-art-fixture-")
    ) {
      const profile = session.profiles[0];
      if (profile?.activeRun && (await profileLease.acquire(profile.id))) {
        activeProfileId = profile.id;
        resumeRun();
        return;
      }
    }
    renderBaseCamp();
  } catch (error) {
    app.inert = false;
    app.innerHTML = `<section class="terminal"><h1>Saved progress needs attention</h1><p>${escapeHtml(error instanceof Error ? error.message : "Storage is unavailable.")}</p><p>Your stored data has not been overwritten.</p><button id="reload-save" class="button primary">Retry loading</button><button id="recover-save" class="button secondary">Restore last valid backup</button><button id="recover-history" class="button secondary">Recover valid history without unresumable missions</button><button id="export-raw" class="text-button">Export stored data</button><p id="recovery-error" role="alert"></p></section>`;
    document.querySelector("#reload-save")!.addEventListener("click", boot);
    document
      .querySelector("#recover-save")!
      .addEventListener("click", async () => {
        try {
          session = new RunSession(await repository.recoverBackup(), {
            commit: () => {
              throw new Error("Use a durable command.");
            },
          });
          renderBaseCamp();
        } catch (failure) {
          document.querySelector("#recovery-error")!.textContent =
            String(failure);
        }
      });
    document
      .querySelector("#recover-history")!
      .addEventListener("click", async () => {
        try {
          session = new RunSession(await repository.recoverBackup(true), {
            commit: () => {
              throw new Error("Use a durable command.");
            },
          });
          renderBaseCamp();
        } catch (failure) {
          document.querySelector("#recovery-error")!.textContent =
            String(failure);
        }
      });
    document
      .querySelector("#export-raw")!
      .addEventListener("click", async () => {
        try {
          downloadProfiles(await repository.exportStored());
        } catch (failure) {
          document.querySelector("#recovery-error")!.textContent =
            String(failure);
        }
      });
  }
}
boot();
