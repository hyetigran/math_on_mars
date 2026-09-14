import { rewardModules, moduleTotal } from "./modules";
import { isCorrect, makeQuestions, parseNumericAnswer } from "./questions";
import {
  AMMO_TYPES,
  QUALITY_ORDER,
  uid,
  type Ammo,
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
  hp: number;
  salvage: number;
  medkits: number;
}
export interface ShopOffer {
  id: string;
  title: string;
  detail: string;
  price: number;
  disabled: boolean;
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
export function shopOffers(run: RunState): ShopOffer[] {
  return [
    {
      id: "expand",
      title: "Ammo Expander",
      detail:
        run.ammoCapacity < 4
          ? `Equip ${run.ammoCapacity + 1} ammo effects at once`
          : "Active ammo slots are full",
      price: [8, 16, 24][run.ammoCapacity - 1] ?? 24,
      disabled: run.ammoCapacity >= 4,
    },
    {
      id: "medkit",
      title: "Med-gel",
      detail: "Carry one extra heal into combat",
      price: 5,
      disabled: false,
    },
    {
      id: "ammo",
      title: `${AMMO_TYPES[run.wave % AMMO_TYPES.length]} Ammo`,
      detail: "Add one White T1 cartridge to your locker",
      price: 6,
      disabled: false,
    },
    {
      id: "repair",
      title: "Suit Repair",
      detail: "Restore 30 Suit Integrity",
      price: 4,
      disabled: run.hp >= run.maxHp,
    },
  ];
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
      Object.assign(run, outcome);
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
      const previousHpBonus = moduleTotal(run.modules, "maxHp");
      run.modules.push(module);
      const hpGain = moduleTotal(run.modules, "maxHp") - previousHpBonus;
      run.maxHp += hpGain;
      run.hp += hpGain;
      run.phase = quiz.attempts.some((a) => !a.corrected)
        ? "correction"
        : "cache";
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
      if (quiz.attempts.every((a) => a.corrected)) run.phase = "cache";
      return "Correct — repair complete.";
    });
  }
  claimCache(id: string, type?: AmmoType): void {
    this.command(id, "cache", (run) => {
      if (run.cacheClaimed) return;
      if (type)
        run.ammo.push(
          { id: uid("ammo"), type, tier: 3 },
          { id: uid("ammo"), type, tier: 3 },
        );
      else
        run.modules.push({
          id: uid("module"),
          name: "Field Plating",
          stat: "armor",
          value: 2,
          quality: "green",
        });
      run.cacheClaimed = true;
      run.phase = "shop";
    });
  }
  buy(id: string, offerId: string): string | undefined {
    return this.command(id, "shop", (run) => {
      const offer = shopOffers(run).find((o) => o.id === offerId);
      if (!offer || offer.disabled || run.shopBought.includes(offerId))
        return "That offer is unavailable.";
      if (run.salvage < offer.price) return "Not enough salvage yet.";
      run.salvage -= offer.price;
      run.shopBought.push(offerId);
      if (offerId === "expand") run.ammoCapacity++;
      if (offerId === "medkit") run.medkits++;
      if (offerId === "ammo")
        run.ammo.push({
          id: uid("ammo"),
          type: AMMO_TYPES[run.wave % AMMO_TYPES.length],
          tier: 1,
        });
      if (offerId === "repair") run.hp = Math.min(run.maxHp, run.hp + 30);
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
  merge(id: string, type: AmmoType, tier: number): void {
    this.command(id, "shop", (run) => {
      if (tier < 1 || tier > 3) return;
      const pair = run.ammo
        .filter((a) => !a.legendary && a.type === type && a.tier === tier)
        .slice(0, 2);
      if (pair.length !== 2) return;
      const activeIndex = run.activeAmmoIds.findIndex((active) =>
        pair.some((a) => a.id === active),
      );
      run.ammo = run.ammo.filter((a) => !pair.some((p) => p.id === a.id));
      run.activeAmmoIds = run.activeAmmoIds.filter(
        (active) => !pair.some((p) => p.id === active),
      );
      const result: Ammo = {
        id: uid("ammo"),
        type,
        tier: (tier + 1) as 2 | 3 | 4,
      };
      run.ammo.push(result);
      if (activeIndex >= 0) run.activeAmmoIds.splice(activeIndex, 0, result.id);
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
      run.shopBought = [];
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
