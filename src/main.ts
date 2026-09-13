import "./style.css";
import { CombatController, type CombatSnapshot } from "./combat";
import { isCorrect, makeQuestions, parseNumericAnswer } from "./questions";
import {
  AMMO_TYPES, GRADES, QUALITY_LABEL, QUALITY_ORDER, uid,
  type Ammo, type AmmoType, type Grade, type Module, type Profile, type Quality, type RunState,
} from "./types";

const STORAGE_KEY = "math-on-mars-profiles-v1";
const app = document.querySelector<HTMLElement>("#app")!;
const announcer = document.querySelector<HTMLElement>("#announcer")!;
let profiles = loadProfiles();
let activeProfileId: string | null = null;
let combat: CombatController | null = null;
let timerId: number | null = null;
let quizStartedAt = 0;
let paused = false;
let quizKeyHandler: ((event: KeyboardEvent) => void) | null = null;
let combatCheckpointId: number | null = null;

const moduleCatalog: Array<Omit<Module, "id" | "value" | "quality"> & { base: number }> = [
  { name: "Rapid Overclock", stat: "attackSpeed", base: .06 },
  { name: "Ballistic Overclock", stat: "damage", base: .08 },
  { name: "Integrity Plating", stat: "maxHp", base: 10 },
  { name: "Reactive Plating", stat: "armor", base: 2 },
  { name: "Thruster Drive", stat: "moveSpeed", base: .05 },
  { name: "Med-service Loop", stat: "healing", base: .12 },
];

function loadProfiles(): Profile[] {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Profile[];
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function saveProfiles(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function activeProfile(): Profile {
  const profile = profiles.find((p) => p.id === activeProfileId);
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
  requestAnimationFrame(() => { announcer.textContent = message; });
}

function cleanup(): void {
  if (timerId !== null) window.clearInterval(timerId);
  if (combatCheckpointId !== null) window.clearInterval(combatCheckpointId);
  timerId = null;
  combatCheckpointId = null;
  combat?.destroy();
  combat = null;
  if (quizKeyHandler) window.removeEventListener("keydown", quizKeyHandler);
  quizKeyHandler = null;
  paused = false;
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
  document.querySelector("#home-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    if (activeProfileId && activeProfile().activeRun) {
      persistCurrentQuizTime();
      persistCombatState();
      saveProfiles();
    }
    renderProfiles();
  });
}

function renderProfiles(): void {
  cleanup();
  activeProfileId = null;
  const cards = profiles.map((profile) => {
    const accuracy = profile.history.length
      ? Math.round(profile.history.filter((h) => h.correctInitially).length / profile.history.length * 100)
      : 0;
    return `<article class="profile-card">
      <div class="avatar" aria-hidden="true"><span></span></div>
      <div class="profile-copy"><p class="eyebrow">CADET PROFILE</p><h2>${escapeHtml(profile.name)}</h2>
        <p>Grade ${profile.grade} · ${profile.history.length} answers · ${accuracy}% first try</p></div>
      <button class="button primary" data-open-profile="${profile.id}">${profile.activeRun ? `Resume wave ${profile.activeRun.wave}` : "Choose mission"}</button>
    </article>`;
  }).join("");
  app.innerHTML = shell(`<section class="landing" id="content">
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
  </section>`, "home-screen");
  bindHome();
  document.querySelectorAll<HTMLElement>("[data-open-profile]").forEach((button) => button.addEventListener("click", () => {
    activeProfileId = button.dataset.openProfile!;
    const profile = activeProfile();
    profile.activeRun ? resumeRun() : renderSetup();
  }));
  document.querySelector<HTMLFormElement>("#new-profile")!.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.querySelector<HTMLInputElement>("#cadet-name")!;
    const name = input.value.trim();
    if (!name) { document.querySelector("#name-error")!.textContent = "Enter a cadet name to continue."; input.focus(); return; }
    const profile: Profile = { id: uid("profile"), name, grade: "3", handedness: "left", history: [], victories: 0 };
    profiles.push(profile); saveProfiles(); activeProfileId = profile.id; renderSetup();
  });
}

function renderSetup(): void {
  cleanup();
  const profile = activeProfile();
  app.innerHTML = shell(`<section class="terminal" id="content">
    <div class="terminal-heading"><p class="eyebrow warm">MISSION TERMINAL</p><h1>Ready, ${escapeHtml(profile.name)}?</h1><p>Choose the grade-level math track for this mission.</p></div>
    <form id="mission-form">
      <fieldset><legend>Math track</legend><div class="grade-grid">${GRADES.map((grade) => `<label class="choice-tile"><input type="radio" name="grade" value="${grade}" ${profile.grade === grade ? "checked" : ""}><span><b>${grade}</b><small>${gradeLabel(grade)}</small></span></label>`).join("")}</div></fieldset>
      <div class="mission-brief"><div><span class="mission-number">10</span><p><b>Waves</b><small>Nine recharges, then the Overmind</small></p></div><div><span class="mission-number">01</span><p><b>Pulse Blaster</b><small>White Piercing equipped</small></p></div></div>
      <button class="button launch" type="submit"><span>Launch mission</span><i aria-hidden="true">→</i></button>
    </form>
  </section>`, "terminal-screen");
  bindHome();
  document.querySelector<HTMLFormElement>("#mission-form")!.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    profile.grade = data.get("grade") as Grade;
    profile.handedness = "left";
    profile.activeRun = newRun(profile.grade);
    saveProfiles(); renderCombat();
  });
}

