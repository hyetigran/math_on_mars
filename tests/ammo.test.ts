import { withAmmoPair } from "./ammo-fixture";
import { CombatSimulation } from "../src/combat-rules";
import test from "node:test";
import assert from "node:assert/strict";
import { RunSession } from "../src/session";
import { ProfileRepository } from "../src/persistence";

function setup() {
  const data = new Map<string, string>();
  let failed = false;
  const repository = new ProfileRepository({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      if (failed) throw new Error("quota");
      data.set(key, value);
    },
  });
  const session = new RunSession([], repository);
  const id = session.createProfile("Collector");
  session.start(id, "3");
  return {
    session,
    id,
    repository,
    fail: (value: boolean) => {
      failed = value;
    },
  };
}
function clear(session: RunSession, id: string) {
  session.finishWave(id, { hp: 100, salvage: 100, medkits: 1 });
  for (let i = 0; i < 5; i++) {
    const q = session.profile(id).activeRun!.quiz!.questions[i];
    session.submit(id, q.id, `${q.answer[0]}/${q.answer[1]}`, 5000);
  }
  session.chooseReward(
    id,
    session.profile(id).activeRun!.quiz!.rewardChoices![0].id,
  );
}

test("waves enter the shop without supply bonuses or free ammo", () => {
  let { session, id, repository } = setup();
  const startingAmmo = session.profile(id).activeRun!.ammo;
  for (let wave = 1; wave <= 9; wave++) {
    clear(session, id);
    const run = session.profile(id).activeRun!;
    assert.equal(run.choiceCache, undefined);
    assert.deepEqual(run.ammo, startingAmmo);
    assert.equal(run.phase, "shop");
    session.nextWave(id);
    assert.equal(session.profile(id).activeRun!.phase, "combat");
  }
});

test("batch merge preserves equipment and rejects a stale preview; equipped ammo cannot be sold", () => {
  let { session, id, repository } = setup();
  clear(session, id);
  session = withAmmoPair(session, id, "Multi Shot", repository);
  const pair = session
    .profile(id)
    .activeRun!.ammo.filter((a) => a.type === "Multi Shot");
  session.toggleAmmo(id, pair[0].id);
  const preview = session.previewMerges(id);
  assert.equal(preview.pairs.length, 1);
  assert.deepEqual(
    preview.pairs[0],
    pair.map((a) => a.id),
  );
  session.mergePreview(id, preview);
  const merged = session.profile(id).activeRun!;
  const purple = merged.ammo.find((a) => a.type === "Multi Shot")!;
  assert.equal(purple.tier, 4);
  assert.deepEqual(merged.activeAmmoIds, [purple.id]);
  session.mergePreview(id, preview);
  assert.deepEqual(session.profile(id).activeRun, merged);
  session.sellAmmo(id, purple.id);
  assert.deepEqual(session.profile(id).activeRun, merged);
  session.toggleAmmo(id, purple.id);
  session.sellAmmo(id, purple.id);
  const sold = session.profile(id).activeRun!;
  assert.equal(sold.salvage, merged.salvage + 16);
  assert.equal(
    sold.ammo.some((a) => a.id === purple.id),
    false,
  );
  session.sellAmmo(id, purple.id);
  assert.deepEqual(
    repository.load(),
    JSON.parse(JSON.stringify(session.profiles)),
  );
  assert.equal(session.profile(id).activeRun!.salvage, sold.salvage);
});

