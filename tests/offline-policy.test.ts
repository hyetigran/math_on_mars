import test from "node:test";
import assert from "node:assert/strict";
import { shouldVerifyOfflinePack } from "../src/offline-policy";

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
