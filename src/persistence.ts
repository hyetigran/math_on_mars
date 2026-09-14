import {
  AMMO_TYPES,
  GRADES,
  QUALITY_ORDER,
  STAT_NAMES,
  type Profile,
} from "./types";

export interface ProfileStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class ProfileStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ProfileStorageError";
  }
}

type RecordValue = Record<string, unknown>;
function ensure(condition: unknown, path: string): asserts condition {
  if (!condition)
    throw new ProfileStorageError(
      `Invalid saved profile data: ${path}. Your saved data has not been replaced.`,
    );
}
function ammoRecord(value: unknown): RecordValue {
  const item = record(value, "ammo");
  string(item.id, "ammo ID");
  choice(item.type, AMMO_TYPES, "ammo.type");
  integer(item.tier, "ammo.tier", 1, 4);
  if (item.legendary !== undefined) {
    boolean(item.legendary, "ammo.legendary");
    if (item.legendary) ensure(item.tier === 4, "legendary tier");
  }
  return item;
}
function inventoryRecord(value: unknown): void {
  const inventory = record(value, "ammo inventory");
  integer(inventory.ammoCapacity, "ammo capacity", 1, 4);
  const ammo = list(inventory.ammo, "ammo inventory items");
  uniqueIds(ammo, "ammo inventory");
  ammo.forEach(ammoRecord);
  ensure(
    ammo.filter((a) => ammoRecord(a).legendary).length <= 1,
    "multiple legendary cartridges",
  );
  const active = list(inventory.activeAmmoIds, "equipped ammo");
  ensure(
    active.length <= (inventory.ammoCapacity as number) &&
      new Set(active).size === active.length,
    "ammo capacity/duplicates",
  );
  const types = new Set();
  for (const id of active) {
    const item = ammo.find((a) => record(a, "ammo").id === id);
    ensure(item, "equipped ammo ownership");
    const cartridge = ammoRecord(item);
    if (!cartridge.legendary) {
      ensure(!types.has(cartridge.type), "duplicate equipped ammo type");
      types.add(cartridge.type);
    }
  }
  if (inventory.ammoBag !== undefined) {
    const bag = list(inventory.ammoBag, "ammo bag");
    ensure(new Set(bag).size === bag.length, "duplicate bag type");
    bag.forEach((type) => choice(type, AMMO_TYPES, "ammo bag type"));
  }
}
function record(value: unknown, path: string): RecordValue {
  ensure(
    value !== null && typeof value === "object" && !Array.isArray(value),
    path,
  );
  return value as RecordValue;
}
function list(value: unknown, path: string): unknown[] {
  ensure(Array.isArray(value), path);
  return value;
}
function string(value: unknown, path: string): asserts value is string {
  ensure(typeof value === "string", path);
}
function number(
  value: unknown,
  path: string,
  min = 0,
  max = Infinity,
): asserts value is number {
  ensure(
    typeof value === "number" &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max,
    path,
  );
}
function integer(
  value: unknown,
  path: string,
  min = 0,
  max = Infinity,
): asserts value is number {
  number(value, path, min, max);
  ensure(Number.isSafeInteger(value), path);
}
function boolean(value: unknown, path: string): void {
  ensure(typeof value === "boolean", path);
}
function choice(
  value: unknown,
  choices: readonly unknown[],
  path: string,
): void {
  ensure(choices.includes(value), path);
}
function uniqueIds(items: unknown[], path: string): void {
  const ids = items.map((item) => record(item, path).id);
  for (const id of ids) {
    string(id, path);
    ensure(id.length > 0, path);
  }
  ensure(new Set(ids).size === ids.length, `${path} duplicate IDs`);
}
function moduleRecord(value: unknown): void {
  const item = record(value, "module");
  string(item.id, "module.id");
  string(item.name, "module.name");
  choice(item.stat, STAT_NAMES, "module.stat");
  number(item.value, "module.value");
  choice(item.quality, QUALITY_ORDER, "module.quality");
  if (item.additionalModifiers !== undefined) {
    const seen = new Set([item.stat]);
    for (const value of list(
      item.additionalModifiers,
      "module.additionalModifiers",
    )) {
      const modifier = record(value, "modifier");
      choice(modifier.stat, STAT_NAMES, "modifier.stat");
      number(modifier.value, "modifier.value");
      ensure(
        (modifier.value as number) > 0 && !seen.has(modifier.stat),
        "modifier gain/stat",
      );
      seen.add(modifier.stat);
    }
  }
}
function question(value: unknown): void {
  const item = record(value, "question");
  for (const key of ["id", "prompt", "spoken", "hint", "explanation"])
    string(item[key], `question.${key}`);
  const answer = list(item.answer, "question.answer");
  ensure(answer.length === 2, "question.answer");
  integer(answer[0], "question numerator", -Number.MAX_SAFE_INTEGER);
  integer(answer[1], "question denominator", 1);
  if (item.visualCount !== undefined)
    integer(item.visualCount, "question.visualCount", 1, 1000);
}
function combat(value: unknown, run: RecordValue): void {
  const state = record(value, "combat");
  if (state.simulationTick !== undefined)
    integer(state.simulationTick, "combat.simulationTick");
  choice(state.version, [1, 2], "combat.version");
  ensure(state.wave === run.wave, "combat.wave");
  number(state.hp, "combat.hp", 0, run.maxHp as number);
  for (const key of [
    "salvage",
    "medkits",
    "spawned",
    "spawnTotal",
    "nextEnemyId",
    "rngState",
  ])
    integer(state[key], `combat.${key}`);
  ensure(
    (state.spawned as number) <= (state.spawnTotal as number),
    "combat spawn counts",
  );
  for (const key of ["spawnCooldownMs", "shotCooldownMs"])
    number(state[key], `combat.${key}`);
  const marine = record(state.marine, "combat.marine");
  number(marine.x, "marine.x", -Infinity);
  number(marine.y, "marine.y", -Infinity);
  const enemies = list(state.enemies, "combat.enemies");
  const enemyIds = new Set<unknown>();
  for (const value of enemies) {
    const enemy = record(value, "enemy");
    integer(enemy.id, "enemy.id", 1);
    ensure(!enemyIds.has(enemy.id), "duplicate enemy ID");
    enemyIds.add(enemy.id);
    ensure(
      (enemy.id as number) < (state.nextEnemyId as number),
      "next enemy ID",
    );
    for (const key of ["x", "y", "hp"])
      number(enemy[key], `enemy.${key}`, -Infinity);
    for (const key of [
      "maxHp",
      "speed",
      "radius",
      "slowRemainingMs",
      "slowAmount",
    ])
      number(enemy[key], `enemy.${key}`);
    for (const key of state.version === 1
      ? ["burnRemainingMs", "burnDps"]
      : ["burnRemainingDamage", "burnRate"])
      number(enemy[key], `enemy.${key}`);
    boolean(enemy.boss, "enemy.boss");
  }
  if (state.pickups !== undefined) {
    const ids = new Set<unknown>();
    for (const value of list(state.pickups, "combat.pickups")) {
      const pickup = record(value, "pickup");
      integer(pickup.id, "pickup.id", 1);
      ensure(
        !ids.has(pickup.id) &&
          !enemyIds.has(pickup.id) &&
          (pickup.id as number) < (state.nextEnemyId as number),
        "pickup ID",
      );
      ids.add(pickup.id);
      number(pickup.x, "pickup.x");
      number(pickup.y, "pickup.y");
      integer(pickup.value, "pickup.value", 1);
      if (pickup.ammo !== undefined) {
        const ammo = ammoRecord(pickup.ammo);
        ensure(!ammo.legendary, "legendary drop");
        ensure(ammo.id === `drop-${state.wave}-${pickup.id}`, "ammo drop ID");
      }
    }
  }
  if (state.ammoInventory !== undefined) {
    inventoryRecord(state.ammoInventory);
    const inventory = record(state.ammoInventory, "combat inventory");
    for (const key of ["ammo", "activeAmmoIds", "ammoCapacity"])
      ensure(
        JSON.stringify(inventory[key]) === JSON.stringify(run[key]),
        "combat inventory checkpoint mismatch",
      );
    ensure(
      JSON.stringify(inventory.ammoBag ?? []) ===
        JSON.stringify(run.ammoBag ?? []),
      "combat bag checkpoint mismatch",
    );
    for (const value of list(state.pickups ?? [], "pickups")) {
      const pickup = record(value, "pickup");
      if (pickup.ammo)
        ensure(
          !list(inventory.ammo, "inventory").some(
            (a) => ammoRecord(a).id === ammoRecord(pickup.ammo).id,
          ),
          "already collected ammo drop",
        );
    }
  }
  const shots = new Set<unknown>();
  const boltIds = new Set<unknown>();
  if (state.version === 2) {
    integer(state.nextShotId, "combat.nextShotId", 1);
    integer(state.nextBoltId, "combat.nextBoltId", 1);
    number(state.stepRemainderMs, "combat.stepRemainderMs");
    for (const value of list(state.shots, "combat.shots")) {
      const shot = record(value, "shot");
      integer(shot.id, "shot.id", 1);
      ensure(!shots.has(shot.id) && shot.id < state.nextShotId, "shot ID");
      shots.add(shot.id);
      number(shot.baseDamage, "shot.baseDamage");
      number(shot.burnFunds, "shot.burnFunds");
      integer(shot.chainRemaining, "shot.chainRemaining");
      boolean(shot.chainStarted, "shot.chainStarted");
      for (const key of ["frost", "fiery"])
        integer(shot[key], `shot.${key}`, 0, 4);
      for (const id of list(shot.chainVisited, "shot.chainVisited"))
        integer(id, "shot visited ID", 1);
    }
  }
  for (const value of list(state.bolts, "combat.bolts")) {
    const bolt = record(value, "bolt");
    for (const key of ["x", "y", "vx", "vy"])
      number(bolt[key], `bolt.${key}`, -Infinity);
    number(bolt.damage, "bolt.damage");
    integer(bolt.pierce, "bolt.pierce", 0, 4);
    if (state.version === 1)
      for (const key of ["chain", "frost", "fiery"])
        integer(bolt[key], `bolt.${key}`, 0, 4);
    else {
      integer(bolt.id, "bolt.id", 1);
      integer(bolt.shotId, "bolt.shotId", 1);
      ensure(
        !boltIds.has(bolt.id) && bolt.id < (state.nextBoltId as number),
        "bolt ID",
      );
      boltIds.add(bolt.id);
      ensure(shots.has(bolt.shotId), "bolt shot reference");
    }
    for (const id of list(bolt.hitIds, "bolt.hitIds"))
      integer(id, "bolt hit ID", 1);
  }
}

