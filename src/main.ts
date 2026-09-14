import { EQUIPMENT_CLIPS } from "./equipment-narration-manifest";
import {
  missionLengthForWaves,
  type MissionLength,
} from "../content/balance/missions";
import {
  usesFractionInput,
  fractionFields,
  bindFractionInput,
} from "./fraction-input";
import { InstalledNarration, type NarrationStatus } from "./narration";
import {
  previewForge,
  retainedForgeLoadout,
  omniEquipped,
  omniRateBonus,
  capacityRateBonus,
} from "./forge";
import { ammoSellPrice, previewMerges } from "./ammo";
import { rerollPrice } from "./shop";
import { CheckpointQueue } from "./checkpoint-queue";
import { modifiers, moduleTotal } from "./modules";
import "./style.css";
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
let session: RunSession;
const narration = new InstalledNarration();
const equipmentNarration = new InstalledNarration(
  EQUIPMENT_CLIPS,
  "/audio/equipment",
);
let narrationLoading = false;
let screenGeneration = 0;
let quizDraft = "";
let quizElapsedAtStart = 0;
let activeProfileId: string | null = null;
let combat: CombatController | null = null;
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

function cleanup(): void {
  screenGeneration++;
  narrationLoading = false;
  narration.stop();
  equipmentNarration.stop();
  resetTouch?.();
  resetTouch = null;
  if (timerId !== null) window.clearInterval(timerId);
  timerId = null;
  combat?.destroy();
  combat = null;
  if (quizKeyHandler) window.removeEventListener("keydown", quizKeyHandler);
  quizKeyHandler = null;
  paused = false;
  session.setPaused(false);
  app.inert = false;
}

function qualityPips(quality: Quality): string {
  const count = QUALITY_ORDER.indexOf(quality) + 1;
  return `<span class="pips" aria-label="${count} of 4 power pips">${Array.from({ length: 4 }, (_, i) => `<i class="${i < count ? "filled" : ""}"></i>`).join("")}</span>`;
}

function shell(content: string, screenClass = ""): string {
  return `<div class="app-shell ${screenClass}">
    <header class="topbar">
      <a class="brand" href="#" id="home-link" aria-label="Math on Mars home">
        <span class="planet-mark" aria-hidden="true"><i></i></span>
        <span><b>MATH</b><em>ON MARS</em></span>
      </a>
      <span class="build-tag">HOME MISSION // 01</span>
    </header>
    ${content}
  </div>`;
}

function bindHome(): void {
  bindEquipmentGuidance();
  document.querySelector("#home-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    if (activeProfileId && activeProfile().activeRun) {
      saveAndExit();
      return;
    }
    renderProfiles();
  });
}

function renderProfiles(): void {
  cleanup();
  activeProfileId = null;
  const cards = session.profiles
    .map((profile) => {
      const accuracy = profile.history.length
        ? Math.round(
            (profile.history.filter((h) => h.correctInitially).length /
              profile.history.length) *
              100,
          )
        : 0;
      return `<article class="profile-card">
      <div class="avatar" aria-hidden="true"><span></span></div>
      <div class="profile-copy"><p class="eyebrow">CADET PROFILE</p><h2>${escapeHtml(profile.name)}</h2>
        <p>Grade ${profile.grade} · ${profile.history.length} answers · ${accuracy}% first try</p></div>
      <button class="button primary" data-open-profile="${profile.id}">${profile.activeRun ? `Resume wave ${profile.activeRun.wave}` : "Choose mission"}</button>
    </article>`;
    })
    .join("");
  app.innerHTML = shell(
    `<section class="landing" id="content">
    <div class="landing-copy"><p class="eyebrow warm">MARS OUTPOST // LEARNING DEFENSE</p>
      <h1>Numbers power<br><span>the mission.</span></h1>
      <p class="lede">Dodge alien slimes, recharge with five math questions, and build one unstoppable Pulse Blaster.</p>
      <div class="feature-row"><span>5 questions</span><span>30 seconds</span><span>K–6 missions</span></div>
    </div>
    <div class="hero-art" aria-label="A space marine faces a green slime on Mars">
      <div class="mars-moon"></div><div class="antenna"></div><div class="marine-figure"><i class="gun"></i><i class="helmet"></i><i class="visor"></i><i class="body"></i><i class="boots"></i></div>
      <div class="slime-figure"><i></i><b></b></div><div class="terrain-lines"></div>
    </div>
  </section>
  <section class="profile-section" aria-labelledby="profiles-title">
    <div class="section-heading"><div><p class="eyebrow">LOCAL CREW</p><h2 id="profiles-title">Choose your cadet</h2></div><span>Your progress stays on this device.</span></div>
    <div class="profile-list">${cards || `<div class="empty-card"><p>No cadet profiles yet.</p></div>`}</div>
    <form id="new-profile" class="new-profile"><label for="cadet-name">New cadet name</label><div><input id="cadet-name" name="name" maxlength="18" autocomplete="nickname" placeholder="Cadet name"><button class="button secondary" type="submit">Create profile</button></div><p class="field-error" id="name-error"></p></form>
  </section>`,
    "home-screen",
  );
  bindHome();
  document
    .querySelectorAll<HTMLElement>("[data-open-profile]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        activeProfileId = button.dataset.openProfile!;
        const profile = activeProfile();
        profile.activeRun ? resumeRun() : renderSetup();
      }),
    );
  document
    .querySelector<HTMLFormElement>("#new-profile")!
    .addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.querySelector<HTMLInputElement>("#cadet-name")!;
      const name = input.value.trim();
      if (!name) {
        document.querySelector("#name-error")!.textContent =
          "Enter a cadet name to continue.";
        input.focus();
        return;
      }
      perform(
        () => session.createProfile(name),
        (id) => {
          activeProfileId = id;
          renderSetup();
        },
      );
    });
}