function newRun(grade: Grade): RunState {
  const starter: Ammo = { id: uid("ammo"), type: "Piercing", tier: 1 };
  return { id: uid("run"), grade, wave: 1, totalWaves: 10, difficulty: "standard", hp: 100, maxHp: 100, salvage: 0, medkits: 1,
    ammoCapacity: 1, ammo: [starter], activeAmmoIds: [starter.id], modules: [], phase: "combat", shopBought: [], cacheClaimed: false };
}

function resumeRun(): void {
  const run = activeRun();
  if (run.totalWaves === 3) run.totalWaves = 10;
  if (!run.shopBought) run.shopBought = [];
  if (run.cacheClaimed === undefined) run.cacheClaimed = false;
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
  const activeNames = run.activeAmmoIds.map((id) => run.ammo.find((a) => a.id === id)).filter(Boolean).map((a) => a!.legendary ? "Omni" : a!.type);
  app.innerHTML = `<div class="combat-screen ${profile.handedness === "right" ? "mirrored" : ""}" id="content">
    <div class="combat-hud top-left"><div class="portrait-mini"><span></span></div><div class="meter-stack"><div class="hud-label"><span>SUIT INTEGRITY</span><b id="hp-text">${Math.ceil(run.hp)} / ${run.maxHp}</b></div><div class="hp-track"><i id="hp-fill" style="width:${run.hp / run.maxHp * 100}%"></i></div><div class="ammo-readout">PULSE BLASTER · ${activeNames.join(" + ") || "STANDARD"}</div></div></div>
    <div class="wave-badge"><small>WAVE</small><b>${run.wave}<span>/ ${run.totalWaves}</span></b><em id="enemy-count">Incoming</em></div>
    <div class="combat-hud top-right"><div><small>SALVAGE</small><b id="salvage-count">${run.salvage}</b></div><button id="pause-button" class="icon-button" aria-label="Pause game">Ⅱ</button></div>
    <div id="combat-canvas" class="combat-canvas" aria-label="Combat arena"></div>
    <div class="touch-controls"><div id="joystick" class="joystick" aria-label="Movement control"><div id="stick-knob"></div></div>
      <button id="medkit-button" class="medkit-button" aria-label="Use med-kit"><i aria-hidden="true">+</i><span>MED-GEL <b id="medkit-count">${run.medkits}</b></span></button></div>
    <div class="combat-tip">MOVE: WASD / ARROWS <span>·</span> MED-GEL: Q</div>
  </div>`;
  const host = document.querySelector<HTMLElement>("#combat-canvas")!;
  combat = new CombatController({ parent: host, wave: run.wave, totalWaves: run.totalWaves, difficulty: run.difficulty,
    hp: run.hp, maxHp: run.maxHp, salvage: run.salvage, medkits: run.medkits, ammo: run.ammo,
    activeAmmoIds: run.activeAmmoIds, modules: run.modules, restore: run.combatSave, seed: hashSeed(`${run.id}-${run.wave}`),
    onHud: (state) => updateCombatHud(state),
    onComplete: (state) => finishWave(state),
    onDefeat: (state) => endRun(false, state),
  });
  bindTouchControls();
  combatCheckpointId = window.setInterval(() => {
    persistCombatState();
    saveProfiles();
  }, 5000);
  document.querySelector("#pause-button")!.addEventListener("click", () => showPause("Mission paused"));
}

function updateCombatHud(state: CombatSnapshot): void {
  const run = activeRun();
  run.hp = state.hp; run.salvage = state.salvage; run.medkits = state.medkits;
  const hp = document.querySelector<HTMLElement>("#hp-text");
  if (hp) hp.textContent = `${Math.ceil(state.hp)} / ${state.maxHp}`;
  const fill = document.querySelector<HTMLElement>("#hp-fill");
  if (fill) fill.style.width = `${Math.max(0, state.hp / state.maxHp * 100)}%`;
  const salvage = document.querySelector<HTMLElement>("#salvage-count"); if (salvage) salvage.textContent = String(state.salvage);
  const medkits = document.querySelector<HTMLElement>("#medkit-count"); if (medkits) medkits.textContent = String(state.medkits);
  const enemies = document.querySelector<HTMLElement>("#enemy-count"); if (enemies) enemies.textContent = state.enemiesLeft ? `${state.enemiesLeft} hostiles` : "Area clear";
}

function persistCombatState(): void {
  if (!activeProfileId || !combat) return;
  const run = activeProfile().activeRun;
  if (!run || run.phase !== "combat") return;
  const snapshot = combat.snapshot();
  if (!snapshot) return;
  run.combatSave = snapshot;
  run.hp = snapshot.hp;
  run.salvage = snapshot.salvage;
  run.medkits = snapshot.medkits;
}

function bindTouchControls(): void {
  const zone = document.querySelector<HTMLElement>("#joystick")!;
  const knob = document.querySelector<HTMLElement>("#stick-knob")!;
  let pointerId: number | null = null;
  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    const rect = zone.getBoundingClientRect();
    let x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width * .32);
    let y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height * .32);
    const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
    knob.style.translate = `${x * 34}px ${y * 34}px`; combat?.setTouchVector(x, y);
  };
  zone.addEventListener("pointerdown", (event) => { pointerId = event.pointerId; zone.setPointerCapture(event.pointerId); move(event); });
  zone.addEventListener("pointermove", move);
  const release = (event: PointerEvent) => { if (event.pointerId !== pointerId) return; pointerId = null; knob.style.translate = "0 0"; combat?.setTouchVector(0, 0); };
  zone.addEventListener("pointerup", release); zone.addEventListener("pointercancel", release); zone.addEventListener("lostpointercapture", release);
  document.querySelector("#medkit-button")!.addEventListener("pointerup", () => combat?.useMedkit());
}

