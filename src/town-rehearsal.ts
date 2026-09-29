import { QUESTION_BANK, bankQuestion } from "./question-bank";
import { isCorrect } from "./questions";
import type { Grade, Question } from "./types";
/** In-memory balance experiment, never an authority for connected cadet saves. */
export const REHEARSAL_BASELINE = {
  adults: 2,
  houseCapacity: 2,
  upgradedCapacity: 4,
  blocks: 80,
  parts: 20,
  tradeCredits: 60,
  food: 24,
  foodCapacity: 72,
  power: 10,
  water: 10,
  oxygen: 10,
  constructionSlots: 2,
  greenhouseBlocks: 20,
  greenhouseParts: 5,
  greenhouseSeconds: 10,
  upgradeBlocks: 40,
  upgradeParts: 10,
  upgradeSeconds: 3600,
  seedCost: 10,
  cropSeconds: 1800,
  cropYield: 4,
  mealSeconds: 3600,
  creditPerQuestion: 240,
} as const;
export type RehearsalBalance = {
  [K in keyof typeof REHEARSAL_BASELINE]: number;
};
export type Project = "greenhouse" | "house";
export interface RehearsalState {
  constructionCredit: number;
  seedUnlocked: boolean;
  workerAssigned: boolean;
  cropRemaining: number;
  mealRemaining: number;
  heldHarvest: number;
  emergencyMeals: number;
  now: number;
  blocks: number;
  parts: number;
  tradeCredits: number;
  food: number;
  greenhouse: boolean;
  houseLevel: number;
  jobs: { kind: Project; remaining: number }[];
}
export class TownRehearsal {
  readonly balance: RehearsalBalance;
  private state: RehearsalState;
  private practice: {
    questions: Question[];
    firstAttempts: Record<string, boolean>;
    corrected: string[];
    completed: boolean;
    reward: number;
    repeated: boolean;
  } | null = null;
  private cursors = new Map<string, number>();
  private seen = new Set<string>();
  readonly eligibleTopics = [
    ...new Map(
      QUESTION_BANK.map((q) => [
        `${q.grade}:${q.skill}`,
        { grade: q.grade, skill: q.skill },
      ]),
    ).values(),
  ];
  practiceSnapshot() {
    return structuredClone(this.practice);
  }
  beginPractice(grade: Grade, skill: string) {
    if (this.practice && !this.practice.completed)
      throw Error("Finish the current practice set first");
    const pool = QUESTION_BANK.filter(
      (q) => q.grade === grade && q.skill === skill,
    );
    if (!pool.length) throw Error("Topic not eligible in the rehearsal bank");
    const key = `${grade}:${skill}`,
      cursor = this.cursors.get(key) ?? 0;
    const questions = Array.from({ length: Math.min(5, pool.length) }, (_, i) =>
      bankQuestion(pool[(cursor + i) % pool.length]),
    );
    const repeated = questions.some((q) => this.seen.has(q.id));
    questions.forEach((q) => this.seen.add(q.id));
    this.cursors.set(key, cursor + questions.length);
    this.practice = {
      questions,
      firstAttempts: {},
      corrected: [],
      completed: false,
      reward: questions.length * this.balance.creditPerQuestion,
      repeated,
    };
    return this.practiceSnapshot()!;
  }
  answer(id: string, value: string) {
    const p = this.practice,
      q = p?.questions.find((q) => q.id === id);
    if (!p || !q || p.completed || p.corrected.includes(id))
      throw Error("Question is not awaiting an answer");
    const correct = isCorrect(value, q.answer);
    if (!(id in p.firstAttempts)) p.firstAttempts[id] = correct;
    if (correct) p.corrected.push(id);
    if (p.corrected.length === p.questions.length) {
      p.completed = true;
      this.state.constructionCredit += p.reward;
    }
    return correct;
  }
  applyCredit(kind: Project) {
    const job = this.state.jobs.find((j) => j.kind === kind);
    if (!job) throw Error("No running project");
    const used = Math.min(job.remaining, this.state.constructionCredit);
    job.remaining -= used;
    this.state.constructionCredit -= used;
    this.complete();
  }