/** Parse into a fresh value; legacy migrations never mutate a caller's candidate. */
export function decodeProfiles(raw: string): Profile[] {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (cause) {
    throw new ProfileStorageError(
      "Saved profiles contain invalid JSON. Your saved data has not been replaced.",
      { cause },
    );
  }
  const profiles = list(value, "profiles");
  uniqueIds(profiles, "profiles");
  for (const value of profiles) {
    const profile = record(value, "profile");
    string(profile.name, "profile.name");
    choice(profile.grade, GRADES, "profile.grade");
    choice(profile.handedness, ["left", "right"], "profile.handedness");
    integer(profile.victories, "profile.victories");
    const history = list(profile.history, "profile.history");
    for (const [index, value] of history.entries()) {
      const entry = record(value, "history entry");
      string(entry.question, "history.question");
      choice(entry.grade, GRADES, "history.grade");
      boolean(entry.correctInitially, "history.correctInitially");
      boolean(entry.corrected, "history.corrected");
      number(entry.at, "history.at");
      if (entry.correctionAttempts !== undefined) {
        const corrections = list(
          entry.correctionAttempts,
          "history.correctionAttempts",
        );
        uniqueIds(corrections, "correctionAttempts");
        for (const value of corrections) {
          const correction = record(value, "correction");
          string(correction.input, "correction.input");
          boolean(correction.correct, "correction.correct");
          number(correction.at, "correction.at");
        }
      }
      if (entry.occurrenceId === undefined)
        entry.occurrenceId = `legacy:${profile.id}:${index}`;
      string(entry.occurrenceId, "history.occurrenceId");
    }
    if (profile.activeRun === undefined) continue;
    const run = record(profile.activeRun, "run");
    if (run.interactionRevision !== undefined)
      integer(run.interactionRevision, "run.interactionRevision");
    string(run.id, "run.id");
    choice(run.grade, GRADES, "run.grade");
    choice(run.difficulty, ["easy", "standard"], "run.difficulty");
    choice(
      run.phase,
      ["combat", "quiz", "reward", "correction", "cache", "shop"],
      "run.phase",
    );
    integer(run.totalWaves, "run.totalWaves", 1);
    integer(run.wave, "run.wave", 1, run.totalWaves);
    number(run.maxHp, "run.maxHp", 1);
    number(run.hp, "run.hp", 0, run.maxHp);
    integer(run.salvage, "run.salvage");
    integer(run.medkits, "run.medkits");
    integer(run.ammoCapacity, "run.ammoCapacity", 1, 4);
    boolean(run.cacheClaimed, "run.cacheClaimed");
    if (run.forgedOmni !== undefined) boolean(run.forgedOmni, "forged flag");
    for (const id of list(run.shopBought, "run.shopBought"))
      string(id, "shop offer ID");
    if (run.shop !== undefined) {
      const shop = record(run.shop, "shop");
      integer(shop.round, "shop.round");
      integer(shop.paidRerolls, "shop.paidRerolls");
      const offers = list(shop.offers, "shop.offers");
      ensure(offers.length === 4, "shop offer count");
      uniqueIds(offers, "shop.offers");
      for (const value of offers) {
        const offer = record(value, "shop offer");
        choice(
          offer.kind,
          ["module", "medkit", "expand", "ammo", "repair"],
          "shop kind",
        );
        string(offer.title, "shop title");
        integer(offer.price, "shop price", 1);
        if (offer.kind === "module") moduleRecord(offer.module);
        else ensure(offer.module === undefined, "unexpected shop module");
        if (offer.kind !== "ammo")
          ensure(offer.ammoType === undefined, "unexpected shop ammo");
        if (offer.kind === "ammo") {
          choice(offer.ammoType, AMMO_TYPES, "shop ammo type");
          if (offer.ammoTier !== undefined)
            integer(offer.ammoTier, "shop ammo tier", 1, 4);
        } else
          ensure(offer.ammoTier === undefined, "unexpected shop ammo tier");
      }
      const purchased = list(run.shopBought, "shopBought");
      ensure(
        new Set(purchased).size === purchased.length && purchased.length < 4,
        "shop purchased slots",
      );
      for (const id of purchased)
        ensure(
          offers.some((o) => record(o, "offer").id === id),
          "purchased offer reference",
        );
    }
    if (run.choiceCache !== undefined) {
      const cache = record(run.choiceCache, "choice cache");
      choice(cache.kind, ["choice"], "cache kind");
      string(cache.id, "cache ID");
      const options = list(cache.options, "cache options");
      ensure(options.length === 6, "cache option count");
      uniqueIds(options, "cache options");
      const types = new Set();
      const contents: unknown[] = [];
      let modules = 0;
      for (const value of options) {
        const option = record(value, "cache option");
        integer(option.sellPrice, "cache sell price");
        choice(option.kind, ["ammo", "module"], "cache option kind");
        if (option.kind === "module") {
          ensure(option.ammo === undefined, "unexpected cache ammo");
          moduleRecord(option.module);
          modules++;
        } else {
          ensure(option.module === undefined, "unexpected cache module");
          const pair = list(option.ammo, "cache pair");
          ensure(pair.length === 2, "cache pair size");
          const type = record(pair[0], "cache ammo").type;
          ensure(!types.has(type), "duplicate cache type");
          types.add(type);
          for (const value of pair) {
            const item = record(value, "cache ammo");
            choice(item.type, AMMO_TYPES, "cache ammo type");
            ensure(
              item.type === type && item.tier === 3 && !item.legendary,
              "cache blue pair",
            );
            contents.push(item);
          }
        }
      }
      uniqueIds(contents, "cache cartridge IDs");
      ensure(modules === 1, "cache module count");
      if (cache.selectedOptionId !== undefined) {
        ensure(
          options.some(
            (o) => record(o, "option").id === cache.selectedOptionId,
          ),
          "cache selection",
        );
        choice(cache.disposition, ["accept", "sell"], "cache disposition");
        ensure(
          run.cacheClaimed && run.phase === "shop",
          "cache settlement phase",
        );
      } else {
        ensure(
          cache.disposition === undefined &&
            !run.cacheClaimed &&
            run.phase === "cache",
          "pending cache phase",
        );
      }
    }
    inventoryRecord(run);
    const modules = list(run.modules, "run.modules");
    uniqueIds(modules, "modules");
    modules.forEach(moduleRecord);
    if (run.combatSave !== undefined) combat(run.combatSave, run);
    if (["quiz", "reward", "correction"].includes(run.phase as string))
      ensure(run.quiz !== undefined, "missing quiz");
    if (run.quiz === undefined) continue;
    const quiz = record(run.quiz, "quiz");
    const questions = list(quiz.questions, "quiz.questions");
    ensure(questions.length === 5, "five questions");
    questions.forEach(question);
    integer(quiz.index, "quiz.index", 0, 5);
    number(quiz.elapsedMs, "quiz.elapsedMs");
    number(quiz.remainingMs, "quiz.remainingMs", 0, 30000);
    integer(quiz.correctionIndex, "quiz.correctionIndex", 0, 5);
    for (const key of ["draft", "correctionDraft"])
      if (quiz[key] !== undefined) string(quiz[key], `quiz.${key}`);
    const attempts = list(quiz.attempts, "quiz.attempts");
    ensure(attempts.length === quiz.index, "quiz attempt count");
    for (const value of attempts) {
      const attempt = record(value, "attempt");
      question(attempt.question);
      string(attempt.input, "attempt.input");
      boolean(attempt.correct, "attempt.correct");
      boolean(attempt.corrected, "attempt.corrected");
    }
    if (run.phase === "quiz") ensure(quiz.index < 5, "quiz initial index");
    if (quiz.rewardQuality !== undefined)
      choice(quiz.rewardQuality, QUALITY_ORDER, "quiz.rewardQuality");
    if (quiz.rewardChoices !== undefined) {
      const rewards = list(quiz.rewardChoices, "rewards");
      ensure(rewards.length === 3, "three rewards");
      uniqueIds(rewards, "rewards");
      rewards.forEach(moduleRecord);
    }
    if (["reward", "correction", "cache", "shop"].includes(run.phase as string))
      ensure(
        quiz.index === 5 &&
          quiz.rewardQuality !== undefined &&
          quiz.rewardChoices !== undefined,
        "settled quiz",
      );
    if (quiz.selectedReward !== undefined) {
      string(quiz.selectedReward, "quiz.selectedReward");
      ensure(
        list(quiz.rewardChoices, "rewards").some(
          (item) => record(item, "reward").id === quiz.selectedReward,
        ),
        "selected reward ownership",
      );
      // Legacy settlement appended all five entries together, in initial question order.
      if (history.length >= 5)
        for (let index = 0; index < 5; index++) {
          const entry = record(history[history.length - 5 + index], "history");
          if ((entry.occurrenceId as string).startsWith("legacy:"))
            entry.occurrenceId = `${run.id}:${run.wave}:${index}`;
        }
    }
    if (run.phase === "correction")
      ensure(quiz.selectedReward !== undefined, "correction before reward");
    for (const [index, value] of attempts.entries()) {
      const attempt = record(value, "attempt");
      const occurrenceId = `${run.id}:${run.wave}:${index}`;
      record(attempt.question, "question").id = occurrenceId;
      if (
        !history.some(
          (value) => record(value, "history").occurrenceId === occurrenceId,
        )
      ) {
        history.push({
          occurrenceId,
          question: record(attempt.question, "question").prompt,
          grade: run.grade,
          correctInitially: attempt.correct,
          corrected: attempt.corrected,
          at: 0,
        });
      }
    }
    for (const [index, value] of questions.entries())
      record(value, "question").id = `${run.id}:${run.wave}:${index}`;
  }
  return profiles as unknown as Profile[];
}