test("ammo shop purchases preserve their tier and never displace a full loadout", () => {
  let { session, id, repository } = setup();
  clear(session, id);
  session = withAmmoPair(session, id, "Piercing", repository);
  const initial = session.profile(id).activeRun!;
  const offer = initial.shop!.offers.find((o) => o.kind === "ammo")!;
  session.buy(id, offer.id);
  const purchased = session.profile(id).activeRun!;
  assert.equal(purchased.ammo.length, initial.ammo.length + 1);
  assert.equal(purchased.ammo.at(-1)!.type, offer.ammoType);
  assert.equal(purchased.ammo.at(-1)!.tier, offer.ammoTier);
  assert.deepEqual(purchased.activeAmmoIds, initial.activeAmmoIds);
  session.buy(id, offer.id);
  assert.deepEqual(session.profile(id).activeRun, purchased);
  assert.deepEqual(
    repository.load(),
    JSON.parse(JSON.stringify(session.profiles)),
  );
});

test("three Expanders stop at capacity four and stale offers never charge for a fifth", () => {
  let { session, id, repository } = setup();
  clear(session, id);
  const oldOffers: string[] = [];
  for (let capacity = 1; capacity < 4; capacity++) {
    const run = session.profile(id).activeRun!;
    const offer = run.shop!.offers.find((o) => o.kind === "expand")!;
    oldOffers.push(offer.id);
    session.buy(id, offer.id);
    assert.equal(session.profile(id).activeRun!.ammoCapacity, capacity + 1);
    if (capacity < 3) {
      for (const item of run.shop!.offers) session.buy(id, item.id);
      // Fund the next intermission through the same public wave-clear path.
      session.nextWave(id);
      clear(session, id);
    }
  }
  const before = session.profile(id).activeRun!;
  for (const idOfOffer of oldOffers) session.buy(id, idOfOffer);
  assert.equal(session.profile(id).activeRun!.salvage, before.salvage);
  assert.equal(session.profile(id).activeRun!.ammoCapacity, 4);
  assert.deepEqual(
    repository.load(),
    JSON.parse(JSON.stringify(session.profiles)),
  );
});

test("combat inventory and remaining bag commit together and resume without duplication", () => {
  const { session, id, repository, fail } = setup();
  const run = session.profile(id).activeRun!;
  const simulation = new CombatSimulation({ ...run, seed: 42 });
  const state = simulation.serialize();
  const cartridge = {
    id: "drop-1-4",
    type: "Multi Shot" as const,
    tier: 2 as const,
  };
  state.ammoInventory!.ammo.push(cartridge);
  state.ammoInventory!.ammoBag = ["Frost", "Fiery"];
  fail(true);
  assert.throws(() => session.checkpoint(id, { runId: run.id, combat: state }));
  assert.deepEqual(session.profile(id).activeRun, run);
  fail(false);
  session.checkpoint(id, { runId: run.id, combat: state });
  const restored = new RunSession(repository.load(), repository);
  const saved = restored.profile(id).activeRun!;
  assert.deepEqual(saved.ammo.at(-1), cartridge);
  assert.deepEqual(saved.ammoBag, ["Frost", "Fiery"]);
  const resumed = new CombatSimulation({
    ...saved,
    restore: saved.combatSave,
    seed: 999,
  });
  restored.finishWave(id, resumed.snapshot());
  assert.equal(
    restored.profile(id).activeRun!.ammo.filter((a) => a.id === cartridge.id)
      .length,
    1,
  );
  assert.deepEqual(
    repository.load(),
    JSON.parse(JSON.stringify(restored.profiles)),
  );
});

test("a selected batch merges only chosen pairs and leaves other cartridges available", () => {
  let { session, id, repository } = setup();
  for (let wave = 1; wave <= 3; wave++) {
    clear(session, id);
    if (wave === 1)
      session = withAmmoPair(session, id, "Multi Shot", repository);
    if (wave === 3) session = withAmmoPair(session, id, "Frost", repository);
    if (wave < 3) session.nextWave(id);
  }
  const preview = session.previewMerges(id);
  assert.equal(preview.pairs.length, 2);
  const retained = preview.pairs[1];
  session.mergePreview(id, { ...preview, pairs: [preview.pairs[0]] });
  const run = session.profile(id).activeRun!;
  assert.ok(retained.every((id) => run.ammo.some((a) => a.id === id)));
  assert.equal(run.ammo.filter((a) => a.tier === 4).length, 1);
});