function finishWave(state: CombatSnapshot): void {
  const run = activeRun();
  run.hp = state.hp; run.salvage = Math.max(state.salvage, run.wave === 1 ? 8 : state.salvage); run.medkits = state.medkits;
  run.combatSave = undefined;
  combat?.destroy(); combat = null;
  if (run.wave === run.totalWaves) { endRun(true, state); return; }
  run.phase = "quiz";
  run.quiz = { questions: makeQuestions(run.grade, run.wave, activeProfile().id), index: 0, attempts: [], elapsedMs: 0, remainingMs: 30000, correctionIndex: 0 };
  saveProfiles(); renderQuiz();
}

function persistCurrentQuizTime(): void {
  if (!activeProfileId) return;
  const run = activeProfile().activeRun;
  if (!run?.quiz || run.phase !== "quiz" || !quizStartedAt || paused) return;
  run.quiz.elapsedMs = Math.min(30000, run.quiz.elapsedMs + performance.now() - quizStartedAt);
  run.quiz.remainingMs = Math.max(0, 30000 - run.quiz.elapsedMs);
  quizStartedAt = performance.now();
}

function renderQuiz(message = ""): void {
  cleanup();
  const run = activeRun();
  const quiz = run.quiz!;
  const question = quiz.questions[quiz.index];
  app.innerHTML = shell(`<section class="quiz-layout" id="content">
    <aside class="rarity-rail" aria-label="Reward power bands"><div class="rail-title">POWER LEVEL</div>${["purple", "blue", "green", "white"].map((q) => `<div class="rail-step ${q}" data-quality="${q}">${qualityPips(q as Quality)}<b>${QUALITY_LABEL[q as Quality]}</b><small>${q === "purple" ? "> 20s" : q === "blue" ? "> 10s" : q === "green" ? "> 0s" : "0s"}</small></div>`).join("")}</aside>
    <div class="quiz-main">
      <div class="quiz-topline"><div><p class="eyebrow warm">REACTOR RECHARGE</p><h1>Question ${quiz.index + 1} <span>of 5</span></h1></div><div class="countdown" id="countdown" aria-label="Time remaining"><small>SHARED TIME</small><b>${formatTime(quiz.remainingMs)}</b></div></div>
      <div class="mobile-tier-strip" id="mobile-tier">${qualityPips(timeQuality(quiz.remainingMs))}<b>${QUALITY_LABEL[timeQuality(quiz.remainingMs)]}</b><span>candidate</span></div>
      <div class="question-panel"><div class="question-copy"><p class="prompt">${escapeHtml(question.prompt)}</p>${question.visualCount ? `<div class="cell-grid" aria-label="${question.visualCount} energy cells">${Array.from({ length: question.visualCount }, () => "<i></i>").join("")}</div>` : ""}
        <label for="answer">Your answer</label><output id="answer" class="answer-field" aria-live="polite">&nbsp;</output><p class="input-error" id="input-error">${escapeHtml(message)}</p>
        <div class="quiz-tools"><span>Take your best shot.</span><button id="save-exit" class="text-button" type="button">Save & exit</button></div></div>
        <div class="keypad" aria-label="Number keypad">${[7,8,9,4,5,6,1,2,3].map((n) => `<button data-key="${n}" aria-label="${n}">${n}</button>`).join("")}
          <button data-key="." aria-label="Decimal point">.</button><button data-key="0" aria-label="0">0</button><button data-key="/" aria-label="Fraction bar">⁄</button>
          <button data-key="back" class="key-muted" aria-label="Backspace">⌫</button><button data-key="clear" class="key-muted">Clear</button><button data-key="check" class="key-check">Check</button>
        </div></div>
      <div class="question-progress" aria-label="Question progress">${quiz.questions.map((_, i) => `<i class="${i < quiz.index ? "done" : i === quiz.index ? "current" : ""}"></i>`).join("")}</div>
    </div>
  </section>`, "quiz-screen");
  bindHome();
  let draft = "";
  const output = document.querySelector<HTMLOutputElement>("#answer")!;
  const updateDraft = () => { output.textContent = draft || " "; };
  const press = (key: string) => {
    if (key === "check") { submitInitial(draft); return; }
    if (key === "back") draft = draft.slice(0, -1);
    else if (key === "clear") draft = "";
    else if (draft.length < 12 && !(key === "/" && draft.includes("/")) && !(key === "." && draft.includes("."))) draft += key;
    updateDraft();
  };
  document.querySelectorAll<HTMLButtonElement>("[data-key]").forEach((button) => button.addEventListener("click", () => press(button.dataset.key!)));
  quizKeyHandler = (event: KeyboardEvent) => {
    if (/^[0-9./-]$/.test(event.key)) { press(event.key); event.preventDefault(); }
    else if (event.key === "Backspace") { press("back"); event.preventDefault(); }
    else if (event.key === "Enter") { press("check"); event.preventDefault(); }
  };
  window.addEventListener("keydown", quizKeyHandler);
  document.querySelector("#save-exit")!.addEventListener("click", saveAndExit);
  quizStartedAt = performance.now();
  timerId = window.setInterval(updateTimer, 50);
  updateTierRail();
}

