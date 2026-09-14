import test from "node:test";
import assert from "node:assert/strict";
import { RunSession } from "../src/session";
import { ProfileRepository } from "../src/persistence";
import { moduleTotal } from "../src/modules";
function setup() {
  const data = new Map<string, string>();
  let fail = false;
  const repo = new ProfileRepository({
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (fail) throw new Error("quota");
      data.set(k, v);
    },
  });
  const session = new RunSession([], repo);
  const id = session.createProfile("Buyer");
  session.start(id, "3");
  session.finishWave(id, { hp: 65, salvage: 500, medkits: 1 });
  for (let i = 0; i < 5; i++) {
    const q = session.profile(id).activeRun!.quiz!.questions[i];
    session.submit(id, q.id, `${q.answer[0]}/${q.answer[1]}`, 20000);
  }
  session.chooseReward(
    id,
    session.profile(id).activeRun!.quiz!.rewardChoices![0].id,
  );
  session.claimCache(id, "Piercing");
  return {
    session,
    id,
    repo,
    setFailure: (value: boolean) => {
      fail = value;
    },
  };
}

test("four purchases refill once; retries and reload retain empty slots and fixed math rewards", () => {
  const { session, id, repo } = setup();
  const before = session.profile(id).activeRun!;
  const offers = before.shop!.offers;
  session.buy(id, offers[0].id);
  session.buy(id, offers[0].id);
  const afterFirst = repo.load()[0].activeRun!;
  assert.deepEqual(afterFirst.shopBought, [offers[0].id]);
  assert.equal(afterFirst.salvage, before.salvage - offers[0].price);
  assert.deepEqual(afterFirst.quiz!.rewardChoices, before.quiz!.rewardChoices);
  for (const offer of offers.slice(1)) session.buy(id, offer.id);
  const after = session.profile(id).activeRun!;
  assert.equal(after.shop!.round, 1);
  assert.equal(after.shopBought.length, 0);
  assert.ok(
    after.shop!.offers.every((o) => !offers.some((old) => old.id === o.id)),
  );
  const salvage = after.salvage;
  session.buy(id, offers[3].id);
  assert.equal(session.profile(id).activeRun!.salvage, salvage);
  assert.equal(session.profile(id).activeRun!.shop!.round, 1);
});

test("paid rerolls preserve bought slots and the guaranteed first expander", () => {
  const { session, id } = setup();
  const initial = session.profile(id).activeRun!;
  session.buy(id, initial.shop!.offers[1].id);
  const before = session.profile(id).activeRun!;
  session.reroll(id);
  const after = session.profile(id).activeRun!;
  assert.deepEqual(after.shop!.offers[0], before.shop!.offers[0]);
  assert.deepEqual(after.shop!.offers[1], before.shop!.offers[1]);
  assert.notEqual(after.shop!.offers[2].id, before.shop!.offers[2].id);
  assert.equal(after.salvage, before.salvage - 2);
  assert.equal(after.shop!.paidRerolls, 1);
  assert.deepEqual(after.shopBought, before.shopBought);
});

test("a capped offer is replaced without counting as a purchase", () => {
  const { session, id, repo } = setup();
  const profiles = session.profiles;
  const run = profiles[0].activeRun!;
  run.modules = [
    {
      id: "old",
      name: "Old damage",
      stat: "damage",
      value: 0.55,
      quality: "green",
    },
  ];
  for (const index of [1, 2])
    run.shop!.offers[index] = {
      id: `offer${index}`,
      kind: "module",
      title: "Damage",
      price: 6,
      module: {
        id: `module${index}`,
        name: "Damage",
        stat: "damage",
        value: 0.05,
        quality: "green",
      },
    };
  const updated = new RunSession(profiles, repo);
  updated.buy(id, "offer1");
  const result = updated.profile(id).activeRun!;
  assert.equal(moduleTotal(result.modules, "damage"), 0.6);
  assert.deepEqual(result.shopBought, ["offer1"]);
  assert.notEqual(result.shop!.offers[2].id, "offer2");
  assert.equal(result.shop!.round, 0);
});

test("failed module purchase preserves currency and offers until retry", () => {
  const { session, id, repo, setFailure } = setup();
  const before = session.profiles;
  const offer = before[0].activeRun!.shop!.offers.find(
    (o) => o.kind === "module",
  )!;
  setFailure(true);
  assert.throws(() => session.buy(id, offer.id));
  assert.deepEqual(session.profiles, before);
  setFailure(false);
  session.buy(id, offer.id);
  session.buy(id, offer.id);
  const run = repo.load()[0].activeRun!;
  assert.equal(run.salvage, before[0].activeRun!.salvage - offer.price);
  assert.equal(run.modules.filter((m) => m.id === offer.module!.id).length, 1);
});

test("nine-wave spending routes keep useful math rewards after purchases and armor caches", () => {
  for (let route = 0; route < 9; route++) {
    const session = new RunSession([], { commit: () => {} });
    const id = session.createProfile("Route");
    session.start(id, "3");
    for (let wave = 1; wave <= 9; wave++) {
      const carry = session.profile(id).activeRun!.salvage;
      session.finishWave(id, {
        hp: 75,
        salvage: carry + Math.min(10 + wave * 3, 34),
        medkits: 1,
      });
      for (let i = 0; i < 5; i++) {
        const q = session.profile(id).activeRun!.quiz!.questions[i];
        session.submit(
          id,
          q.id,
          `${q.answer[0]}/${q.answer[1]}`,
          route < 3 ? 5000 : route < 6 ? 15000 : 30000,
        );
      }
      const quiz = session.profile(id).activeRun!.quiz!;
      assert.equal(quiz.rewardChoices!.length, 3);
      session.chooseReward(id, quiz.rewardChoices![route % 3].id);
      session.claimCache(id);
      for (let i = 0; i < 100; i++) {
        const run = session.profile(id).activeRun!;
        const choices = run.shop!.offers.filter(
          (o) => !run.shopBought.includes(o.id) && o.price <= run.salvage,
        );
        if (!choices.length) break;
        const offer = choices[(route + wave) % choices.length];
        const before = run.salvage;
        session.buy(id, offer.id);
        assert.ok(session.profile(id).activeRun!.salvage < before);
      }
      if (wave < 9) session.nextWave(id);
    }
  }
});

test("mismatched saved offer payloads are rejected before display or purchase", () => {
  const { session, repo } = setup();
  const malformed = session.profiles;
  const medkit = malformed[0].activeRun!.shop!.offers.find(
    (o) => o.kind === "medkit",
  )!;
  Object.assign(medkit, { module: {} });
  assert.throws(() => repo.commit(malformed), /unexpected shop module/);
});

test("legacy shop migration preserves bought slots and the saved reward choices", () => {
  const { session, id, repo } = setup();
  const profiles = session.profiles;
  const run = profiles[0].activeRun!;
  run.shop = undefined;
  run.shopBought = ["medkit"];
  const rewards = structuredClone(run.quiz!.rewardChoices);
  const restored = new RunSession(profiles, repo);
  restored.openShop(id);
  const migrated = repo.load()[0].activeRun!;
  assert.deepEqual(migrated.shopBought, ["medkit"]);
  assert.deepEqual(migrated.quiz!.rewardChoices, rewards);
  restored.buy(id, "medkit");
  assert.equal(restored.profile(id).activeRun!.salvage, run.salvage);
  assert.equal(restored.profile(id).activeRun!.medkits, run.medkits);
});