test("forge selection is atomic, preserves overflow and duplicates, and cannot repeat after resume", () => {
  const { session, id, repository, fail } = setup();
  const profiles = session.profiles;
  const run = profiles[0].activeRun!;
  run.phase = "shop";
  const types = [
    "Piercing",
    "Multi Shot",
    "Electric Chain",
    "Frost",
    "Fiery",
  ] as const;
  run.ammo.push(
    ...types.map((type, index) => ({
      id: `purple-${index}`,
      type,
      tier: 4 as const,
    })),
  );
  run.ammo.push({ id: "spare", type: "Frost", tier: 4 });
  const originalActive = [...run.activeAmmoIds];
  const selected = {
    runId: run.id,
    revision: run.interactionRevision ?? 0,
    ingredientIds: types.map((_, index) => `purple-${index}`),
  };
  const forgeSession = new RunSession(profiles, repository);
  fail(true);
  assert.throws(() => forgeSession.forge(id, selected));
  assert.deepEqual(forgeSession.profiles, profiles);
  fail(false);
  forgeSession.forge(id, {
    ...selected,
    ingredientIds: selected.ingredientIds.slice(1),
  });
  assert.deepEqual(forgeSession.profiles, profiles);
  forgeSession.forge(id, {
    ...selected,
    ingredientIds: [originalActive[0], ...selected.ingredientIds.slice(1)],
  });
  assert.deepEqual(forgeSession.profiles, profiles);
  forgeSession.forge(id, {
    ...selected,
    ingredientIds: ["purple-0", "purple-1", "spare", "purple-3", "purple-4"],
  });
  assert.deepEqual(forgeSession.profiles, profiles);
  forgeSession.selectForgeIngredients(
    id,
    [...selected.ingredientIds].reverse(),
  );
  const pending = new RunSession(repository.load(), repository);
  assert.deepEqual(
    pending.profile(id).activeRun!.forgeIngredientIds,
    [...selected.ingredientIds].reverse(),
  );
  const pendingPreview = {
    ...selected,
    revision: pending.profile(id).activeRun!.interactionRevision!,
    ingredientIds: pending.profile(id).activeRun!.forgeIngredientIds!,
  };
  pending.forge(id, pendingPreview);
  const forged = pending.profile(id).activeRun!;
  assert.equal(forged.forgedOmni, true);
  assert.equal(forged.activeAmmoIds.length, 1);
  assert.ok(
    forged.ammo.find((a) => a.id === forged.activeAmmoIds[0])!.legendary,
  );
  assert.ok(forged.ammo.some((a) => a.id === originalActive[0]));
  assert.ok(forged.ammo.some((a) => a.id === "spare"));
  const resumed = new RunSession(repository.load(), repository);
  const before = resumed.profiles;
  resumed.forge(id, selected);
  assert.deepEqual(resumed.profiles, before);
});

test("one-click merge cascades matching pairs to purple and preserves equipped ammo", () => {
  const { session, id } = setup();
  clear(session, id);
  const profiles = session.profiles;
  const run = profiles[0].activeRun!;
  run.ammo = Array.from({ length: 8 }, (_, i) => ({
    id: `merge-${i}`,
    type: "Frost",
    tier: 1,
  }));
  run.activeAmmoIds = ["merge-0"];
  const updated = new RunSession(profiles, { commit() {} });
  assert.equal(updated.mergeAll(id), "Combined 7 matching pairs.");
  const merged = updated.profile(id).activeRun!;
  assert.equal(merged.ammo.length, 1);
  assert.equal(merged.ammo[0].tier, 4);
  assert.deepEqual(merged.activeAmmoIds, [merged.ammo[0].id]);
  assert.equal(updated.mergeAll(id), "No matching ammo to merge.");
});