function updateTimer(): void {
  const run = activeRun(); if (run.phase !== "quiz" || paused) return;
  const quiz = run.quiz!;
  const remaining = Math.max(0, 30000 - quiz.elapsedMs - (performance.now() - quizStartedAt));
  quiz.remainingMs = remaining;
  const timer = document.querySelector<HTMLElement>("#countdown b"); if (timer) timer.textContent = formatTime(remaining);
  updateTierRail();
}

function updateTierRail(): void {
  const quiz = activeRun().quiz!;
  const quality = timeQuality(quiz.remainingMs);
  document.querySelectorAll(".rail-step").forEach((step) => step.classList.toggle("active", (step as HTMLElement).dataset.quality === quality));
  const strip = document.querySelector<HTMLElement>("#mobile-tier");
  if (strip) strip.innerHTML = `${qualityPips(quality)}<b>${QUALITY_LABEL[quality]}</b><span>candidate</span>`;
}

function submitInitial(value: string): void {
  if (!parseNumericAnswer(value)) { document.querySelector("#input-error")!.textContent = "Enter a complete number or fraction."; announce("Enter a complete number or fraction."); return; }
  persistCurrentQuizTime();
  const run = activeRun(); const quiz = run.quiz!; const question = quiz.questions[quiz.index];
  const correct = isCorrect(value, question.answer);
  quiz.attempts.push({ question, input: value, correct, corrected: correct });
  quiz.index++;
  announce(correct ? "Correct." : "Recorded for correction after your reward.");
  if (quiz.index < 5) { saveProfiles(); renderQuiz(correct ? "Correct — reactor stable." : "Logged — you’ll fix that one after choosing a reward."); return; }
  quiz.remainingMs = Math.max(0, 30000 - quiz.elapsedMs);
  const wrong = quiz.attempts.filter((a) => !a.correct).length;
  const candidate = timeQuality(quiz.remainingMs);
  quiz.rewardQuality = QUALITY_ORDER[Math.max(0, QUALITY_ORDER.indexOf(candidate) - wrong)];
  quiz.rewardChoices = makeRewards(quiz.rewardQuality, run.wave);
  run.phase = "reward"; saveProfiles(); renderReward();
}

function renderReward(): void {
  cleanup();
  const run = activeRun(); const quiz = run.quiz!; const quality = quiz.rewardQuality!;
  const wrong = quiz.attempts.filter((a) => !a.correct).length;
  const candidate = timeQuality(quiz.remainingMs);
  app.innerHTML = shell(`<section class="reward-screen" id="content">
    <div class="reward-heading"><p class="eyebrow warm">FABRICATOR ONLINE</p><h1>Choose one upgrade</h1><div class="outcome-row"><div><small>Time tier</small><b>${QUALITY_LABEL[candidate]}</b></div><span>− ${wrong} ${wrong === 1 ? "miss" : "misses"}</span><div class="quality-badge ${quality}">${qualityPips(quality)}<b>${QUALITY_LABEL[quality]}</b></div></div></div>
    <div class="reward-grid">${quiz.rewardChoices!.map((module, i) => `<article class="reward-card ${quality}"><div class="card-index">0${i + 1}</div><div class="module-icon ${module.stat}" aria-hidden="true"><i></i></div><p class="eyebrow">TECH MODULE</p><h2>${module.name}</h2><div class="card-quality">${QUALITY_LABEL[quality]} ${qualityPips(quality)}</div><p class="stat-gain">${statText(module)}</p><p>${moduleDescription(module.stat)}</p><button class="button primary" data-reward="${module.id}">Choose module</button></article>`).join("")}</div>
    <button id="save-exit" class="text-button centered">Save & exit</button>
  </section>`, "reward-shell");
  bindHome();
  document.querySelectorAll<HTMLElement>("[data-reward]").forEach((button) => button.addEventListener("click", () => chooseReward(button.dataset.reward!)));
  document.querySelector("#save-exit")!.addEventListener("click", saveAndExit);
}

function chooseReward(id: string): void {
  const profile = activeProfile(); const run = activeRun(); const quiz = run.quiz!;
  if (quiz.selectedReward) return;
  const module = quiz.rewardChoices!.find((m) => m.id === id); if (!module) return;
  quiz.selectedReward = id; run.modules.push(module);
  if (module.stat === "maxHp") { run.maxHp += module.value; run.hp += module.value; }
  for (const attempt of quiz.attempts) profile.history.push({ question: attempt.question.prompt, grade: run.grade, correctInitially: attempt.correct, corrected: attempt.correct, at: Date.now() });
  if (quiz.attempts.some((a) => !a.correct)) { run.phase = "correction"; quiz.correctionIndex = 0; }
  else run.phase = "cache";
  saveProfiles(); run.phase === "correction" ? renderCorrection() : renderCache();
}

