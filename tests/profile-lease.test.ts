import test from "node:test";
import assert from "node:assert/strict";
import { ProfileLease } from "../src/profile-lease";

test("only one tab owns a profile; independent profiles proceed and release permits another owner", async () => {
  const held = new Set<string>();
  const manager = {
    async request(
      name: string,
      _options: unknown,
      callback: (lock: object | null) => Promise<void>,
    ) {
      if (held.has(name)) return callback(null);
      held.add(name);
      try {
        await callback({});
      } finally {
        held.delete(name);
      }
    },
  };
  const first = new ProfileLease(manager),
    second = new ProfileLease(manager),
    third = new ProfileLease(manager);
  assert.equal(await first.acquire("a"), true);
  assert.equal(await second.acquire("a"), false);
  assert.equal(await third.acquire("b"), true);
  first.release();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(await second.acquire("a"), true);
  second.release();
  third.release();
});

test("leaving a screen before lock acquisition cannot retain a late lease", async () => {
  let allow: (() => void) | undefined;
  const manager = {
    async request(
      _name: string,
      _options: unknown,
      callback: (lock: object | null) => Promise<void>,
    ) {
      await new Promise<void>((resolve) => {
        allow = resolve;
      });
      await callback({});
    },
  };
  const lease = new ProfileLease(manager);
  const pending = lease.acquire("a");
  lease.release();
  allow!();
  assert.equal(await pending, false);
  assert.equal(await new ProfileLease().acquire("a"), true);
});
