import {
  DEFAULT_QUIZ_SETTINGS,
  validQuizSettings,
  quizTimeLimit,
  quizRewardTime,
  type QuizSettings,
} from "./quiz-settings";
import { BUILD_VERSION } from "./build-version";
import { decodeProfiles } from "./persistence";
import {
  MISSION_PRESETS,
  type MissionLength,
} from "../content/balance/missions";
import { applyForge, previewForge, type ForgePreview } from "./forge";
export { canForge } from "./forge";
import {
  acquireAmmo,
  ammoSellPrice,
  previewMerges,
  applyMerges,
  type MergePreview,
} from "./ammo";
import {
  createShop,
  migrateShop,
  refreshShop,
  rerollShop,
  shopOffers,
} from "./shop";
export { shopOffers } from "./shop";
import {
  rewardModules,
  installModule,
  moduleCandidates,
  moduleTotal,
} from "./modules";
import { isCorrect, makeQuestions, parseNumericAnswer } from "./questions";
import {
  AMMO_TYPES,
  QUALITY_ORDER,
  GRADES,
  uid,
  type Ammo,
  type AmmoInventory,
  type AmmoType,
  type CombatSave,
  type Grade,
  type Module,
  type Profile,
  type Quality,
  type RunState,
} from "./types";

export interface QAJumpOptions {
  section?: "combat" | "quiz";
  salvage?: number;
  clearTrinkets?: boolean;
  trinkets?: { name: string; quality: Quality }[];
}

function initializeQuiz(run: RunState): void {
  const settings = run.quizSettings ?? DEFAULT_QUIZ_SETTINGS;
  const questions = makeQuestions(
    run.grade,
    run.wave,
    run.id,
    settings.questionsPerWave,
  ).map((q, index) => ({ ...q, id: `${run.id}:${run.wave}:${index}` }));
  run.quiz = {
    answerType: settings.answerType ?? "input",
    questions,
    index: 0,
    attempts: [],
    elapsedMs: 0,
    remainingMs: settings.secondsPerQuestion * settings.questionsPerWave * 1000,
    timeLimitMs: settings.secondsPerQuestion * settings.questionsPerWave * 1000,
    correctionIndex: 0,
    draft: "",
  };
}

export interface ProfileStore {
  commit(profiles: Profile[]): void;
}
export interface CombatOutcome {
  chestLoot?: Ammo[];
  ammoInventory?: AmmoInventory;
  hp: number;
  salvage: number;
  medkits: number;
}
export interface Checkpoint {
  runId?: string;
  elapsedMs?: number;
  questionId?: string;
  draft?: string;
  correctionDraft?: string;
  combat?: CombatSave;
}
export function timeQuality(remaining: number): Quality {
  return remaining > 20000
    ? "purple"
    : remaining > 10000
      ? "blue"
      : remaining > 0
        ? "green"
        : "white";
}
function newRun(
  grade: Grade,
  mission: MissionLength,
  difficulty: RunState["difficulty"],
): RunState {
  const starter: Ammo = { id: uid("ammo"), type: "Piercing", tier: 1 };
  return {
    id: uid("run"),
    releaseVersion: BUILD_VERSION,
    grade,
    wave: 1,
    totalWaves: MISSION_PRESETS[mission].waves,
    difficulty,
    hp: 100,
    maxHp: 100,
    salvage: 0,
    medkits: 1,
    ammoCapacity: 1,
    ammo: [starter],
    activeAmmoIds: [starter.id],
    modules: [],
    phase: "combat",
    shopBought: [],
    cacheClaimed: false,
  };
}