function renderCorrection(message = ""): void {
  cleanup();
  const run = activeRun(); const quiz = run.quiz!;
  const misses = quiz.attempts.filter((a) => !a.correct && !a.corrected);
  if (!misses.length) { run.phase = "cache"; saveProfiles(); renderCache(); return; }
  const attempt = misses[0];
  app.innerHTML = shell(`<section class="correction-screen" id="content"><div class="correction-copy"><p class="eyebrow warm">UNTIMED CORRECTION</p><h1>Let’s repair this one.</h1><p>Rewards are locked in. Work it through before the next wave.</p></div>
    <div class="correction-card"><div><span class="correction-count">${quiz.attempts.filter((a) => !a.correct).length - misses.length + 1} / ${quiz.attempts.filter((a) => !a.correct).length}</span><p class="prompt">${escapeHtml(attempt.question.prompt)}</p>${attempt.question.visualCount ? `<div class="cell-grid">${Array.from({ length: attempt.question.visualCount }, () => "<i></i>").join("")}</div>` : ""}<div class="hint-box"><b>Mission hint</b><p>${escapeHtml(attempt.question.hint)}</p></div></div>
      <div><label for="correction-input">Correct answer</label><input id="correction-input" inputmode="decimal" autocomplete="off"><p class="input-error" id="correction-error">${escapeHtml(message)}</p><button id="correction-check" class="button primary">Check answer</button></div></div>
    <button id="save-exit" class="text-button centered">Save & exit</button></section>`, "correction-shell");
  bindHome();
  const input = document.querySelector<HTMLInputElement>("#correction-input")!; input.focus();
  const submit = () => {
    if (!parseNumericAnswer(input.value)) { document.querySelector("#correction-error")!.textContent = "Enter a complete number or fraction."; return; }
    if (!isCorrect(input.value, attempt.question.answer)) { renderCorrection("Try again. Use the hint and take your time."); return; }
    attempt.corrected = true;
    const history = [...activeProfile().history].reverse().find((h) => h.question === attempt.question.prompt && !h.correctInitially && !h.corrected); if (history) history.corrected = true;
    saveProfiles(); renderCorrection("Correct — repair complete.");
  };
  document.querySelector("#correction-check")!.addEventListener("click", submit);
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") submit(); });
  document.querySelector("#save-exit")!.addEventListener("click", saveAndExit);
}

function renderCache(): void {
  cleanup();
  const run = activeRun();
  if (run.cacheClaimed) { run.phase = "shop"; renderShop(); return; }
  app.innerHTML = shell(`<section class="cache-screen" id="content"><div class="cache-heading"><p class="eyebrow warm">FREE SUPPLY DROP</p><h1>Pick one upgrade</h1><p>Choose the shot effect you want, or take stronger armor.</p></div>
    <div class="cache-grid">${AMMO_TYPES.map((type) => `<article class="cache-card"><div class="ammo-icon ${ammoClass(type)}"><i></i></div><p class="eyebrow">AMMO UPGRADE</p><h2>${type}</h2><p>${ammoEffect(type)}</p><div class="cache-tier">Blue T3 ×2 <span>Ready to combine</span></div><button class="button secondary" data-cache-ammo="${type}">Choose ${type}</button></article>`).join("")}
      <article class="cache-card module-cache"><div class="module-icon armor"><i></i></div><p class="eyebrow">SUIT UPGRADE</p><h2>Field Plating</h2><p>Take less damage when slimes reach you.</p><div class="cache-tier">Green module <span>+2 armor</span></div><button class="button secondary" data-cache-module>Choose armor</button></article></div>
    <button id="save-exit" class="text-button centered">Save & exit</button></section>`, "cache-shell");
  bindHome();
  document.querySelectorAll<HTMLElement>("[data-cache-ammo]").forEach((button) => button.addEventListener("click", () => {
    const type = button.dataset.cacheAmmo as AmmoType;
    run.ammo.push({ id: uid("ammo"), type, tier: 3 }, { id: uid("ammo"), type, tier: 3 });
    run.cacheClaimed = true; run.phase = "shop"; saveProfiles(); renderShop(`${type} pair added. Combine it below for one Purple T4 cartridge.`);
  }));
  document.querySelector("[data-cache-module]")!.addEventListener("click", () => {
    run.modules.push({ id: uid("module"), name: "Field Plating", stat: "armor", value: 2, quality: "green" });
    run.cacheClaimed = true; run.phase = "shop"; saveProfiles(); renderShop();
  });
  document.querySelector("#save-exit")!.addEventListener("click", saveAndExit);
}

