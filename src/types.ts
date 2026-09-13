export const GRADES = ["K", "1", "2", "3", "4", "5", "6"] as const;
export type Grade = (typeof GRADES)[number];

export const AMMO_TYPES = [
  "Piercing",
  "Multi Shot",
  "Electric Chain",
  "Frost",
  "Fiery",
] as const;
export type AmmoType = (typeof AMMO_TYPES)[number];
export type Tier = 1 | 2 | 3 | 4;
export type Quality = "white" | "green" | "blue" | "purple";

export interface Ammo {
  id: string;
  type: AmmoType;
  tier: Tier;
  legendary?: boolean;
}

export interface Module {
  id: string;
  name: string;
  stat: "damage" | "attackSpeed" | "maxHp" | "armor" | "moveSpeed" | "healing";
  value: number;
  quality: Quality;
}

export interface Question {
  id: string;
  prompt: string;
  spoken: string;
  answer: [number, number];
  hint: string;
  explanation: string;
  visualCount?: number;
}

export interface Attempt {
  question: Question;
  input: string;
  correct: boolean;
  corrected: boolean;
}

export interface QuizState {
  draft?: string;
  correctionDraft?: string;
  questions: Question[];
  index: number;
  attempts: Attempt[];
  elapsedMs: number;
  remainingMs: number;
  rewardQuality?: Quality;
  rewardChoices?: Module[];
  selectedReward?: string;
  correctionIndex: number;
}

export interface CombatEnemySave {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  boss: boolean;
  slowRemainingMs: number;
  slowAmount: number;
  burnRemainingMs: number;
  burnDps: number;
}

export interface CombatBoltSave {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  pierce: number;
  hitIds: number[];
  chain: number;
  frost: number;
  fiery: number;
}

export interface CombatSaveV1 {
  version: 1;
  wave: number;
  hp: number;
  salvage: number;
  medkits: number;
  marine: { x: number; y: number };
  spawned: number;
  spawnTotal: number;
  nextEnemyId: number;
  rngState: number;
  spawnCooldownMs: number;
  shotCooldownMs: number;
  enemies: CombatEnemySave[];
  bolts: CombatBoltSave[];
}

export interface CombatShotSave {
  id: number;
  baseDamage: number;
  chainRemaining: number;
  chainStarted: boolean;
  chainVisited: number[];
  burnFunds: number;
  frost: number;
  fiery: number;
}

export interface CombatEnemySaveV2 extends Omit<
  CombatEnemySave,
  "burnRemainingMs" | "burnDps"
> {
  burnRemainingDamage: number;
  burnRate: number;
}

export interface CombatBoltSaveV2 extends Omit<
  CombatBoltSave,
  "chain" | "frost" | "fiery"
> {
  id: number;
  shotId: number;
}

export interface CombatSaveV2 extends Omit<
  CombatSaveV1,
  "version" | "enemies" | "bolts"
> {
  version: 2;
  nextShotId: number;
  nextBoltId: number;
  stepRemainderMs: number;
  shots: CombatShotSave[];
  enemies: CombatEnemySaveV2[];
  bolts: CombatBoltSaveV2[];
}

export type CombatSave = CombatSaveV1 | CombatSaveV2;

export interface RunState {
  id: string;
  grade: Grade;
  wave: number;
  totalWaves: number;
  difficulty: "easy" | "standard";
  hp: number;
  maxHp: number;
  salvage: number;
  medkits: number;
  ammoCapacity: number;
  ammo: Ammo[];
  activeAmmoIds: string[];
  modules: Module[];
  phase: "combat" | "quiz" | "reward" | "correction" | "cache" | "shop";
  quiz?: QuizState;
  shopBought: string[];
  cacheClaimed: boolean;
  combatSave?: CombatSave;
}

export interface HistoryEntry {
  occurrenceId: string;
  question: string;
  grade: Grade;
  correctInitially: boolean;
  corrected: boolean;
  at: number;
}

export interface Profile {
  id: string;
  name: string;
  grade: Grade;
  handedness: "left" | "right";
  history: HistoryEntry[];
  activeRun?: RunState;
  victories: number;
}

export const QUALITY_ORDER: Quality[] = ["white", "green", "blue", "purple"];
export const QUALITY_LABEL: Record<Quality, string> = {
  white: "White",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
};

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