function renderSetup(): void {
  cleanup();
  const profile = activeProfile();
  app.innerHTML = shell(
    `<section class="terminal" id="content">
    <div class="terminal-heading"><p class="eyebrow warm">MISSION TERMINAL</p><h1>Ready, ${escapeHtml(profile.name)}?</h1><p>Choose your math track, combat difficulty, and mission length.</p></div>
    <form id="mission-form">
      <fieldset><legend>Math track</legend><div class="grade-grid">${GRADES.map((grade) => `<label class="choice-tile"><input type="radio" name="grade" value="${grade}" ${profile.grade === grade ? "checked" : ""}><span><b>${grade}</b><small>${gradeLabel(grade)}</small></span></label>`).join("")}</div></fieldset>
      <fieldset><legend>Combat difficulty</legend><div class="grade-grid"><label class="choice-tile"><input type="radio" name="difficulty" value="easy"><span><b>Easy</b><small>Slower enemies</small></span></label><label class="choice-tile"><input type="radio" name="difficulty" value="standard" checked><span><b>Standard</b><small>Full enemy speed</small></span></label></div></fieldset>
      <fieldset><legend>Mission length</legend><div class="grade-grid"><label class="choice-tile"><input type="radio" name="mission" value="standard" checked><span><b>Standard</b><small>10 waves · boss on wave 10</small></span></label><label class="choice-tile"><input type="radio" name="mission" value="short"><span><b>Short</b><small>6 waves · boss on wave 6</small></span></label></div></fieldset>
      <p>Both missions use five required questions and one 30-second countdown between waves. Start with a Pulse Blaster and white Piercing ammo.</p>
      <button class="button launch" type="submit"><span>Launch mission</span><i aria-hidden="true">→</i></button>
    </form>
  </section>`,
    "terminal-screen",
  );
  bindHome();
  document
    .querySelector<HTMLFormElement>("#mission-form")!
    .addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget as HTMLFormElement);
      perform(
        () =>
          session.start(
            profile.id,
            data.get("grade") as Grade,
            data.get("mission") as MissionLength,
            data.get("difficulty") as "easy" | "standard",
          ),
        renderCombat,
      );
    });
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
  const profile = activeProfile();
  const run = activeRun();
  const activeNames = run.activeAmmoIds
    .map((id) => run.ammo.find((a) => a.id === id))
    .filter(Boolean)
    .map((a) => (a!.legendary ? "Omni" : a!.type));
  app.innerHTML = `<div class="combat-screen ${profile.handedness === "right" ? "mirrored" : ""}" id="content">
    <div class="combat-hud top-left"><div class="portrait-mini"><span></span></div><div class="meter-stack"><div class="hud-label"><span>SUIT INTEGRITY</span><b id="hp-text">${Math.ceil(run.hp)} / ${run.maxHp}</b></div><div class="hp-track"><i id="hp-fill" style="width:${(run.hp / run.maxHp) * 100}%"></i></div><div class="ammo-readout">PULSE BLASTER · ${activeNames.join(" + ") || "STANDARD"}</div></div></div>
    <div class="wave-badge"><small>WAVE</small><b>${run.wave}<span>/ ${run.totalWaves}</span></b><em id="enemy-count">Incoming</em></div>
    <div class="combat-hud top-right"><div><small>SALVAGE</small><b id="salvage-count">${run.salvage}</b></div><button id="pause-button" class="icon-button" aria-label="Pause game">Ⅱ</button></div>
    <div id="combat-canvas" class="combat-canvas" aria-label="Combat arena"></div>
    <div class="touch-controls"><div id="joystick" class="joystick" aria-label="Movement control"><div id="stick-knob"></div></div>
      <button id="medkit-button" class="medkit-button" aria-label="Use med-kit"><i aria-hidden="true">+</i><span>MED-GEL <b id="medkit-count">${run.medkits}</b></span></button></div>
    <div class="combat-tip">${matchMedia("(pointer: coarse)").matches ? "DRAG TO MOVE · TAP MED-GEL TO HEAL · FIRING IS AUTOMATIC" : "MOVE: WASD / ARROWS · MED-GEL: Q · FIRING IS AUTOMATIC"}</div>
  </div>`;
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
  const medkits = document.querySelector<HTMLElement>("#medkit-count");
  if (medkits) medkits.textContent = String(state.medkits);
  const enemies = document.querySelector<HTMLElement>("#enemy-count");
  if (enemies)
    enemies.textContent = state.enemiesLeft
      ? `${state.enemiesLeft} hostiles`
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

function saveCheckpoint(after: () => void): void {
  const data = checkpoint();
  const id = activeProfileId!;
  void perform(() => session.checkpoint(id, data), after);
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
      (paused || narrationLoading
        ? 0
        : Math.max(0, performance.now() - quizStartedAt)),
  );
}