function renderShop(message = ""): void {
  cleanup();
  const run = activeRun();
  const expanderPrice = [8, 16, 24][run.ammoCapacity - 1] ?? 24;
  const offers = [
    { id: "expand", title: "Ammo Expander", detail: run.ammoCapacity < 4 ? `Equip ${run.ammoCapacity + 1} ammo effects at once` : "Active ammo slots are full", price: expanderPrice, disabled: run.ammoCapacity >= 4 },
    { id: "medkit", title: "Med-gel", detail: "Carry one extra heal into combat", price: 5, disabled: false },
    { id: "ammo", title: `${AMMO_TYPES[run.wave % AMMO_TYPES.length]} Ammo`, detail: "Add one White T1 cartridge to your locker", price: 6, disabled: false },
    { id: "repair", title: "Suit Repair", detail: "Restore 30 Suit Integrity", price: 4, disabled: run.hp >= run.maxHp },
  ];
  const activeAmmo = run.activeAmmoIds.map((id) => run.ammo.find((ammo) => ammo.id === id)).filter((ammo): ammo is Ammo => Boolean(ammo));
  const merges = mergeButtons(run);
  const purpleTypes = new Set(run.ammo.filter((ammo) => ammo.tier === 4 && !ammo.legendary).map((ammo) => ammo.type)).size;
  app.innerHTML = shell(`<section class="shop-screen" id="content"><div class="shop-top"><div><p class="eyebrow warm">BETWEEN WAVES</p><h1>Gear up for wave ${run.wave + 1}</h1><p>Everything here is optional. Your current gear is ready to go.</p></div><div class="salvage-chip"><small>SALVAGE</small><b>${run.salvage}</b></div></div><p class="shop-message" role="status">${escapeHtml(message)}</p>
    <section class="market-panel" aria-labelledby="shop-title"><div class="panel-heading"><div><p class="eyebrow">OUTPOST SHOP</p><h2 id="shop-title">Buy an upgrade</h2></div><span>Four choices</span></div>
      <div class="shop-offers">${offers.map((offer, i) => `<article class="shop-offer ${run.shopBought.includes(offer.id) ? "bought" : ""}"><span>0${i + 1}</span><div class="shop-offer-icon ${offer.id}" aria-hidden="true"><i></i></div><h3>${offer.title}</h3><p>${offer.detail}</p><button class="button secondary" data-buy="${offer.id}" ${offer.disabled || run.shopBought.includes(offer.id) ? "disabled" : ""}>${run.shopBought.includes(offer.id) ? "Bought" : `Buy · ${offer.price} salvage`}</button></article>`).join("")}</div>
    </section>
    <section class="loadout"><div class="loadout-heading"><div><p class="eyebrow">YOUR EQUIPMENT</p><h2>Pulse Blaster</h2><p>Tap Equip on any ammo card. When your active slots are full, it replaces the rightmost ammo.</p></div>${purpleTypes > 0 || canForge(run) ? `<div class="omni-progress"><small>OMNI AMMO</small><b>${purpleTypes} / 5</b><button id="forge-button" class="button forge" ${canForge(run) ? "" : "disabled"}>${canForge(run) ? "Forge Omni" : "Collect 5 Purple types"}</button></div>` : ""}</div>
      <div class="weapon-dock"><div class="blaster-card"><div class="blaster-icon" aria-hidden="true"><i></i></div><div><small>ONE WEAPON</small><b>Pulse Blaster</b></div></div><div class="loaded-ammo"><small>ACTIVE AMMO · ${activeAmmo.length}/${run.ammoCapacity}</small><div>${activeAmmo.map((ammo) => `<span>${ammo.legendary ? "Omni" : ammo.type} T${ammo.tier}</span>`).join("") || "<em>No ammo equipped</em>"}${Array.from({ length: Math.max(0, run.ammoCapacity - activeAmmo.length) }, () => "<i>Empty</i>").join("")}</div></div></div>
      <div class="reserve"><div class="panel-heading compact"><div><p class="eyebrow">AMMO LOCKER</p><h3>Owned ammo</h3></div><span>${run.ammo.length} cartridge${run.ammo.length === 1 ? "" : "s"}</span></div><div class="reserve-grid">${run.ammo.map((ammo) => ammoChip(ammo, run.activeAmmoIds.includes(ammo.id))).join("")}</div></div>
      ${merges ? `<div class="merge-row"><div><p class="eyebrow">READY TO UPGRADE</p><span>Combine two matching cartridges into one stronger cartridge.</span></div><div>${merges}</div></div>` : ""}
    </section>
    <div class="shop-actions"><button id="save-exit" class="text-button">Save & exit</button><div><small>No purchase required</small><button id="next-wave" class="button launch">Start wave ${run.wave + 1} <i aria-hidden="true">→</i></button></div></div>
  </section>`, "shop-shell");
  bindHome();
  document.querySelectorAll<HTMLElement>("[data-buy]").forEach((button) => button.addEventListener("click", () => buyOffer(button.dataset.buy!, offers)));
  document.querySelectorAll<HTMLElement>("[data-ammo-id]").forEach((button) => button.addEventListener("click", () => toggleAmmo(button.dataset.ammoId!)));
  document.querySelectorAll<HTMLElement>("[data-merge]").forEach((button) => button.addEventListener("click", () => mergeAmmo(button.dataset.merge as AmmoType, Number(button.dataset.tier) as 1|2|3)));
  document.querySelector("#forge-button")?.addEventListener("click", forgeOmni);
  document.querySelector("#save-exit")!.addEventListener("click", saveAndExit);
  document.querySelector("#next-wave")!.addEventListener("click", () => { run.wave++; run.phase = "combat"; run.quiz = undefined; run.combatSave = undefined; run.cacheClaimed = false; run.shopBought = []; saveProfiles(); renderCombat(); });
}

function buyOffer(id: string, offers: Array<{ id: string; price: number }>): void {
  const run = activeRun(); if (run.shopBought.includes(id)) return;
  const offer = offers.find((o) => o.id === id)!;
  if (run.salvage < offer.price) { renderShop("Not enough salvage yet."); return; }
  run.salvage -= offer.price; run.shopBought.push(id);
  if (id === "expand" && run.ammoCapacity < 4) run.ammoCapacity++;
  if (id === "medkit") run.medkits++;
  if (id === "ammo") run.ammo.push({ id: uid("ammo"), type: AMMO_TYPES[run.wave % AMMO_TYPES.length], tier: 1 });
  if (id === "repair") run.hp = Math.min(run.maxHp, run.hp + 30);
  saveProfiles(); renderShop(`${id === "expand" ? "Ammo capacity expanded." : "Purchase installed."}`);
}

