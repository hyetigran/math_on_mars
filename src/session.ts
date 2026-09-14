import {
  acquireAmmo,
  createChoiceCache,
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
  AMMO_TYPES,
  QUALITY_ORDER,
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
export function canForge(run: RunState): boolean {
  return (
    !run.ammo.some((a) => a.legendary) &&
    AMMO_TYPES.every((type) =>
      run.ammo.some((a) => a.type === type && a.tier === 4),
    )
  );
}
function newRun(grade: Grade): RunState {
  const starter: Ammo = { id: uid("ammo"), type: "Piercing", tier: 1 };
  return {
    id: uid("run"),
    grade,
    wave: 1,
    totalWaves: 10,
    difficulty: "standard",
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
  start(id: string, grade: Grade): void {
    if (this.paused) return;
    this.change((profiles) => {
      const profile = profiles.find((p) => p.id === id)!;
      if (profile.activeRun) throw new Error("Resume the active run first.");
      profile.grade = grade;
      profile.activeRun = newRun(grade);
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
      const { ammoInventory, ...stats } = outcome;
      Object.assign(run, stats);
      if (ammoInventory) Object.assign(run, structuredClone(ammoInventory));
      run.salvage = Math.max(run.salvage, run.wave === 1 ? 8 : 0);
      run.combatSave = undefined;
      run.phase = "quiz";
      const questions = makeQuestions(run.grade, run.wave, id).map(
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
        run.phase = "reward";
      }
      return correct
        ? "Correct — reactor stable."
        : "Logged — you’ll fix that one after choosing a reward.";
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
      run.phase = quiz.attempts.some((a) => !a.corrected)
        ? "correction"
        : "cache";
      if (run.phase === "cache") this.enterSupply(run);
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
        this.enterSupply(run);
      }
      return "Correct — repair complete.";
    });
  }
  private enterSupply(run: RunState): void {
    const milestones = run.totalWaves === 6 ? [1, 2, 3, 4, 5] : [1, 3, 5, 7, 8];
    if (milestones.includes(run.wave)) {
      run.phase = "cache";
      createChoiceCache(run);
    } else {
      run.phase = "shop";
      createShop(run);
    }
  }
  openCache(id: string): void {
    this.command(id, "cache", (run) => createChoiceCache(run));
  }
  claimCache(id: string, type?: AmmoType): void {
    // Compatibility for existing callers; settlement still uses the saved bundle.
    this.command(id, "cache", (run) => {
      createChoiceCache(run);
      const option = run.choiceCache!.options.find((o) =>
        type
          ? o.kind === "ammo" && o.ammo[0].type === type
          : o.kind === "module",
      );
      if (option) this.applyCache(run, option.id, "accept");
    });
  }
  settleCache(
    id: string,
    cacheId: string,
    optionId: string,
    disposition: "accept" | "sell",
  ): void {
    this.command(id, "cache", (run) => {
      if (run.choiceCache?.id !== cacheId) return;
      this.applyCache(run, optionId, disposition);
    });
  }
  private applyCache(
    run: RunState,
    optionId: string,
    disposition: "accept" | "sell",
  ): void {
    const cache = run.choiceCache;
    if (
      !cache ||
      cache.kind !== "choice" ||
      cache.selectedOptionId ||
      run.cacheClaimed
    )
      return;
    if (disposition !== "accept" && disposition !== "sell") return;
    const option = cache.options.find((o) => o.id === optionId);
    if (!option) return;
    if (disposition === "sell") run.salvage += option.sellPrice;
    else if (option.kind === "ammo")
      acquireAmmo(run, structuredClone(option.ammo));
    else installModule(run, structuredClone(option.module));
    cache.selectedOptionId = optionId;
    cache.disposition = disposition;
    run.cacheClaimed = true;
    run.phase = "shop";
    createShop(run);
  }
  openShop(id: string): void {
    this.command(id, "shop", (run) => migrateShop(run));
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
  forge(id: string): void {
    this.command(id, "shop", (run) => {
      if (!canForge(run)) return;
      const consumed = AMMO_TYPES.map(
        (type) => run.ammo.find((a) => a.type === type && a.tier === 4)!.id,
      );
      run.ammo = run.ammo.filter((a) => !consumed.includes(a.id));
      run.activeAmmoIds = run.activeAmmoIds.filter(
        (active) => !consumed.includes(active),
      );
      const omni: Ammo = {
        id: uid("ammo"),
        type: "Piercing",
        tier: 4,
        legendary: true,
      };
      run.ammo.push(omni);
      if (run.activeAmmoIds.length >= run.ammoCapacity) run.activeAmmoIds.pop();
      run.activeAmmoIds.unshift(omni.id);
    });
  }
  nextWave(id: string): void {
    this.command(id, "shop", (run) => {
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