function prepareNarration(question: Question, ready: () => void): boolean {
  if (!question.speechClips?.length) return true;
  return prepareSpeech(narration, ready);
}
function prepareSpeech(player: InstalledNarration, ready: () => void): boolean {
  if (player.playable) return true;
  narrationLoading = true;
  quizElapsedAtStart = activeRun().quiz?.elapsedMs ?? 0;
  const generation = screenGeneration;
  app.innerHTML = shell(
    `<section class="terminal"><h1>Loading speech</h1><p id="audio-loading-status" role="status">This screen stays unavailable while its speech loads. Any question timer is stopped.</p><button id="enable-audio" class="button primary" hidden>Enable speech</button><button id="retry-audio" class="button secondary" hidden>Retry audio</button><button id="save-exit" class="text-button">Save & exit</button></section>`,
  );
  bindHome();
  document.querySelector("#save-exit")!.addEventListener("click", saveAndExit);
  document.querySelector("#retry-audio")!.addEventListener("click", ready);
  document.querySelector("#enable-audio")!.addEventListener("click", () => {
    void player
      .enable()
      .then(() => {
        if (screenGeneration === generation && !paused) ready();
      })
      .catch(() => {
        if (screenGeneration !== generation) return;
        const status = document.querySelector("#audio-loading-status");
        if (status)
          status.textContent =
            "Speech could not start. Tap Enable speech to try again.";
      });
  });
  void player
    .load()
    .then(() => {
      if (screenGeneration !== generation || paused) return;
      if (player.playable) ready();
      else {
        document.querySelector<HTMLButtonElement>("#enable-audio")!.hidden =
          false;
        document.querySelector("#audio-loading-status")!.textContent =
          "Speech is loaded. Tap Enable speech to continue.";
      }
    })
    .catch(() => {
      if (screenGeneration !== generation) return;
      document.querySelector("#audio-loading-status")!.textContent =
        "Audio could not load. Retry when the installed files are available.";
      document.querySelector<HTMLButtonElement>("#retry-audio")!.hidden = false;
    });
  return false;
}
function narrationControls(question: Question, correction = false): string {
  if (!question.speechClips?.length) return "";
  return `<div class="quiz-tools"><button id="replay-task" class="button secondary" type="button">Replay task</button>${correction && question.hintClips?.length ? '<button id="replay-hint" class="button secondary" type="button">Read hint</button>' : ""}<span id="speech-status" role="status"></span></div>`;
}
function speechStatusText(status: NarrationStatus): string {
  return {
    unavailable: "Speech is unavailable. Reload this screen to retry.",
    ready: "Choose a speech button to listen again.",
    playing: "Speech is playing. You can keep using this screen.",
    enable: "Tap a speech button to enable audio.",
  }[status];
}
function bindNarration(question: Question): void {
  if (!question.speechClips?.length) return;
  const play = (clips: string[]) => {
    if (paused) return;
    void narration.play(clips, (message) => {
      const status = document.querySelector("#speech-status");
      if (status) status.textContent = speechStatusText(message);
    });
  };
  document
    .querySelector("#replay-task")!
    .addEventListener("click", () => play(question.speechClips!));
  document
    .querySelector("#replay-hint")
    ?.addEventListener("click", () => play(question.hintClips!));
  play(question.speechClips);
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
  if (!prepareNarration(question, () => renderQuiz(message))) return;
  app.innerHTML = shell(
    `<section class="quiz-layout" id="content">
    <aside class="rarity-rail" aria-label="Reward power bands"><div class="rail-title">POWER LEVEL</div>${["purple", "blue", "green", "white"].map((q) => `<div class="rail-step ${q}" data-quality="${q}">${qualityPips(q as Quality)}<b>${QUALITY_LABEL[q as Quality]}</b><small>${q === "purple" ? "> 20s" : q === "blue" ? "> 10s" : q === "green" ? "> 0s" : "0s"}</small></div>`).join("")}</aside>
    <div class="quiz-main">
      <div class="quiz-topline"><div><p class="eyebrow warm">REACTOR RECHARGE</p><h1>Question ${quiz.index + 1} <span>of 5</span></h1></div><div class="countdown" id="countdown" aria-label="Time remaining"><small>SHARED TIME</small><b>${formatTime(quiz.remainingMs)}</b></div></div>
      <div class="mobile-tier-strip" id="mobile-tier">${qualityPips(timeQuality(quiz.remainingMs))}<b>${QUALITY_LABEL[timeQuality(quiz.remainingMs)]}</b><span>candidate</span></div>
      <div class="question-panel"><div class="question-copy"><p class="prompt">${escapeHtml(question.prompt)}</p>${questionVisuals(question)}${narrationControls(question)}
        ${usesFractionInput(question) ? fractionFields : '<label for="answer">Your answer</label>'}<output id="answer" class="answer-field" aria-live="polite" ${usesFractionInput(question) ? "hidden" : ""}>&nbsp;</output><p class="input-error" id="input-error">${escapeHtml(message)}</p>
        <div class="quiz-tools"><span>Take your best shot.</span><button id="save-exit" class="text-button" type="button">Save & exit</button></div></div>
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
  document.querySelector("#save-exit")!.addEventListener("click", saveAndExit);
  quizElapsedAtStart = quiz.elapsedMs;
  quizStartedAt = performance.now();
  timerId = window.setInterval(updateTimer, 50);
  bindNarration(question);
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
  if (strip)
    strip.innerHTML = `${qualityPips(quality)}<b>${QUALITY_LABEL[quality]}</b><span>candidate</span>`;
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

const equipmentLabels: Record<string, string> = {
  "power-white": "White power",
  "power-green": "Green power",
  "power-blue": "Blue power",
  "power-purple": "Purple power",
  cache: "Cache choices",
  buy: "Buying",
  equip: "Equipping",
  merge: "Merging",
  forge: "Legendary Omni forge",
  "next-wave": "Next wave",
  "save-exit": "Save & exit",
  piercing: "Piercing",
  "multi-shot": "Multi Shot",
  "electric-chain": "Electric Chain",
  frost: "Frost",
  fiery: "Fiery",
  armor: "Armor",
  reroll: "Reroll",
  sell: "Selling",
};
function moduleSpeechButton(module: Module): string {
  const clips = [
    module.stat,
    ...(module.additionalModifiers ?? []).map((modifier) => modifier.stat),
  ].map((stat) => `stat-${stat}`);
  return `<button class="button secondary" type="button" data-equipment-speech="${clips.join(",")}" aria-label="Hear effects of ${escapeHtml(module.name)}">Hear upgrade effects</button>`;
}
function equipmentGuidance(ids: string[]): string {
  return `<section class="equipment-guidance" aria-label="Spoken equipment help"><details><summary>Listen to equipment help</summary><div class="quiz-tools">${ids.map((id) => `<button class="button secondary" type="button" data-equipment-speech="${id}">${equipmentLabels[id]}</button>`).join("")}</div></details><p id="equipment-speech-status" role="status"></p></section>`;
}
function bindEquipmentGuidance(): void {
  const generation = screenGeneration;
  document
    .querySelectorAll<HTMLButtonElement>("[data-equipment-speech]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        if (paused) return;
        void equipmentNarration.play(
          button.dataset.equipmentSpeech!.split(","),
          (message) => {
            if (generation !== screenGeneration) return;
            const status = document.querySelector("#equipment-speech-status");
            if (status) status.textContent = speechStatusText(message);
          },
        );
      });
    });
}

function renderReward(): void {
  cleanup();
  if (!prepareSpeech(equipmentNarration, renderReward)) return;
  const run = activeRun();
  const quiz = run.quiz!;
  const quality = quiz.rewardQuality!;
  const wrong = quiz.attempts.filter((a) => !a.correct).length;
  const candidate = timeQuality(quiz.remainingMs);
  app.innerHTML = shell(
    `<section class="reward-screen" id="content">${equipmentGuidance([`power-${quality}`, "save-exit"])}
    <div class="reward-heading"><p class="eyebrow warm">FABRICATOR ONLINE</p><h1>Choose one upgrade</h1><p>${formatTime(quiz.remainingMs)} seconds remaining · Reward strengths are prototype tuning.</p><div class="outcome-row"><div><small>Time tier</small><b>${QUALITY_LABEL[candidate]}</b></div><span>− ${wrong} ${wrong === 1 ? "miss" : "misses"}</span><div class="quality-badge ${quality}">${qualityPips(quality)}<b>${QUALITY_LABEL[quality]}</b></div></div></div>
    <div class="reward-grid">${quiz.rewardChoices!.map((module, i) => `<article class="reward-card ${quality}"><div class="card-index">0${i + 1}</div><div class="module-icon ${module.stat}" aria-hidden="true"><i></i></div><p class="eyebrow">${moduleStatus(module, run.modules)}</p><h2>${escapeHtml(module.name)}</h2><div class="card-quality">${QUALITY_LABEL[quality]} ${qualityPips(quality)}</div><p class="stat-gain">${statText(module)}</p><p>${moduleDescription(module.stat)}</p><p>${rewardPreview(module, run)}</p>${moduleSpeechButton(module)}<button class="button primary" data-reward="${module.id}">Choose module</button></article>`).join("")}</div>
    <button id="save-exit" class="text-button centered">Save & exit</button>
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
  document.querySelector("#save-exit")!.addEventListener("click", saveAndExit);
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
    renderCache();
    return;
  }
  const attempt = misses[0];
  if (!prepareNarration(attempt.question, () => renderCorrection(message)))
    return;
  app.innerHTML = shell(
    `<section class="correction-screen" id="content"><div class="correction-copy"><p class="eyebrow warm">UNTIMED CORRECTION</p><h1>Let’s repair this one.</h1><p>Rewards are locked in. Work it through before the next wave.</p></div>
    <div class="correction-card"><div><span class="correction-count">${quiz.attempts.filter((a) => !a.correct).length - misses.length + 1} / ${quiz.attempts.filter((a) => !a.correct).length}</span><p class="prompt">${escapeHtml(attempt.question.prompt)}</p>${questionVisuals(attempt.question)}${narrationControls(attempt.question, true)}<div class="hint-box"><b>Mission hint</b><p>${escapeHtml(attempt.question.hint)}</p></div><details><summary>Show worked explanation</summary><p>${escapeHtml(attempt.question.explanation)}</p></details></div>
      <div>${usesFractionInput(attempt.question) ? fractionFields : '<label for="correction-input">Correct answer</label>'}<input id="correction-input" ${usesFractionInput(attempt.question) ? "hidden" : ""} inputmode="none" autocomplete="off" value="${escapeHtml(quiz.correctionDraft ?? "")}"><div class="keypad correction-keypad" aria-label="Correction number keypad">${["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "/", "back", "clear", "-"].map((key) => `<button type="button" data-correction-key="${key}" aria-label="${key === "/" ? "Fraction bar" : key === "back" ? "Backspace" : key === "-" ? "Minus" : key}">${key === "back" ? "⌫" : key === "clear" ? "Clear" : key}</button>`).join("")}</div><p class="input-error" id="correction-error">${escapeHtml(message)}</p><button id="correction-check" class="button primary">Check answer</button></div></div>
    <button id="save-exit" class="text-button centered">Save & exit</button></section>`,
    "correction-shell",
  );
  bindHome();
  const input = document.querySelector<HTMLInputElement>("#correction-input")!;
  bindNarration(attempt.question);
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
  document.querySelector("#save-exit")!.addEventListener("click", saveAndExit);
}