function toggleAmmo(id: string): void {
  const run = activeRun(); const ammo = run.ammo.find((a) => a.id === id); if (!ammo) return;
  let message = "";
  if (run.activeAmmoIds.includes(id)) {
    run.activeAmmoIds = run.activeAmmoIds.filter((active) => active !== id);
    message = `${ammo.legendary ? "Omni Ammo" : ammo.type} moved to the locker.`;
  }
  else {
    if (!ammo.legendary && run.activeAmmoIds.some((activeId) => run.ammo.find((a) => a.id === activeId)?.type === ammo.type)) { renderShop("That ammo type is already active."); return; }
    if (run.activeAmmoIds.length >= run.ammoCapacity) {
      const replacedId = run.activeAmmoIds.pop();
      const replaced = run.ammo.find((candidate) => candidate.id === replacedId);
      message = `${ammo.legendary ? "Omni Ammo" : ammo.type} equipped. ${replaced?.legendary ? "Omni Ammo" : replaced?.type ?? "Previous ammo"} moved to the locker.`;
    } else message = `${ammo.legendary ? "Omni Ammo" : ammo.type} equipped.`;
    run.activeAmmoIds.push(id);
  }
  saveProfiles(); renderShop(message);
}

function mergeButtons(run: RunState): string {
  const buttons: string[] = [];
  for (const type of AMMO_TYPES) for (let tier = 1; tier <= 3; tier++) {
    if (run.ammo.filter((a) => !a.legendary && a.type === type && a.tier === tier).length >= 2)
      buttons.push(`<button class="button tiny" data-merge="${type}" data-tier="${tier}">Combine ${type}: ${QUALITY_LABEL[qualityFromTier(tier)]} → ${QUALITY_LABEL[qualityFromTier(tier + 1)]}</button>`);
  }
  return buttons.join("");
}

function mergeAmmo(type: AmmoType, tier: 1|2|3): void {
  const run = activeRun(); const pair = run.ammo.filter((a) => !a.legendary && a.type === type && a.tier === tier).slice(0, 2); if (pair.length < 2) return;
  const activeIndex = run.activeAmmoIds.findIndex((id) => pair.some((a) => a.id === id));
  run.ammo = run.ammo.filter((a) => !pair.some((p) => p.id === a.id));
  run.activeAmmoIds = run.activeAmmoIds.filter((id) => !pair.some((p) => p.id === id));
  const merged: Ammo = { id: uid("ammo"), type, tier: (tier + 1) as 2|3|4 }; run.ammo.push(merged);
  if (activeIndex >= 0) run.activeAmmoIds.splice(activeIndex, 0, merged.id);
  saveProfiles(); renderShop(`${type} upgraded to T${tier + 1}.`);
}

function canForge(run: RunState): boolean {
  return !run.ammo.some((a) => a.legendary) && AMMO_TYPES.every((type) => run.ammo.some((a) => a.type === type && a.tier === 4));
}

function forgeOmni(): void {
  const run = activeRun(); if (!canForge(run)) { renderShop("Forge needs one Purple T4 cartridge of every type."); return; }
  const consumed = AMMO_TYPES.map((type) => run.ammo.find((a) => a.type === type && a.tier === 4)!);
  run.ammo = run.ammo.filter((a) => !consumed.includes(a));
  run.activeAmmoIds = run.activeAmmoIds.filter((id) => !consumed.some((a) => a.id === id));
  const omni: Ammo = { id: uid("ammo"), type: "Piercing", tier: 4, legendary: true }; run.ammo.push(omni);
  if (run.activeAmmoIds.length >= run.ammoCapacity) run.activeAmmoIds.pop();
  run.activeAmmoIds.unshift(omni.id); saveProfiles(); renderShop("Legendary Omni forged: all five effects in one slot.");
}

function endRun(victory: boolean, state?: CombatSnapshot): void {
  cleanup();
  const profile = activeProfile(); const run = activeRun();
  if (state) { run.hp = state.hp; run.salvage = state.salvage; }
  if (victory) profile.victories++;
  const accuracy = profile.history.length ? Math.round(profile.history.filter((h) => h.correctInitially).length / profile.history.length * 100) : 0;
  app.innerHTML = shell(`<section class="summary-screen" id="content"><div class="summary-mark ${victory ? "victory" : "defeat"}"><i></i></div><p class="eyebrow warm">${victory ? "MISSION COMPLETE" : "SUIT OFFLINE"}</p><h1>${victory ? "Mars is secure." : "The slimes broke through."}</h1><p>${victory ? "The Overmind is down and the outpost reactor is stable." : "Your learning record is safe. Refit and launch again."}</p>
    <div class="summary-stats"><div><small>WAVES</small><b>${run.wave}</b></div><div><small>FIRST-TRY ACCURACY</small><b>${accuracy}%</b></div><div><small>MODULES</small><b>${run.modules.length}</b></div><div><small>SALVAGE</small><b>${run.salvage}</b></div></div>
    <div class="summary-actions">${victory ? "" : `<button id="retry-mission" class="button primary">Retry mission</button>`}<button id="return-home" class="button ${victory ? "launch" : "secondary"}">Return to crew</button></div></section>`, "summary-shell");
  profile.activeRun = undefined; saveProfiles(); bindHome();
  document.querySelector("#retry-mission")?.addEventListener("click", () => { profile.activeRun = newRun(profile.grade); saveProfiles(); renderCombat(); });
  document.querySelector("#return-home")!.addEventListener("click", renderProfiles);
}