  constructor(overrides: Partial<RehearsalBalance> = {}) {
    this.balance = Object.freeze({ ...REHEARSAL_BASELINE, ...overrides });
    for (const [key, value] of Object.entries(this.balance))
      if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000)
        throw Error(`Invalid balance value: ${key}`);
    for (const key of [
      "cropSeconds",
      "mealSeconds",
      "greenhouseSeconds",
      "upgradeSeconds",
      "constructionSlots",
    ] as const)
      if (this.balance[key] < 1) throw Error(`Positive ${key} required`);
    if (
      this.balance.food > this.balance.foodCapacity ||
      this.balance.adults > this.balance.houseCapacity ||
      this.balance.upgradedCapacity < this.balance.houseCapacity ||
      this.balance.cropYield > this.balance.foodCapacity
    )
      throw Error("Incompatible stock, housing or harvest capacity");
    this.state = {
      constructionCredit: 0,
      seedUnlocked: false,
      workerAssigned: false,
      cropRemaining: this.balance.cropSeconds,
      mealRemaining: this.balance.mealSeconds,
      heldHarvest: 0,
      emergencyMeals: 0,
      now: 0,
      blocks: this.balance.blocks,
      parts: this.balance.parts,
      tradeCredits: this.balance.tradeCredits,
      food: this.balance.food,
      greenhouse: false,
      houseLevel: 1,
      jobs: [],
    };
  }
  snapshot() {
    const reserveTarget = Math.ceil(
      (this.balance.adults * 86400) / this.balance.mealSeconds,
    );
    return {
      ...structuredClone(this.state),
      reserveTarget,
      reservedFood: Math.min(this.state.food, reserveTarget),
      availableAdults: this.balance.adults - Number(this.state.workerAssigned),
      cropOperating: this.growing(),
      houseCapacity:
        this.state.houseLevel === 1
          ? this.balance.houseCapacity
          : this.balance.upgradedCapacity,
    };
  }
  unlockSeed() {
    if (this.state.seedUnlocked) throw Error("Seed already unlocked");
    if (this.state.tradeCredits < this.balance.seedCost)
      throw Error("Not enough trade credits");
    this.state.tradeCredits -= this.balance.seedCost;
    this.state.seedUnlocked = true;
  }
  assignWorker(assigned: boolean) {
    if (!this.state.greenhouse) throw Error("Build the Greenhouse first");
    if (assigned && this.balance.adults < 1) throw Error("No available adult");
    this.state.workerAssigned = assigned;
  }
  private growing() {
    return (
      this.state.greenhouse &&
      this.state.seedUnlocked &&
      this.state.workerAssigned &&
      this.state.heldHarvest === 0 &&
      this.balance.power >= 2 &&
      this.balance.water >= this.balance.adults + 2
    );
  }
  private transferHarvest() {
    if (
      this.state.heldHarvest &&
      this.state.food + this.state.heldHarvest <= this.balance.foodCapacity
    ) {
      this.state.food += this.state.heldHarvest;
      this.state.heldHarvest = 0;
    }
  }

  start(kind: Project) {
    const b = this.balance,
      s = this.state;
    if (
      s.jobs.some((j) => j.kind === kind) ||
      (kind === "greenhouse" ? s.greenhouse : s.houseLevel > 1)
    )
      throw Error("Project already built or running");
    if (s.jobs.length >= b.constructionSlots)
      throw Error("No free construction slot");
    const blocks = kind === "greenhouse" ? b.greenhouseBlocks : b.upgradeBlocks;
    const parts = kind === "greenhouse" ? b.greenhouseParts : b.upgradeParts;
    if (s.blocks < blocks || s.parts < parts)
      throw Error("Not enough materials");
    s.blocks -= blocks;
    s.parts -= parts;
    s.jobs.push({
      kind,
      remaining: kind === "greenhouse" ? b.greenhouseSeconds : b.upgradeSeconds,
    });
  }
  advance(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) throw Error("Invalid time");
    if (seconds > 30 * 86400)
      throw Error("Advance at most 30 days per rehearsal step");
    let remaining = seconds;
    while (remaining > 0) {
      this.transferHarvest();
      const growing = this.growing();
      const step = Math.min(
        remaining,
        this.state.mealRemaining,
        ...this.state.jobs.map((j) => j.remaining),
        growing ? this.state.cropRemaining : Infinity,
      );
      this.state.now += step;
      remaining -= step;
      this.state.mealRemaining -= step;
      for (const job of this.state.jobs) job.remaining -= step;
      if (growing) this.state.cropRemaining -= step;
      this.complete();
      if (this.state.mealRemaining === 0) {
        const meals = Math.min(this.state.food, this.balance.adults);
        this.state.food -= meals;
        this.state.emergencyMeals += this.balance.adults - meals;
        this.state.mealRemaining = this.balance.mealSeconds;
      }
      if (growing && this.state.cropRemaining === 0) {
        this.state.heldHarvest = this.balance.cropYield;
        this.state.cropRemaining = this.balance.cropSeconds;
      }
      this.transferHarvest();
    }
  }

  private complete() {
    for (const job of this.state.jobs.filter((j) => j.remaining === 0)) {
      if (job.kind === "greenhouse") this.state.greenhouse = true;
      else this.state.houseLevel = 2;
    }
    this.state.jobs = this.state.jobs.filter((j) => j.remaining > 0);
  }
}