/** Commands mutate a candidate; observers only see it after durable commit. */
export class RunSession {
  private state: Profile[];
  private paused = false;
  private prepared?: Profile[];
  private preparing = false;
  constructor(
    profiles: Profile[],
    private readonly store: ProfileStore,
    private readonly qaEnabled = false,
  ) {
    this.state = structuredClone(profiles);
  }
  get profiles(): Profile[] {
    return structuredClone(this.state);
  }
  profile(id: string): Profile {
    const result = this.state.find((p) => p.id === id);
    if (!result) throw new Error("No active profile");
    return structuredClone(result);
  }
  importProfile(profile: Profile, disposition: "add" | "replace"): void {
    if (this.paused) return;
    const incoming = decodeProfiles(JSON.stringify([profile]))[0];
    this.change((profiles) => {
      const index = profiles.findIndex(
        (existing) => existing.id === incoming.id,
      );
      if (index >= 0 && disposition !== "replace")
        throw new Error(
          "Choose whether to replace the existing profile or keep it.",
        );
      if (index < 0 && disposition === "replace")
        throw new Error("The profile to replace is no longer available.");
      if (index >= 0) profiles[index] = incoming;
      else profiles.push(incoming);
    });
  }
  pinLegacyRelease(id: string): void {
    this.change((profiles) => {
      const run = profiles.find((profile) => profile.id === id)?.activeRun;
      if (run && !run.releaseVersion) run.releaseVersion = BUILD_VERSION;
    });
  }
  setQuizSettings(id: string, settings: QuizSettings): void {
    if (!validQuizSettings(settings))
      throw new Error("Choose 1–300 seconds and 1–20 questions.");
    this.change((profiles) => {
      const profile = profiles.find((p) => p.id === id);
      if (!profile) throw new Error("No active profile");
      profile.quizSettings = { ...settings };
    });
  }
  setHandedness(id: string, handedness: Profile["handedness"]): void {
    this.change((profiles) => {
      const profile = profiles.find((p) => p.id === id);
      if (profile) profile.handedness = handedness;
    });
  }
  setPaused(paused: boolean): void {
    this.paused = paused;
  }
  prepare<T>(action: () => T): {
    profiles: Profile[];
    result: T;
    publish: () => void;
  } {
    if (this.preparing) throw new Error("A command is already being prepared.");
    const base = this.state;
    this.preparing = true;
    try {
      const result = action();
      const candidate = this.prepared ?? structuredClone(this.state);
      return {
        profiles: structuredClone(candidate),
        result,
        publish: () => {
          if (this.state !== base && this.state !== candidate)
            throw new Error("Prepared state is stale.");
          this.state = candidate;
        },
      };
    } finally {
      this.preparing = false;
      this.prepared = undefined;
    }
  }
  private change<T>(operation: (profiles: Profile[]) => T): T {
    const candidate = structuredClone(this.prepared ?? this.state);
    const result = operation(candidate);
    if (this.preparing) {
      this.prepared = candidate;
      return result;
    }
    this.store.commit(candidate);
    this.state = candidate;
    return result;
  }
  private command<T>(
    id: string,
    phase: RunState["phase"] | null,
    operation: (run: RunState, profile: Profile) => T,
  ): T | undefined {
    if (this.paused) return;
    return this.change((profiles) => {
      const profile = profiles.find((p) => p.id === id);
      const run = profile?.activeRun;
      if (!profile || !run || (phase && run.phase !== phase)) return;
      const before = JSON.stringify([run, profile.history]);
      const result = operation(run, profile);
      if (before !== JSON.stringify([run, profile.history]))
        run.interactionRevision = (run.interactionRevision ?? 0) + 1;
      return result;
    });
  }
  createProfile(name: string): string {
    return this.change((profiles) => {
      const profile: Profile = {
        id: uid("profile"),
        name,
        grade: "3",
        handedness: "left",
        history: [],
        victories: 0,
      };
      profiles.push(profile);
      return profile.id;
    });
  }
  start(
    id: string,
    grade: Grade,
    mission: MissionLength = "standard",
    difficulty: RunState["difficulty"] = "standard",
  ): void {
    if (!GRADES.includes(grade))
      throw new Error("Choose Kindergarten through Grade 5.");
    if (this.paused) return;
    this.change((profiles) => {
      const profile = profiles.find((p) => p.id === id)!;
      // Portal entry always replaces any previous mission, including legacy saves.
      profile.grade = grade;
      profile.activeRun = newRun(grade, mission, difficulty);
      profile.activeRun.quizSettings = {
        ...(profile.quizSettings ?? DEFAULT_QUIZ_SETTINGS),
      };
    });
  }
  checkpoint(id: string, snapshot: Checkpoint): void {
    this.change((profiles) => {
      const run = profiles.find((p) => p.id === id)?.activeRun;
      if (!run || (snapshot.runId && snapshot.runId !== run.id)) return;
      if (snapshot.combat && snapshot.combat.wave !== run.wave) return;
      if (snapshot.combat && run.phase === "combat") {
        run.combatSave = snapshot.combat;
        if (snapshot.combat.version === 2 && snapshot.combat.ammoInventory)
          Object.assign(run, structuredClone(snapshot.combat.ammoInventory));
        run.hp = snapshot.combat.hp;
        run.salvage = snapshot.combat.salvage;
        run.medkits = snapshot.combat.medkits;
      }
      if (run.quiz && run.phase === "quiz") {
        if (
          snapshot.questionId &&
          snapshot.questionId !== run.quiz.questions[run.quiz.index]?.id
        )
          return;
        run.quiz.elapsedMs = Math.min(
          quizTimeLimit(run.quiz),
          Math.max(
            run.quiz.elapsedMs,
            snapshot.elapsedMs ?? run.quiz.elapsedMs,
          ),
        );
        run.quiz.remainingMs = quizTimeLimit(run.quiz) - run.quiz.elapsedMs;
        run.quiz.draft = snapshot.draft ?? run.quiz.draft;
      }
      if (run.quiz && run.phase === "correction")
        run.quiz.correctionDraft =
          snapshot.correctionDraft ?? run.quiz.correctionDraft;
    });
  }
  finishWave(id: string, outcome: CombatOutcome): void {
    this.command(id, "combat", (run) => {
      if (run.wave >= run.totalWaves)
        throw new Error("The final wave ends the mission.");
      const { ammoInventory, chestLoot, ...stats } = outcome;
      run.waveLoot = structuredClone(chestLoot ?? []);
      Object.assign(run, stats);
      if (ammoInventory) Object.assign(run, structuredClone(ammoInventory));
      run.salvage = Math.max(run.salvage, run.wave === 1 ? 8 : 0);
      run.combatSave = undefined;
      run.phase = "quiz";
      initializeQuiz(run);
    });
  }
  settleWaveLoot(
    id: string,
    lootId: string | "all",
    disposition: "accept" | "sell",
  ): void {
    this.command(id, "shop", (run) => {
      if (disposition !== "accept" && disposition !== "sell") return;
      const selected = (run.waveLoot ?? []).filter(
        (item) => lootId === "all" || item.id === lootId,
      );
      if (!selected.length) return;
      if (disposition === "accept") acquireAmmo(run, structuredClone(selected));
      else
        run.salvage += selected.reduce(
          (sum, item) => sum + ammoSellPrice(item),
          0,
        );
      const ids = new Set(selected.map((item) => item.id));
      run.waveLoot = run.waveLoot!.filter((item) => !ids.has(item.id));
    });
  }
  submit(
    id: string,
    occurrenceId: string,
    input: string,
    elapsedMs: number,
  ): string | undefined {
    if (!parseNumericAnswer(input))
      return "Enter a complete number or fraction.";
    return this.command(id, "quiz", (run, profile) => {
      const quiz = run.quiz!;
      const question = quiz.questions[quiz.index];
      if (!question || question.id !== occurrenceId) return;
      const correct = isCorrect(input, question.answer);
      const index = quiz.index;
      quiz.attempts.push({ question, input, correct, corrected: correct });
      quiz.index++;
      quiz.draft = "";
      quiz.elapsedMs = Math.min(
        quizTimeLimit(quiz),
        Math.max(quiz.elapsedMs, elapsedMs),
      );
      quiz.remainingMs = quizTimeLimit(quiz) - quiz.elapsedMs;
      profile.history.push({
        source: question.source ? structuredClone(question.source) : undefined,
        skill: question.skill,
        standards: question.standards ? [...question.standards] : undefined,
        occurrenceId: `${run.id}:${run.wave}:${index}`,
        question: question.prompt,
        grade: run.grade,
        correctInitially: correct,
        corrected: correct,
        at: Date.now(),
      });
      if (quiz.index === quiz.questions.length) {
        const wrong = quiz.attempts.filter((a) => !a.correct).length;
        quiz.rewardQuality =
          QUALITY_ORDER[
            Math.max(
              0,
              QUALITY_ORDER.indexOf(timeQuality(quizRewardTime(quiz))) - wrong,
            )
          ];
        quiz.rewardChoices = rewardModules(
          quiz.rewardQuality,
          run.wave,
          run.modules,
        );
        run.phase = wrong ? "correction" : "reward";
      }
      return correct
        ? "Correct."
        : `We’ll review that after question ${quiz.questions.length}.`;
    });
  }
  skipQuizForQA(id: string): void {
    this.command(id, null, (run) => {
      if (run.phase !== "quiz" && run.phase !== "correction") return;
      const quiz = run.quiz!;
      quiz.qaSkipped = true;
      quiz.rewardQuality ??= "purple";
      quiz.rewardChoices ??= rewardModules(
        quiz.rewardQuality,
        run.wave,
        run.modules,
      );
      run.phase = "reward";
    });
  }
  chooseReward(id: string, rewardId: string): void {
    this.command(id, "reward", (run) => {
      const quiz = run.quiz!;
      if (quiz.selectedReward) return;
      const module = quiz.rewardChoices?.find((m) => m.id === rewardId);
      if (!module) return;
      quiz.selectedReward = rewardId;
      installModule(run, module);
      this.enterShop(run);
    });
  }
  correct(
    id: string,
    occurrenceId: string,
    input: string,
    commandId = uid("correction"),
  ): string | undefined {
    if (!parseNumericAnswer(input))
      return "Enter a complete number or fraction.";
    return this.command(id, "correction", (run, profile) => {
      const quiz = run.quiz!;
      const index = quiz.attempts.findIndex((a) => !a.corrected);
      const attempt = quiz.attempts[index];
      if (!attempt || attempt.question.id !== occurrenceId) return;
      const history = profile.history.find(
        (h) => h.occurrenceId === occurrenceId,
      );
      if (!history) throw new Error("Missing initial answer history.");
      history.correctionAttempts ??= [];
      if (history.correctionAttempts.some((a) => a.id === commandId)) return;
      const correct = isCorrect(input, attempt.question.answer);
      history.correctionAttempts.push({
        id: commandId,
        input,
        correct,
        at: Date.now(),
      });
      quiz.correctionDraft = input;
      if (!correct) return "Try again. Use the hint and take your time.";
      attempt.corrected = true;
      quiz.correctionDraft = "";
      history.corrected = true;
      if (quiz.attempts.every((a) => a.corrected)) {
        if (quiz.selectedReward) this.enterShop(run);
        else run.phase = "reward";
      }
      return "Correct.";
    });
  }
  private enterShop(run: RunState): void {
    run.phase = "shop";
    createShop(run);
  }

