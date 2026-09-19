import test from "node:test";
import assert from "node:assert/strict";
import { ammoArtKey, moduleArtKey } from "../src/item-art";
import { moduleCandidates } from "../src/modules";
import { AMMO_TYPES } from "../src/types";
import { readFile, access } from "node:fs/promises";

test("all module variants keep their family art regardless of primary stat", () => {
  const familyArt = new Set<string>();
  for (let seed = 0; seed < 40; seed++)
    for (const module of moduleCandidates("purple", seed, [])) {
      familyArt.add(moduleArtKey(module.name));
      const family = module.name.split(" ").at(-1)!;
      assert.equal(moduleArtKey(module.name), moduleArtKey(`Other ${family}`));
      assert.notEqual(moduleArtKey(module.name), undefined);
    }
  assert.equal(familyArt.size, 6);
  assert.equal(moduleArtKey("Ballistic Overclock"), "trinket_overclock_chip");
  assert.equal(moduleArtKey("Recovery Shield"), "trinket_shield_capacitor");
  assert.equal(new Set(AMMO_TYPES.map((type) => ammoArtKey(type))).size, 5);
  for (const type of AMMO_TYPES)
    assert.equal(ammoArtKey(type, true), "ammo_legendary_omni");
});

test("every approved runtime export has a source master and an existing runtime file", async () => {
  const manifest = JSON.parse(
    await readFile("src/assets/runtime-manifest.json", "utf8"),
  );
  assert.equal(manifest.length, 32);
  for (const asset of manifest) {
    await access(`src/assets/${asset.source}`);
    await access(`src/assets/${asset.runtime}`);
    assert.ok(asset.width > 0 && asset.height > 0);
  }
});
