import test from "node:test";
import assert from "node:assert/strict";
import {
  shouldVerifyOfflinePack,
  shouldLoadSavedRelease,
} from "../src/offline-policy";

test("portal resumes older saves in local previews instead of reloading splash and camp", () => {
  const old = "0000000000000001";
  const current = "0000000000000002";
  assert.equal(
    shouldLoadSavedRelease(old, current, true, "localhost", ""),
    false,
  );
  for (const host of ["localhost", "127.0.0.1", "[::1]"])
    assert.equal(
      shouldLoadSavedRelease(old, current, false, host, `?build=${old}`),
      false,
    );
});

test("published and explicitly verified games retain release-pinned saved missions", () => {
  const old = "0000000000000001";
  const current = "0000000000000002";
  assert.equal(
    shouldLoadSavedRelease(old, current, false, "game.example", ""),
    true,
  );
  assert.equal(
    shouldLoadSavedRelease(
      old,
      current,
      false,
      "localhost",
      "?verifyOffline=1",
    ),
    true,
  );
  assert.equal(
    shouldLoadSavedRelease(current, current, false, "game.example", ""),
    false,
  );
  assert.equal(
    shouldLoadSavedRelease(undefined, current, false, "game.example", ""),
    false,
  );
});

test("local previews launch without blocking on offline-pack verification", () => {
  assert.equal(shouldVerifyOfflinePack(false, "localhost", ""), false);
  assert.equal(shouldVerifyOfflinePack(false, "127.0.0.1", ""), false);
  assert.equal(shouldVerifyOfflinePack(false, "[::1]", ""), false);
  assert.equal(
    shouldVerifyOfflinePack(false, "localhost", "?verifyOffline=1"),
    true,
  );
  assert.equal(shouldVerifyOfflinePack(false, "game.example", ""), true);
  assert.equal(shouldVerifyOfflinePack(true, "game.example", ""), false);
});