function renderCache(): void {
  cleanup();
  if (!prepareSpeech(equipmentNarration, renderCache)) return;
  const run = activeRun();
  if (run.cacheClaimed) {
    renderShop();
    return;
  }
  if (!run.choiceCache) {
    void perform(() => session.openCache(activeProfileId!), renderCache);
    return;
  }
  const cache = run.choiceCache;
  app.innerHTML = shell(
    `<section class="cache-screen" id="content">${equipmentGuidance(["cache", "piercing", "multi-shot", "electric-chain", "frost", "fiery", "armor", "save-exit"])}<div class="cache-heading"><p class="eyebrow warm">FREE SUPPLY DROP</p><h1>Choose one bundle</h1><p>Accept one upgrade or sell its complete bundle for salvage. All other choices close.</p></div>
    <div class="cache-grid">${cache.options
      .map((option) => {
        const type = option.kind === "ammo" ? option.ammo[0].type : undefined;
        const title =
          type ?? (option.kind === "module" ? option.module.name : "Ammo");
        return `<article class="cache-card"><div class="${type ? `ammo-icon ${ammoClass(type)}` : "module-icon armor"}"><i></i></div><h2>${escapeHtml(title)}</h2><p>${type ? ammoEffect(type) : "Take less damage when slimes reach you."}</p><div class="cache-tier">${type ? "Blue T3 ×2 · Ready to combine" : "Green module · +2 armor (up to cap)"}</div><button class="button secondary" data-cache-option="${escapeHtml(option.id)}" data-disposition="accept">Accept ${escapeHtml(title)}</button><button class="text-button" data-cache-option="${escapeHtml(option.id)}" data-disposition="sell">Sell bundle · ${option.sellPrice} salvage</button></article>`;
      })
      .join("")}</div>
    <button id="save-exit" class="text-button centered">Save & exit</button></section>`,
    "cache-shell",
  );
  bindHome();
  document
    .querySelectorAll<HTMLElement>("[data-cache-option]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        if (!paused)
          void perform(
            () =>
              session.settleCache(
                activeProfileId!,
                cache.id,
                button.dataset.cacheOption!,
                button.dataset.disposition as "accept" | "sell",
              ),
            () => renderShop(),
          );
      }),
    );
  document.querySelector("#save-exit")!.addEventListener("click", saveAndExit);
}