function showPause(title: string): void {
  if (paused || !activeProfileId || !activeProfile().activeRun) return;
  persistCurrentQuizTime(); persistCombatState(); paused = true; if (timerId !== null) window.clearInterval(timerId); timerId = null; combat?.pause(); combat?.clearInput(); saveProfiles();
  const overlay = document.createElement("div"); overlay.className = "pause-overlay"; overlay.id = "pause-overlay";
  overlay.innerHTML = `<div class="pause-dialog" role="dialog" aria-modal="true" aria-labelledby="pause-title"><p class="eyebrow warm">MISSION HOLD</p><h2 id="pause-title">${escapeHtml(title)}</h2><p>Combat and question time are stopped.</p><button id="resume-button" class="button primary">Resume</button><button id="pause-exit" class="text-button">Save & exit</button></div>`;
  document.body.append(overlay); (document.querySelector("#resume-button") as HTMLElement).focus();
  document.querySelector("#resume-button")!.addEventListener("click", () => {
    overlay.remove(); paused = false; combat?.resume();
    if (activeRun().phase === "quiz") { quizStartedAt = performance.now(); timerId = window.setInterval(updateTimer, 50); }
  });
  document.querySelector("#pause-exit")!.addEventListener("click", () => { overlay.remove(); saveAndExit(); });
}

function saveAndExit(): void {
  persistCurrentQuizTime(); persistCombatState(); saveProfiles(); renderProfiles();
}

function timeQuality(remaining: number): Quality {
  return remaining > 20000 ? "purple" : remaining > 10000 ? "blue" : remaining > 0 ? "green" : "white";
}

function makeRewards(quality: Quality, seed: number): Module[] {
  const index = QUALITY_ORDER.indexOf(quality);
  return Array.from({ length: 3 }, (_, i) => {
    const item = moduleCatalog[(seed * 2 + i) % moduleCatalog.length];
    const scale = [.5, 1, 1.35, 1.7][index];
    return { id: uid("module"), name: item.name, stat: item.stat, value: item.base * scale, quality };
  });
}

function statText(module: Module): string {
  if (module.stat === "maxHp" || module.stat === "armor") return `+${Math.round(module.value)} ${module.stat === "maxHp" ? "max integrity" : "armor"}`;
  return `+${Math.round(module.value * 100)}% ${({ damage: "damage", attackSpeed: "attack speed", moveSpeed: "move speed", healing: "healing" } as Record<string,string>)[module.stat]}`;
}

function moduleDescription(stat: Module["stat"]): string {
  return ({ damage: "Harder impacts on every shot.", attackSpeed: "Faster automatic Pulse Blaster fire.", maxHp: "More room for damage before suit failure.", armor: "Reduce damage from contact and projectiles.", moveSpeed: "Quicker dodges across the arena.", healing: "Med-gel restores more integrity." })[stat];
}

function ammoChip(ammo: Ammo, active: boolean): string {
  const quality = ammo.legendary ? "purple" : qualityFromTier(ammo.tier);
  return `<button class="ammo-chip ${ammo.legendary ? "legendary" : `tier-${ammo.tier}`} ${active ? "active" : ""}" data-ammo-id="${ammo.id}"><span class="ammo-icon ${ammo.legendary ? "omni" : ammoClass(ammo.type)}"><i></i></span><span class="ammo-copy"><b>${ammo.legendary ? "Legendary Omni" : ammo.type}</b><small>${ammo.legendary ? "All five effects" : `${QUALITY_LABEL[quality]} · T${ammo.tier}`}</small></span><span class="ammo-action">${active ? "Unequip" : "Equip"}</span></button>`;
}

function ammoClass(type: AmmoType): string { return type.toLowerCase().replaceAll(" ", "-"); }
function ammoEffect(type: AmmoType): string { return ({ Piercing: "Shots pass through extra slimes.", "Multi Shot": "Fires extra projectiles with every shot.", "Electric Chain": "Jumps from one slime to nearby targets.", Frost: "Slows slimes so you can keep your distance.", Fiery: "Burns slimes after the shot lands." } as Record<AmmoType, string>)[type]; }
function qualityFromTier(tier: number): Quality { return QUALITY_ORDER[Math.max(0, Math.min(3, tier - 1))]; }
function formatTime(ms: number): string { return (Math.max(0, ms) / 1000).toFixed(1).padStart(4, "0"); }
function hashSeed(value: string): number { return [...value].reduce((seed, character) => (seed * 31 + character.charCodeAt(0)) >>> 0, 2166136261); }
function gradeLabel(grade: Grade): string { return ({ K: "Count & compare", 1: "Within 20", 2: "Within 100", 3: "Multiply & divide", 4: "Fractions & products", 5: "Decimals & fractions", 6: "Ratios & equations" } as Record<Grade, string>)[grade]; }
function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}

document.addEventListener("visibilitychange", () => { if (document.hidden && activeProfileId && activeProfile().activeRun) showPause("App switched away"); });
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !activeProfileId || !activeProfile().activeRun) return;
  event.preventDefault();
  showPause("Mission paused");
});
window.addEventListener("blur", () => { if (activeProfileId && activeProfile().activeRun) showPause("Window focus changed"); });
window.addEventListener("orientationchange", () => { if (activeProfileId && activeProfile().activeRun) showPause("Screen rotated"); });

renderProfiles();
