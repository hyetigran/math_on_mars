import {
  TownRehearsal,
  REHEARSAL_BASELINE,
  type RehearsalBalance,
  type Project,
} from "./town-rehearsal";
import { IM_ATTRIBUTION } from "./question-bank";
import "./town-rehearsal.css";
const root = document.querySelector<HTMLElement>("#rehearsal")!;
let town = new TownRehearsal(),
  notice = "",
  topic = "1:Addition within 20";
const history: string[] = [];
const escape = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const minutes = (seconds: number) =>
  `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
function run(label: string, action: () => void) {
  try {
    action();
    notice = label;
    history.unshift(`${minutes(town.snapshot().now)} — ${label}`);
  } catch (e) {
    notice = e instanceof Error ? e.message : "Action failed";
  }
  render();
}
function render() {
  const s = town.snapshot(),
    p = town.practiceSnapshot(),
    q = p?.questions.find((q) => !p.corrected.includes(q.id));
  root.innerHTML = `<header><p class="eyebrow">V2 · DEVELOPMENT REHEARSAL</p><h1>A first day on Mars</h1><p>Adjust provisional values and rehearse build → grow → learn → upgrade. This clock and state are only a development experiment; your cadet saves are untouched.</p><a href="./town-prototype.html">Explore the visual prototype</a></header>
 <p id="notice" role="status">${escape(notice || "Start by constructing a Greenhouse. You have two construction slots.")}</p>
 <section class="stats" aria-label="Town state">${Object.entries({
   Time: minutes(s.now),
   Blocks: s.blocks,
   Parts: s.parts,
   "Trade credits": s.tradeCredits,
   "Edible portions": `${s.food} / ${town.balance.foodCapacity}`,
   "Reserved meals": `${s.reservedFood} / ${s.reserveTarget}`,
   "Available adults": s.availableAdults,
   "House capacity": s.houseCapacity,
   "Construction credit": minutes(s.constructionCredit),
   "Emergency meals served": s.emergencyMeals,
   "Held harvest": s.heldHarvest,
 })
   .map(([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`)
   .join("")}</section>
 <div class="columns"><section><h2>1. Build and upgrade</h2><p>${s.jobs.length} / ${town.balance.constructionSlots} construction slots occupied</p><button data-start="greenhouse" ${s.greenhouse || s.jobs.some((j) => j.kind === "greenhouse") ? "disabled" : ""}>Build Greenhouse · ${town.balance.greenhouseBlocks} blocks + ${town.balance.greenhouseParts} parts · ${minutes(town.balance.greenhouseSeconds)}</button><button data-start="house" ${s.houseLevel > 1 || s.jobs.some((j) => j.kind === "house") ? "disabled" : ""}>Upgrade House · ${town.balance.upgradeBlocks} blocks + ${town.balance.upgradeParts} parts · ${minutes(town.balance.upgradeSeconds)}</button><ul>${s.jobs.map((j) => `<li>${j.kind === "house" ? "House upgrade" : "Greenhouse"}: ${minutes(j.remaining)} <button data-credit="${j.kind}" ${!s.constructionCredit ? "disabled" : ""}>Apply up to ${minutes(Math.min(j.remaining, s.constructionCredit))} credit</button></li>`).join("") || "<li>No running projects</li>"}</ul><h3>Rehearsal clock</h3><div class="buttons">${[10, 600, 1800, 3600, 86400].map((n) => `<button data-advance="${n}">+${minutes(n)}</button>`).join("")}</div></section>
 <section><h2>2. Grow and feed</h2><p>Crop: lettuce · ${town.balance.cropYield} portions / ${minutes(town.balance.cropSeconds)}. Two power and two water required, after household water use.</p><button id="seed" ${s.seedUnlocked ? "disabled" : ""}>${s.seedUnlocked ? "Lettuce permanently unlocked" : `Unlock lettuce · ${town.balance.seedCost} trade credits`}</button><button id="power">Restore starter power · 10 capacity</button><button id="worker" ${!s.greenhouse ? "disabled" : ""}>${s.workerAssigned ? "Release" : "Assign"} one adult</button><p>${!s.greenhouse ? "Build the Greenhouse first." : s.heldHarvest ? "Storage full: completed harvest held safely." : s.cropOperating ? `Growing · ${minutes(s.cropRemaining)} remaining` : !s.seedUnlocked ? "Unlock lettuce to begin." : !s.workerAssigned ? "Assign an adult to grow." : "Optional production paused: insufficient power or water."}</p><p>Basic meals consume ${town.balance.adults} portions every ${minutes(town.balance.mealSeconds)}. The habitat provides direct-use emergency meals when needed.</p></section>
 <section><h2>3. Practice to accelerate</h2><p>Rehearsal eligibility: select any listed fixed-bank grade/topic. Parent-controlled eligibility is implemented in the connected-town ticket.</p><label>Eligible grade / topic <select id="topic">${town.eligibleTopics
   .map((t) => {
     const key = `${t.grade}:${t.skill}`;
     return `<option value="${escape(key)}" ${key === topic ? "selected" : ""}>${escape(t.grade + " · " + t.skill)}</option>`;
   })
   .join(
     "",
   )}</select></label><p>Up to five distinct questions; ${minutes(town.balance.creditPerQuestion)} credit each. Short topics award proportionally. Finite topic decks cycle; repeats are permitted and labeled.</p><button id="practice" ${p && !p.completed ? "disabled" : ""}>Start new practice set</button>${p ? `<p>${p.questions.length} questions · reward ${minutes(p.reward)} · ${p.repeated ? "Includes previously practiced items" : "New items in this rehearsal"} · ${Object.values(p.firstAttempts).filter(Boolean).length}/${Object.keys(p.firstAttempts).length} first attempts correct</p>` : ""}${q ? `<form id="answer"><p class="question">${escape(q.prompt)}</p><label>Your answer <input id="response" autocomplete="off" required maxlength="18"></label><button>Check answer</button><details><summary>Help</summary><p>${escape(q.hint)}</p></details><p><a href="${escape(q.source?.url)}" target="_blank" rel="noopener">Question source</a></p></form>` : p?.completed ? '<p class="success">Practice complete. Credit is banked; apply it to your chosen project.</p>' : ""}<p class="attribution">Questions adapted from <a href="${IM_ATTRIBUTION.curriculumUrl}">${IM_ATTRIBUTION.title}</a>, © ${IM_ATTRIBUTION.author}, <a href="${IM_ATTRIBUTION.licenseUrl}">${IM_ATTRIBUTION.license}</a>. Selected skills only, not a mastery assessment.</p></section></div>
 <section><h2>Balance laboratory</h2><p>All values are provisional. Applying a balance starts a fresh rehearsal. Export includes the exact baseline, current state, practice and action log.</p><div class="buttons"><button id="baseline">Reset baseline</button><button id="full">Full-store scenario</button><button id="shortage">Shortage scenario</button><button id="export">Export rehearsal JSON</button></div><details><summary>Adjust initial test values</summary><form id="balance"><div class="settings">${Object.entries(
   town.balance,
 )
   .map(
     ([k, v]) =>
       `<label>${k}<input name="${k}" type="number" min="0" max="1000000" step="1" value="${v}" required></label>`,
   )
   .join(
     "",
   )}</div><button>Apply values and restart</button></form></details><details><summary>Full state and history</summary><pre>${escape(JSON.stringify(s, null, 2))}</pre><ol>${history
   .slice(0, 30)
   .map((h) => `<li>${escape(h)}</li>`)
   .join("")}</ol></details></section>`;
  root
    .querySelectorAll<HTMLButtonElement>("[data-start]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          run("Started " + b.dataset.start, () =>
            town.start(b.dataset.start as Project),
          )),
    );
  root
    .querySelectorAll<HTMLButtonElement>("[data-credit]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          run("Applied construction credit", () =>
            town.applyCredit(b.dataset.credit as Project),
          )),
    );
  root
    .querySelectorAll<HTMLButtonElement>("[data-advance]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          run("Advanced " + minutes(Number(b.dataset.advance)), () =>
            town.advance(Number(b.dataset.advance)),
          )),
    );
  root.querySelector<HTMLButtonElement>("#seed")!.onclick = () =>
    run("Unlocked lettuce", () => town.unlockSeed());
  root.querySelector<HTMLButtonElement>("#power")!.onclick = () =>
    run("Restored starter power without resetting", () =>
      town.restoreStarterPower(),
    );
  root.querySelector<HTMLButtonElement>("#worker")!.onclick = () =>
    run("Changed worker assignment", () =>
      town.assignWorker(!s.workerAssigned),
    );
  root.querySelector<HTMLSelectElement>("#topic")!.onchange = (e) => {
    topic = (e.target as HTMLSelectElement).value;
  };
  root.querySelector<HTMLButtonElement>("#practice")!.onclick = () =>
    run("Started practice", () => {
      const t = town.eligibleTopics.find(
        (t) => `${t.grade}:${t.skill}` === topic,
      )!;
      town.beginPractice(t.grade, t.skill);
    });
  const form = root.querySelector<HTMLFormElement>("#answer");
  if (form && q)
    form.onsubmit = (e) => {
      e.preventDefault();
      const answer = root.querySelector<HTMLInputElement>("#response")!.value;
      let correct = false;
      run("Answer checked", () => {
        correct = town.answer(q.id, answer);
      });
      notice = correct
        ? "Correct. Continue or apply your earned credit."
        : "Try again; corrections keep the full reward.";
      render();
      root.querySelector<HTMLInputElement>("#response")?.focus();
    };
  function reset(overrides: Partial<RehearsalBalance> = {}) {
    town = new TownRehearsal(overrides);
    history.length = 0;
  }
  root.querySelector<HTMLButtonElement>("#baseline")!.onclick = () =>
    run("Baseline reset", () => reset());
  root.querySelector<HTMLButtonElement>("#full")!.onclick = () =>
    run("Full storage scenario: construct and staff the Greenhouse", () =>
      reset({ food: 4, foodCapacity: 4 }),
    );
  root.querySelector<HTMLButtonElement>("#shortage")!.onclick = () =>
    run("Shortage scenario: emergency meals protect the household", () =>
      reset({ food: 0, power: 0 }),
    );
  root.querySelector<HTMLFormElement>("#balance")!.onsubmit = (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget as HTMLFormElement);
    const values = Object.fromEntries(
      Object.keys(REHEARSAL_BASELINE).map((k) => [k, Number(data.get(k))]),
    );
    run("Applied new provisional balance", () => reset(values));
  };
  root.querySelector<HTMLButtonElement>("#export")!.onclick = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              version: 1,
              provisional: true,
              balance: town.balance,
              state: town.snapshot(),
              practice: town.practiceSnapshot(),
              history,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "mars-town-rehearsal.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
}
render();