export class ProfileRepository {
  constructor(
    private readonly storage: ProfileStorage,
    private readonly key = "math-on-mars-profiles-v1",
  ) {}

  load(): Profile[] {
    try {
      const raw = this.storage.getItem(this.key);
      return raw === null ? [] : decodeProfiles(raw);
    } catch (cause) {
      if (cause instanceof ProfileStorageError) throw cause;
      throw new ProfileStorageError(
        "Cannot read local profiles. Retry when storage is available.",
        { cause },
      );
    }
  }

  commit(profiles: Profile[]): void {
    const candidate = JSON.stringify(decodeProfiles(JSON.stringify(profiles)));
    try {
      const previous = this.storage.getItem(this.key);
      if (previous !== null) {
        // A corrupt primary must never overwrite the last valid backup.
        const validatedPrevious = JSON.stringify(decodeProfiles(previous));
        this.storage.setItem(`${this.key}-backup`, validatedPrevious);
      }
      this.storage.setItem(this.key, candidate);
    } catch (cause) {
      throw new ProfileStorageError(
        "Could not save profiles. Progress is paused; retry saving before continuing.",
        { cause },
      );
    }
  }

  /** Explicit recovery only: the UI must explain that a previous checkpoint is restored. */
  recoverBackup(): Profile[] {
    try {
      const raw = this.storage.getItem(`${this.key}-backup`);
      if (raw === null)
        throw new ProfileStorageError("No valid backup is available.");
      const profiles = decodeProfiles(raw);
      this.storage.setItem(this.key, JSON.stringify(profiles));
      return profiles;
    } catch (cause) {
      throw new ProfileStorageError("Could not restore the profile backup.", {
        cause,
      });
    }
  }
}