function renderShop(message = ""): void {
  cleanup();
  if (!prepareSpeech(equipmentNarration, () => renderShop(message))) return;
  const run = activeRun();
  if (run.forgeIngredientIds) {
    forgeOmni();
    return;
  }
  if (!run.shop) {
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
  const merges = mergePreview.pairs
    .map(([firstId, secondId], index) => {
      const first = run.ammo.find((a) => a.id === firstId)!;
      const equipped =
        run.activeAmmoIds.includes(firstId) ||
        run.activeAmmoIds.includes(secondId);
      return `<li><label><input type="checkbox" data-merge-pair="${index}" checked> 2 × ${first.type} T${first.tier} → 1 × T${first.tier + 1}${equipped ? " · replaces equipped ingredient in its slot" : " · stays in reserve"}</label></li>`;
    })
    .join("");
  const purpleTypes = new Set(
    run.ammo
      .filter((ammo) => ammo.tier === 4 && !ammo.legendary)
      .map((ammo) => ammo.type),
  ).size;
  app.innerHTML = shell(
    `<section class="shop-screen" id="content">${equipmentGuidance(["buy", "reroll", "equip", "merge", "sell", "forge", "next-wave", "save-exit"])}<div class="shop-top"><div><p class="eyebrow warm">BETWEEN WAVES</p><h1>Gear up for wave ${run.wave + 1}</h1><p>Everything here is optional. Your current gear is ready to go.</p></div><div class="salvage-chip"><small>SALVAGE</small><b>${run.salvage}</b></div></div><p class="shop-message" role="status">${escapeHtml(message)}</p>
    <section class="market-panel" aria-labelledby="shop-title"><div class="panel-heading"><div><p class="eyebrow">OUTPOST SHOP</p><h2 id="shop-title">Buy an upgrade</h2></div><span>Four choices</span></div>
      <div class="shop-offers">${offers.map((offer, i) => (offer.purchased ? `<article class="shop-offer bought"><span>0${i + 1}</span><p>Purchased · slot empty</p></article>` : `<article class="shop-offer ${run.shopBought.includes(offer.id) ? "bought" : ""}"><span>0${i + 1}</span><div class="shop-offer-icon ${offer.kind}" aria-hidden="true"><i></i></div><h3>${escapeHtml(offer.title)}</h3>${offer.kind === "module" ? `<p>${QUALITY_LABEL[offer.module.quality]} ${qualityPips(offer.module.quality)} · ${moduleStatus(offer.module, run.modules)}</p>` : ""}<p>${offer.module ? statText(offer.module) : offer.detail}</p>${offer.module ? `<p>${rewardPreview(offer.module, run)}</p>${moduleSpeechButton(offer.module)}` : ""}<button class="button secondary" data-buy="${escapeHtml(offer.id)}" ${offer.disabled || run.shopBought.includes(offer.id) ? "disabled" : ""}>${run.shopBought.includes(offer.id) ? "Bought" : `Buy · ${offer.price} salvage`}</button></article>`)).join("")}</div>
      <button id="reroll-shop" class="button secondary">Reroll unpurchased · ${rerollPrice(run)} salvage</button><p>Buy all four for a free refill. Purchased slots stay empty until then.</p>
    </section>
    <section class="loadout"><details><summary>Marine stats</summary><p>${marineStats(run)}</p></details><div class="loadout-heading"><div><p class="eyebrow">YOUR EQUIPMENT</p><h2>Pulse Blaster</h2><p>Tap Equip on any ammo card. When your active slots are full, it replaces the rightmost ammo.</p></div>${purpleTypes > 0 || canForge(run) ? `<div class="omni-progress"><small>OMNI AMMO</small><b>${purpleTypes} / 5</b><button id="forge-button" class="button forge" >View forge recipe</button></div>` : ""}</div>
      <div class="weapon-dock"><div class="blaster-card"><div class="blaster-icon" aria-hidden="true"><i></i></div><div><small>ONE WEAPON</small><b>Pulse Blaster</b></div></div><div class="loaded-ammo"><small>ACTIVE AMMO · ${activeAmmo.length}/${run.ammoCapacity}</small>${omniEquipped(run) ? `<p>Omni stabilizer: +${Math.round(omniRateBonus(run) * 100)}% firing rate. Extra normal ammo adds no power.</p>` : ""}<div>${activeAmmo.map((ammo) => `<span>${ammo.legendary ? "Omni" : ammo.type} T${ammo.tier}</span>`).join("") || "<em>No ammo equipped</em>"}${Array.from({ length: Math.max(0, run.ammoCapacity - activeAmmo.length) }, () => "<i>Empty</i>").join("")}</div></div></div>
      <div class="reserve"><div class="panel-heading compact"><div><p class="eyebrow">AMMO LOCKER</p><h3>Owned ammo</h3></div><span>${run.ammo.length} cartridge${run.ammo.length === 1 ? "" : "s"}</span></div><div class="reserve-grid">${reserveStacks(run)}</div></div>
      ${merges ? `<div class="merge-row"><div><p class="eyebrow">READY TO UPGRADE</p><span>Combine two matching cartridges into one stronger cartridge.</span></div><details><summary>Preview ${mergePreview.pairs.length} merge${mergePreview.pairs.length === 1 ? "" : "s"}</summary><ul>${merges}</ul><p>Only these pairs are combined. New results stay available for your next merge.</p><button id="confirm-merges" class="button secondary">Confirm merges</button></details></div>` : ""}
    </section>
    <div class="shop-actions"><button id="save-exit" class="text-button">Save & exit</button><div><small>No purchase required</small><button id="next-wave" class="button launch">Start wave ${run.wave + 1} <i aria-hidden="true">→</i></button></div></div>
  </section>`,
    "shop-shell",
  );
  bindHome();
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
  document.querySelector("#confirm-merges")?.addEventListener("click", () => {
    if (!paused)
      void perform(
        () =>
          session.mergePreview(activeProfileId!, {
            ...mergePreview,
            pairs: mergePreview.pairs.filter(
              (_, index) =>
                document.querySelector<HTMLInputElement>(
                  `[data-merge-pair="${index}"]`,
                )?.checked,
            ),
          }),
        (message) => renderShop(message),
      );
  });
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
  document.querySelector("#save-exit")!.addEventListener("click", saveAndExit);
  document.querySelector("#next-wave")!.addEventListener("click", () => {
    if (!paused)
      perform(() => session.nextWave(activeProfileId!), renderCombat);
  });
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

function reserveStacks(run: RunState): string {
  const groups = new Map<string, Ammo[]>();
  for (const ammo of run.ammo) {
    const key = `${ammo.type}:${ammo.tier}:${!!ammo.legendary}`;
    const group = groups.get(key) ?? [];
    group.push(ammo);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => {
      const active = group.find((a) => run.activeAmmoIds.includes(a.id));
      const representative = active ?? group[0];
      const sellable = group.find(
        (a) => !a.legendary && !run.activeAmmoIds.includes(a.id),
      );
      return `<article>${ammoChip(representative, !!active)}<p>${group.length} owned${active ? " · 1 equipped" : " · reserve"}</p>${sellable ? `<button class="text-button" data-sell-ammo="${escapeHtml(sellable.id)}">Sell 1 unequipped · ${ammoSellPrice(sellable)} salvage</button>` : ""}</article>`;
    })
    .join("");
}

function forgeOmni(): void {
  if (paused) return;
  cleanup();
  if (!prepareSpeech(equipmentNarration, forgeOmni)) return;
  const run = activeRun();
  if (!run.forgeIngredientIds) {
    void perform(
      () => session.selectForgeIngredients(activeProfileId!),
      forgeOmni,
    );
    return;
  }
  const preview = previewForge(run);
  app.innerHTML = shell(
    `<section class="shop-screen" id="content">${equipmentGuidance(["forge", "save-exit"])}<p class="eyebrow">LEGENDARY FORGE</p><h1>Legendary Omni Ammo</h1><p>Combine five purple cartridges into all five effects in one slot. Once per run.</p>
    ${AMMO_TYPES.map((type) => {
      const copies = run.ammo.filter(
        (a) => !a.legendary && a.type === type && a.tier === 4,
      );
      return `<label class="forge-ingredient">${type} · Purple ●●●● <select data-forge-type="${type}" ${copies.length ? "" : "disabled"}>${copies.length ? copies.map((a, index) => `<option value="${escapeHtml(a.id)}" ${preview.ingredientIds.includes(a.id) ? "selected" : ""}>Copy ${index + 1}${run.activeAmmoIds.includes(a.id) ? " · equipped" : " · reserve"}</option>`).join("") : '<option value="">Missing ingredient</option>'}</select></label>`;
    }).join("")}
    <p id="forge-loadout"></p><p>Omni stabilizer: +${Math.round(capacityRateBonus(run.ammoCapacity) * 100)}% firing rate while equipped. Normal ammo adds no extra effects alongside Omni.</p><p>Unconsumed cartridges stay owned, including any moved out of active slots.</p>
    <button id="confirm-forge" class="button forge" ${canForge(run) ? "" : "disabled"}>${run.forgedOmni || run.ammo.some((a) => a.legendary) ? "Already forged this run" : "Forge selected cartridges"}</button><button id="back-shop" class="text-button">Back to shop</button><button id="save-exit" class="text-button">Save & exit</button></section>`,
    "shop-shell",
  );
  const selected = () =>
    Array.from(
      document.querySelectorAll<HTMLSelectElement>("[data-forge-type]"),
    ).map((select) => select.value);
  const updatePreview = () => {
    const retained = retainedForgeLoadout(run, selected());
    document.querySelector("#forge-loadout")!.textContent =
      `Resulting active slots, in priority order: Omni${retained
        .map((id) => {
          const ammo = run.ammo.find((a) => a.id === id)!;
          return ` → ${ammo.type} T${ammo.tier} (redundant)`;
        })
        .join("")}.`;
  };
  document.querySelectorAll("[data-forge-type]").forEach((select) =>
    select.addEventListener("change", () => {
      const ids = selected().filter(Boolean);
      if (!paused)
        void perform(
          () => session.selectForgeIngredients(activeProfileId!, ids),
          forgeOmni,
        );
    }),
  );
  updatePreview();
  document.querySelector("#confirm-forge")!.addEventListener("click", () => {
    const choice = { ...preview, ingredientIds: selected() };
    if (!paused)
      void perform(
        () => session.forge(activeProfileId!, choice),
        () => renderShop("Forge selection resolved."),
      );
  });
  document.querySelector("#back-shop")!.addEventListener("click", () => {
    void perform(
      () => session.cancelForge(activeProfileId!),
      () => renderShop(),
    );
  });
  document.querySelector("#save-exit")!.addEventListener("click", saveAndExit);
  bindHome();
}

function endRun(victory: boolean, state?: CombatSnapshot): void {
  perform(
    () => session.end(activeProfileId!, victory, state),
    (summary) => {
      if (!summary) return;
      cleanup();
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
    <div class="summary-actions">${victory ? "" : `<button id="retry-mission" class="button primary">Retry mission</button>`}<button id="return-home" class="button ${victory ? "launch" : "secondary"}">Return to crew</button></div></section>`,
        "summary-shell",
      );
      bindHome();
      document
        .querySelector("#retry-mission")
        ?.addEventListener("click", () =>
          perform(
            () =>
              session.start(
                profile.id,
                run.grade,
                missionLengthForWaves(run.totalWaves),
                run.difficulty,
              ),
            renderCombat,
          ),
        );
      document
        .querySelector("#return-home")!
        .addEventListener("click", renderProfiles);
    },
  );
}

function setBlocked(blocked: boolean): void {
  paused = blocked;
  session.setPaused(blocked);
  app.inert = blocked;
  if (blocked) {
    narration.stop();
    equipmentNarration.stop();
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
      overlay.innerHTML = `<div class="pause-dialog" role="alertdialog" aria-modal="true"><h2>Progress could not be saved</h2><p>${escapeHtml(error instanceof Error ? error.message : "Storage is unavailable.")}</p><p>The change has not been applied. Retry saving before continuing.</p><button class="button primary" id="retry-save">Retry save</button><button class="text-button" id="export-safe">Export last saved progress</button></div>`;
      document.body.append(overlay);
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
      overlay.className = "pause-overlay";
      overlay.id = "pause-overlay";
      overlay.innerHTML = `<div class="pause-dialog" role="dialog" aria-modal="true" aria-labelledby="pause-title"><p class="eyebrow warm">MISSION HOLD</p><h2 id="pause-title">${escapeHtml(title)}</h2><p>Combat and question time are stopped.</p><button id="mirror-controls" class="button">Move with ${activeProfile().handedness === "left" ? "right" : "left"} thumb</button><button id="resume-button" class="button primary">Resume</button><button id="pause-exit" class="text-button">Save & exit</button></div>`;
      document.body.append(overlay);
      overlay.querySelector<HTMLButtonElement>("#resume-button")!.focus();
      overlay
        .querySelector("#mirror-controls")!
        .addEventListener("click", () => {
          const next = activeProfile().handedness === "left" ? "right" : "left";
          perform(
            () => session.setHandedness(activeProfileId!, next),
            () => {
              document
                .querySelector(".combat-screen")
                ?.classList.toggle("mirrored", next === "right");
              overlay.querySelector("#mirror-controls")!.textContent =
                `Move with ${next === "left" ? "right" : "left"} thumb`;
            },
          );
        });
      overlay.querySelector("#resume-button")!.addEventListener("click", () => {
        if (saving) return;
        overlay.remove();
        setBlocked(false);
        combat?.resume();
        const run = activeRun();
        const pendingQuestion =
          run.phase === "quiz"
            ? run.quiz?.questions[run.quiz.index]
            : run.phase === "correction"
              ? run.quiz?.attempts.find((attempt) => !attempt.corrected)
                  ?.question
              : undefined;
        if (
          narrationLoading ||
          (["reward", "cache", "shop"].includes(run.phase) &&
            !equipmentNarration.playable) ||
          (pendingQuestion?.speechClips?.length && !narration.playable)
        ) {
          resumeRun();
          return;
        }
        if (activeRun().phase === "quiz") {
          quizElapsedAtStart = activeRun().quiz!.elapsedMs;
          quizStartedAt = performance.now();
          timerId = window.setInterval(updateTimer, 50);
        }
      });
      overlay.querySelector("#pause-exit")!.addEventListener("click", () => {
        if (saving) return;
        overlay.remove();
        renderProfiles();
      });
    },
  );
}

function saveAndExit(): void {
  saveCheckpoint(renderProfiles);
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
      }[m.stat];
      return `+${Number((m.value * (absolute ? 1 : 100)).toFixed(2))}${absolute ? "" : "%"} ${label}`;
    })
    .join(" · ");
}

function moduleStatus(module: Module, owned: Module[]): string {
  if (owned.some((m) => m.name === module.name)) return "Add another";
  const family = module.name.split(" ").at(-1);
  return owned.some((m) => m.name.split(" ").at(-1) === family)
    ? "New variant"
    : "New module";
}
function marineStats(run: RunState): string {
  return [
    `${run.hp.toFixed(1)} / ${run.maxHp} integrity`,
    ...(
      [
        "damage",
        "attackSpeed",
        "projectileSpeed",
        "moveSpeed",
        "pickupRadius",
        "healing",
        "armor",
      ] as Module["stat"][]
    ).map((stat) =>
      statText({
        id: "summary",
        name: "",
        quality: "white",
        stat,
        value: moduleTotal(run.modules, stat),
      }),
    ),
  ].join(" · ");
}

function rewardPreview(module: Module, run: RunState): string {
  return (
    "After install: " +
    modifiers(module)
      .map((m) => {
        const total = moduleTotal([...run.modules, module], m.stat);
        if (m.stat === "maxHp")
          return `${run.maxHp + total - moduleTotal(run.modules, "maxHp")} max integrity`;
        return statText({
          ...module,
          stat: m.stat,
          value: total,
          additionalModifiers: [],
        });
      })
      .join(" · ")
  );
}

function moduleDescription(stat: Module["stat"]): string {
  return {
    damage: "Harder impacts on every shot.",
    attackSpeed: "Faster automatic Pulse Blaster fire.",
    maxHp: "More room for damage before suit failure.",
    armor: "Reduce damage from contact and projectiles.",
    moveSpeed: "Quicker dodges across the arena.",
    healing: "Med-gel restores more integrity.",
    projectileSpeed: "Shots reach slimes sooner.",
    pickupRadius: "Collect salvage from farther away.",
  }[stat];
}

function ammoChip(ammo: Ammo, active: boolean): string {
  const quality = ammo.legendary ? "purple" : qualityFromTier(ammo.tier);
  return `<button class="ammo-chip ${ammo.legendary ? "legendary" : `tier-${ammo.tier}`} ${active ? "active" : ""}" data-ammo-id="${ammo.id}"><span class="ammo-icon ${ammo.legendary ? "omni" : ammoClass(ammo.type)}"><i></i></span><span class="ammo-copy"><b>${ammo.legendary ? "Legendary Omni" : ammo.type}</b><small>${ammo.legendary ? "All five effects" : `${QUALITY_LABEL[quality]} · T${ammo.tier}`}</small></span><span class="ammo-action">${active ? "Unequip" : "Equip"}</span></button>`;
}

function ammoClass(type: AmmoType): string {
  return type.toLowerCase().replaceAll(" ", "-");
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
function gradeLabel(grade: Grade): string {
  return (
    {
      K: "Count & compare",
      1: "Within 20",
      2: "Within 100",
      3: "Multiply & divide",
      4: "Fractions & products",
      5: "Decimals & fractions",
      6: "Ratios & equations",
    } as Record<Grade, string>
  )[grade];
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
  try {
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
    renderProfiles();
  } catch (error) {
    app.inert = false;
    app.innerHTML = `<section class="terminal"><h1>Saved progress needs attention</h1><p>${escapeHtml(error instanceof Error ? error.message : "Storage is unavailable.")}</p><p>Your stored data has not been overwritten.</p><button id="reload-save" class="button primary">Retry loading</button><button id="recover-save" class="button secondary">Restore last valid backup</button><button id="export-raw" class="text-button">Export stored data</button><p id="recovery-error" role="alert"></p></section>`;
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
          renderProfiles();
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
