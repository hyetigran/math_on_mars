import test from "node:test";
import assert from "node:assert/strict";
import { bonusSalvage, chestDropChance, luckyShopTier } from "../src/luck";
import { matchingMergePair } from "../src/ammo-drag";
import { RunSession } from "../src/session";
import { createShop } from "../src/shop";
import { moduleCandidates, moduleTotal } from "../src/modules";
import { QUALITY_ORDER, type Ammo } from "../src/types";

test("Luck improves bounded chest, salvage, and shop odds without exceeding purple", () => {
  assert.equal(chestDropChance(0), 0.08);
  assert.equal(chestDropChance(0.5), 0.12);
  assert.equal(chestDropChance(1), 0.16);
  assert.equal(chestDropChance(100), 0.16);
  assert.equal(bonusSalvage(0, 0), 0);
  assert.equal(bonusSalvage(1, 0.49), 1);
  assert.equal(bonusSalvage(1, 0.5), 0);
  assert.equal(luckyShopTier(2, 0, 0), 2);
  assert.equal(luckyShopTier(2, 1, 0.49), 3);
  assert.equal(luckyShopTier(4, 1, 0), 4);
});

test("Luck upgrades are obtainable and improve actual shop offers at their matching prices", () => {
  const lucky = moduleCandidates("purple", 1, []).find(
    (m) => m.stat === "luck",
  )!;
  assert.ok(lucky);
  assert.equal(moduleTotal([lucky], "luck"), 0.1);
  const session = new RunSession([], { commit() {} });
  const id = session.createProfile("Luck test");
  session.start(id, "3");
  const base = session.profile(id).activeRun!;
  base.ammoCapacity = 4;
  let improvedAmmo = 0,
    improvedModules = 0;
  for (let i = 0; i < 100; i++) {
    const normal = structuredClone(base),
      boosted = structuredClone(base);
    normal.id = boosted.id = `luck-${i}`;
    boosted.modules = [{ ...lucky, value: 1, additionalModifiers: [] }];
    createShop(normal);
    createShop(boosted);
    for (let slot = 0; slot < 4; slot++) {
      const before = normal.shop!.offers[slot],
        after = boosted.shop!.offers[slot];
      if (before.kind === "ammo" && after.kind === "ammo") {
        assert.ok(after.ammoTier! >= before.ammoTier!);
        if (after.ammoTier! > before.ammoTier!) {
          improvedAmmo++;
          assert.ok(after.price > before.price);
        }
      }
      if (before.kind === "module" && after.kind === "module") {
        const oldTier = QUALITY_ORDER.indexOf(before.module.quality),
          newTier = QUALITY_ORDER.indexOf(after.module.quality);
        assert.ok(newTier >= oldTier);
        if (newTier > oldTier) {
          improvedModules++;
          assert.ok(after.price > before.price);
        }
      }
    }
  }
  assert.ok(improvedAmmo > 20);
  assert.ok(improvedModules > 20);
});

test("drag merges require matching ammo and rarity; duplicate stacks can merge within themselves", () => {
  const ammo: Ammo[] = [
    { id: "a", type: "Frost", tier: 1 },
    { id: "b", type: "Frost", tier: 1 },
    { id: "c", type: "Fiery", tier: 1 },
    { id: "d", type: "Frost", tier: 2 },
    { id: "e", type: "Frost", tier: 4 },
    { id: "f", type: "Frost", tier: 4 },
  ];
  assert.deepEqual(matchingMergePair(ammo, "a", "b"), ["a", "b"]);
  assert.deepEqual(matchingMergePair(ammo, "a", "a"), ["a", "b"]);
  for (const target of ["c", "d", "missing"])
    assert.equal(matchingMergePair(ammo, "a", target), null);
  assert.equal(matchingMergePair(ammo, "e", "f"), null);
  assert.equal(matchingMergePair(ammo, "c", "c"), null);
});