  openShop(id: string): void {
    this.command(id, null, (run) => {
      if (run.phase !== "cache" && run.phase !== "shop") return;
      run.phase = "shop";
      migrateShop(run);
    });
  }
  reroll(id: string): string | undefined {
    return this.command(id, "shop", (run) => rerollShop(run));
  }
  buy(id: string, offerId: string): string | undefined {
    return this.command(id, "shop", (run) => {
      const offer = shopOffers(run).find((o) => o.id === offerId);
      if (!offer || offer.disabled || offer.purchased)
        return "That offer is unavailable.";
      if (run.salvage < offer.price) return "Not enough salvage yet.";
      run.salvage -= offer.price;
      run.shopBought.push(offer.id);
      if (offer.kind === "expand") run.ammoCapacity++;
      if (offer.kind === "medkit") run.medkits++;
      if (offer.kind === "repair") run.hp = Math.min(run.maxHp, run.hp + 30);
      if (offer.kind === "ammo")
        acquireAmmo(run, [
          { id: uid("ammo"), type: offer.ammoType!, tier: offer.ammoTier ?? 1 },
        ]);
      if (offer.kind === "module") installModule(run, offer.module);
      refreshShop(run);
      return "Purchase installed.";
    });
  }
  toggleAmmo(id: string, ammoId: string): string | undefined {
    return this.command(id, "shop", (run) => {
      const ammo = run.ammo.find((a) => a.id === ammoId);
      if (!ammo) return;
      if (run.activeAmmoIds.includes(ammoId))
        run.activeAmmoIds = run.activeAmmoIds.filter(
          (active) => active !== ammoId,
        );
      else {
        if (
          !ammo.legendary &&
          run.activeAmmoIds.some(
            (active) =>
              run.ammo.find((a) => a.id === active)?.type === ammo.type,
          )
        )
          return "That ammo type is already active.";
        if (run.activeAmmoIds.length >= run.ammoCapacity)
          run.activeAmmoIds.pop();
        run.activeAmmoIds.push(ammoId);
      }
      return "Loadout updated.";
    });
  }
  previewMerges(id: string): MergePreview {
    return previewMerges(this.profile(id).activeRun!);
  }
  mergeAll(id: string): string | undefined {
    return this.command(id, "shop", (run) => {
      let count = 0;
      for (;;) {
        const preview = previewMerges(run);
        if (!applyMerges(run, preview)) break;
        count += preview.pairs.length;
      }
      return count
        ? `Combined ${count} matching pairs.`
        : "No matching ammo to merge.";
    });
  }
  mergePreview(id: string, preview: MergePreview): string | undefined {
    return this.command(id, "shop", (run) =>
      applyMerges(run, preview)
        ? "Cartridges combined."
        : "Loadout changed. Review the merge again.",
    );
  }
  merge(id: string, type: AmmoType, tier: number): void {
    this.command(id, "shop", (run) => {
      if (!Number.isInteger(tier) || tier < 1 || tier > 3) return;
      const preview = previewMerges(run, type, tier);
      preview.pairs = preview.pairs.slice(0, 1);
      applyMerges(run, preview);
    });
  }
  sellAmmo(id: string, ammoId: string): string | undefined {
    return this.command(id, "shop", (run) => {
      const ammo = run.ammo.find((a) => a.id === ammoId);
      if (!ammo || ammo.legendary) return "That cartridge cannot be sold.";
      if (run.activeAmmoIds.includes(ammoId))
        return "Unequip this cartridge before selling it.";
      run.salvage += ammoSellPrice(ammo);
      run.ammo = run.ammo.filter((a) => a.id !== ammoId);
      return "Cartridge sold.";
    });
  }
  selectForgeIngredients(id: string, ingredientIds?: string[]): void {
    this.command(id, "shop", (run) => {
      const ids = ingredientIds ?? previewForge(run).ingredientIds;
      if (
        ids.length > 5 ||
        new Set(ids).size !== ids.length ||
        ids.some(
          (id) =>
            !run.ammo.some((a) => a.id === id && a.tier === 4 && !a.legendary),
        )
      )
        return;
      run.forgeIngredientIds = [...ids];
    });
  }
  cancelForge(id: string): void {
    this.command(id, "shop", (run) => {
      run.forgeIngredientIds = undefined;
    });
  }
  forge(id: string, preview?: ForgePreview): void {
    this.command(id, "shop", (run) => {
      applyForge(run, preview ?? previewForge(run));
    });
  }
  jumpToWaveForQA(
    id: string,
    wave: number,
    loadout: Omit<Ammo, "id">[],
    options: QAJumpOptions = {},
  ): void {
    if (!this.qaEnabled)
      throw new Error("QA controls are only available in development.");
    this.command(id, null, (run) => {
      if (!Number.isInteger(wave) || wave < 1 || wave > run.totalWaves)
        throw new Error("Choose a wave in this mission.");
      if (
        loadout.length > 4 ||
        loadout.some(
          (ammo) =>
            !AMMO_TYPES.includes(ammo.type) ||
            ![1, 2, 3, 4].includes(ammo.tier) ||
            (ammo.legendary && (ammo.type !== "Piercing" || ammo.tier !== 4)),
        )
      )
        throw new Error("Choose up to four valid ammo pieces.");
      if (
        options.section !== undefined &&
        !["combat", "quiz"].includes(options.section)
      )
        throw new Error("Choose combat or quiz.");
      if (options.section === "quiz" && wave === run.totalWaves)
        throw new Error("The final wave has no quiz. Choose an earlier wave.");
      if (
        options.salvage !== undefined &&
        (!Number.isInteger(options.salvage) ||
          options.salvage < 0 ||
          options.salvage > 1000000)
      )
        throw new Error("Choose a salvage balance from 0 to 1,000,000.");
      if (
        options.clearTrinkets !== undefined &&
        typeof options.clearTrinkets !== "boolean"
      )
        throw new Error("Choose whether to clear installed trinkets.");
      if (options.clearTrinkets) {
        run.maxHp -= moduleTotal(run.modules, "maxHp");
        run.modules = [];
      }
      if ((options.trinkets?.length ?? 0) > 4)
        throw new Error("Choose up to four trinkets to add at once.");
      for (const selection of options.trinkets ?? []) {
        if (!QUALITY_ORDER.includes(selection.quality))
          throw new Error("Choose a valid trinket rarity.");
        const module = moduleCandidates(
          selection.quality,
          wave,
          run.modules,
        ).find((item) => item.name === selection.name);
        if (!module)
          throw new Error(
            "Trinket unavailable or its stats are capped. Clear installed trinkets or choose another.",
          );
        installModule(run, module);
      }
      if (options.salvage !== undefined) run.salvage = options.salvage;
      // A new QA attempt must not reuse earlier question/history occurrence IDs.
      run.id = uid("qa-run");
      run.wave = wave;
      run.phase = "combat";
      run.hp = run.maxHp;
      run.ammo = loadout.map((ammo) => ({ ...ammo, id: uid("ammo") }));
      run.activeAmmoIds = run.ammo.map((ammo) => ammo.id);
      run.ammoCapacity = Math.max(run.ammoCapacity, loadout.length);
      run.forgedOmni = run.ammo.some((ammo) => ammo.legendary);
      run.ammoBag = undefined;
      run.waveLoot = undefined;
      run.forgeIngredientIds = undefined;
      run.quiz = undefined;
      run.combatSave = undefined;
      run.cacheClaimed = false;
      run.choiceCache = undefined;
      run.shopBought = [];
      run.shop = undefined;
      if (options.section === "quiz") {
        run.phase = "quiz";
        initializeQuiz(run);
      }
    });
  }
  nextWave(id: string): void {
    this.command(id, "shop", (run) => {
      if (run.waveLoot?.length) return;
      run.waveLoot = undefined;
      run.forgeIngredientIds = undefined;
      run.wave++;
      run.phase = "combat";
      run.quiz = undefined;
      run.combatSave = undefined;
      run.cacheClaimed = false;
      run.choiceCache = undefined;
      run.shopBought = [];
      run.shop = undefined;
    });
  }
  end(
    id: string,
    victory: boolean,
    outcome?: CombatOutcome,
  ): RunState | undefined {
    return this.command(id, null, (run, profile) => {
      if (outcome) Object.assign(run, outcome);
      const summary = structuredClone(run);
      if (victory) profile.victories++;
      profile.activeRun = undefined;
      return summary;
    });
  }
}
