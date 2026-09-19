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
import { rewardModules, installModule } from "./modules";
import { isCorrect, makeQuestions, parseNumericAnswer } from "./questions";
import {
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
        run.quiz.elapsedMs = Math.min(
          30000,
          Math.max(
            run.quiz.elapsedMs,
            snapshot.elapsedMs ?? run.quiz.elapsedMs,
          ),
        );
        run.quiz.remainingMs = 30000 - run.quiz.elapsedMs;
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
      const questions = makeQuestions(run.grade, run.wave, run.id).map(
        (q, index) => ({ ...q, id: `${run.id}:${run.wave}:${index}` }),
      );
      run.quiz = {
        questions,
        index: 0,
        attempts: [],
        elapsedMs: 0,
        remainingMs: 30000,
        correctionIndex: 0,
        draft: "",
      };
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
      quiz.elapsedMs = Math.min(30000, Math.max(quiz.elapsedMs, elapsedMs));
      quiz.remainingMs = 30000 - quiz.elapsedMs;
      profile.history.push({
        occurrenceId: `${run.id}:${run.wave}:${index}`,
        question: question.prompt,
        grade: run.grade,
        correctInitially: correct,
        corrected: correct,
        at: Date.now(),
      });
      if (quiz.index === 5) {
        const wrong = quiz.attempts.filter((a) => !a.correct).length;
        quiz.rewardQuality =
          QUALITY_ORDER[
            Math.max(
              0,
              QUALITY_ORDER.indexOf(timeQuality(quiz.remainingMs)) - wrong,
            )
          ];
        quiz.rewardChoices = rewardModules(
          quiz.rewardQuality,
          run.wave,
          run.modules,
        );
        run.phase = wrong ? "correction" : "reward";
      }
      return correct ? "Correct." : "We’ll review that after question 5.";
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
