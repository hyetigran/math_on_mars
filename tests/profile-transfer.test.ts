import test from "node:test";
import assert from "node:assert/strict";
import { exportProfile, readProfileTransfer } from "../src/profile-transfer";
import { RunSession } from "../src/session";

function sample() {
  const session = new RunSession([], { commit: () => {} });
  const id = session.createProfile("Cadet");
  session.start(id, "3");
  session.finishWave(id, { hp: 90, salvage: 8, medkits: 1 });
  const question = session.profile(id).activeRun!.quiz!.questions[0];
  session.submit(id, question.id, "99999", 1000);
  return { session, profile: session.profile(id) };
}

test("selected profile export preserves history and active quiz; collision requires explicit replacement", () => {
  const { session, profile } = sample();
  const incoming = readProfileTransfer(exportProfile(profile));
  assert.equal(incoming.historyOnly, false);
  assert.deepEqual(incoming.profile, JSON.parse(JSON.stringify(profile)));
  incoming.profile.name = "Imported";
  const before = session.profiles;
  assert.throws(
    () => session.importProfile(incoming.profile, "add"),
    /replace/,
  );
  assert.deepEqual(session.profiles, before);
  session.importProfile(incoming.profile, "replace");
  assert.equal(session.profile(profile.id).name, "Imported");
  const other = { ...incoming.profile, id: "other" };
  session.importProfile(other, "add");
  assert.equal(session.profiles.length, 2);
});

test("invalid active missions may retain validated history, but malformed history and unknown transfer versions are rejected", () => {
  const { profile } = sample();
  const transfer = JSON.parse(exportProfile(profile));
  transfer.profile.activeRun.totalWaves = 0;
  const incoming = readProfileTransfer(JSON.stringify(transfer));
  assert.equal(incoming.historyOnly, true);
  assert.equal(incoming.profile.activeRun, undefined);
  assert.deepEqual(incoming.profile.history, profile.history);
  transfer.profile.history[0].correctInitially = "invented";
  assert.throws(() => readProfileTransfer(JSON.stringify(transfer)));
  assert.throws(
    () => readProfileTransfer(JSON.stringify({ ...transfer, version: 99 })),
    /supported/,
  );
});

test("profile transfer retains pinned release versions; legacy migration only adds a version", () => {
  const { session, profile } = sample();
  assert.match(profile.activeRun!.releaseVersion!, /^[a-f0-9]{16}$/);
  const incoming = readProfileTransfer(exportProfile(profile));
  assert.equal(
    incoming.profile.activeRun!.releaseVersion,
    profile.activeRun!.releaseVersion,
  );
  delete incoming.profile.activeRun!.releaseVersion;
  session.importProfile(incoming.profile, "replace");
  session.pinLegacyRelease(profile.id);
  assert.deepEqual(
    session.profile(profile.id),
    JSON.parse(JSON.stringify(profile)),
  );
});
