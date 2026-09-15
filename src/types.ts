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

export const STAT_NAMES = [
  "damage",
  "attackSpeed",
  "maxHp",
  "armor",
  "moveSpeed",
  "healing",
  "projectileSpeed",
  "pickupRadius",
] as const;
export type Stat = (typeof STAT_NAMES)[number];
export interface Modifier {
  stat: Stat;
  value: number;
}

export interface Module {
  id: string;
  name: string;
  stat: Stat;
  additionalModifiers?: Modifier[];
  value: number;
  quality: Quality;
}

export interface Question {
  answerInput?: "number" | "fraction";
  id: string;
  prompt: string;
  spoken: string;
  answer: [number, number];
  hint: string;
  explanation: string;
  visualCount?: number;
  visualGroups?: number[];
  visualGroupLabels?: string[];
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
  kind?: "drifter" | "spitter" | "charger" | "splitter" | "mini" | "overmind";
  bossAttack?: {
    pattern: "slam" | "fan" | "summon";
    phase: "cooldown" | "windup" | "active";
    remainingMs: number;
    dx: number;
    dy: number;
    hit: boolean;
    summons: number;
  };
  attack?: {
    phase: "windup" | "active" | "cooldown";
    remainingMs: number;
    dx: number;
    dy: number;
    hit: boolean;
  };
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
  enemyProjectiles?: {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    remainingMs: number;
  }[];
  nextEnemyProjectileId?: number;
  simulationTick?: number;
  ammoInventory?: AmmoInventory;
  pickups?: { id: number; x: number; y: number; value: number; ammo?: Ammo }[];
  nextShotId: number;
  nextBoltId: number;
  stepRemainderMs: number;
  shots: CombatShotSave[];
  enemies: CombatEnemySaveV2[];
  bolts: CombatBoltSaveV2[];
}

export type CombatSave = CombatSaveV1 | CombatSaveV2;

export type ShopItem = { id: string; title: string; price: number } & (
  | { kind: "module"; module: Module; ammoType?: never }
  | { kind: "ammo"; ammoType: AmmoType; ammoTier?: Tier; module?: never }
  | { kind: "medkit" | "expand" | "repair"; module?: never; ammoType?: never }
);
export interface ShopState {
  round: number;
  paidRerolls: number;
  offers: ShopItem[];
}

export type CacheOption = { id: string; sellPrice: number } & (
  | { kind: "ammo"; ammo: Ammo[]; module?: never }
  | { kind: "module"; module: Module; ammo?: never }
);
export interface ChoiceCache {
  kind: "choice";
  id: string;
  options: CacheOption[];
  selectedOptionId?: string;
  disposition?: "accept" | "sell";
}

export interface AmmoInventory {
  ammo: Ammo[];
  activeAmmoIds: string[];
  ammoCapacity: number;
  ammoBag?: AmmoType[];
}
export interface RunState extends AmmoInventory {
  releaseVersion?: string;
  forgedOmni?: boolean;
  forgeIngredientIds?: string[];
  choiceCache?: ChoiceCache;
  shop?: ShopState;
  interactionRevision?: number;
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
  correctionAttempts?: {
    id: string;
    input: string;
    correct: boolean;
    at: number;
  }[];
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
