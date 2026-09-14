import test from "node:test";
import assert from "node:assert/strict";
import { rewardModules, modifiers, moduleTotal } from "../src/modules";
import type { Module } from "../src/types";

test("authored rarity modifiers have exact gains and old single-stat rewards retain their value", () => {
  const white = rewardModules("white", 0, [])[0];
  const green = rewardModules("green", 0, [])[0];
  const blue = rewardModules("blue", 0, [])[0];
  const purple = rewardModules("purple", 0, [])[0];
  assert.deepEqual(modifiers(white), [{ stat: "attackSpeed", value: 0.03 }]);
  assert.deepEqual(modifiers(green), [{ stat: "attackSpeed", value: 0.06 }]);
  assert.deepEqual(modifiers(blue), [
    { stat: "attackSpeed", value: 0.06 },
    { stat: "damage", value: 0.06 },
  ]);
  assert.deepEqual(modifiers(purple), [
    { stat: "attackSpeed", value: 0.06 },
    { stat: "damage", value: 0.06 },
    { stat: "projectileSpeed", value: 0.08 },
  ]);
  assert.equal(
    moduleTotal(
      [
        {
          id: "legacy",
          name: "Old",
          stat: "damage",
          value: 0.136,
          quality: "purple",
        },
      ],
      "damage",
    ),
    0.136,
  );
});

test("offers clip to remaining cap and exclude any zero-gain modifier", () => {
  const owned: Module[] = [
    {
      id: "damage",
      name: "Old",
      stat: "damage",
      value: 0.59,
      quality: "purple",
    },
  ];
  const choices = rewardModules("purple", 0, owned);
  const rapid = choices.find((m) => m.name === "Rapid Overclock")!;
  assert.ok(Math.abs(modifiers(rapid)[1].value - 0.01) < 1e-10);
  assert.equal(moduleTotal([...owned, rapid], "damage"), 0.6);
  const capped = rewardModules("purple", 0, [...owned, rapid]);
  assert.ok(
    capped.every((m) => modifiers(m).every((g) => g.stat !== "damage")),
  );
});

test("all nine-purple reward choice paths retain three useful priorities with armor caches", () => {
  function walk(owned: Module[], wave: number): void {
    if (wave === 10) return;
    const choices = rewardModules("purple", wave, owned);
    assert.equal(new Set(choices.map((m) => m.name)).size, 3);
    assert.ok(new Set(choices.map((m) => m.stat)).size >= 2);
    for (const choice of choices) {
      assert.ok(modifiers(choice).every((g) => g.value > 0));
      const cache: Module = {
        id: `cache-${wave}`,
        name: "Field Plating",
        stat: "armor",
        value: 2,
        quality: "green",
      };
      walk([...owned, choice, cache], wave + 1);
    }
  }
  walk([], 1);
});
