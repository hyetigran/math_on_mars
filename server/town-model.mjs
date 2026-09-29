import { initializeVisits } from "./town-visits.mjs";
import { initializePractice, applyPracticeCommand } from "./town-practice.mjs";
import { initializeFood, advanceFood, applyFoodCommand } from "./town-food.mjs";
import { TownRuleError, requireRule } from "./town-rules.mjs";
export { TownRuleError } from "./town-rules.mjs";
import { randomUUID } from "node:crypto";
export const constructionRecipes = {
  greenhouse: { cost: { blocks: 20, parts: 5 }, duration: 10000 },
  house: {
    cost: { blocks: 40, parts: 10 },
    duration: 3600000,
    capacity: 4,
    powerDemand: 1,
  },
};
export function initializeTown(state, now) {
  if (state.version < 2)
    Object.assign(state, {
      version: 2,
      revision: state.revision ?? 0,
      resources: { blocks: 80, parts: 20, credits: 60, food: 24 },
      utilities: { power: 10, water: 10, oxygen: 10 },
      foodCapacity: 72,
      constructionSlots: 2,
      plots: {
        home: { building: "house", level: state.houseLevel },
        garden: { building: null, level: 0 },
        market: { building: null, level: 0 },
        edge: { building: null, level: 0 },
      },
      jobs: [],
      lastSimulatedAt: now,
    });
  initializeFood(state, now);
  if (state.version < 4) {
    state.version = 4;
    state.housePowerDemand =
      state.houseLevel > 1 ? constructionRecipes.house.powerDemand : 0;
  }
  initializePractice(state);
  initializeVisits(state);
  return state;
}
export function reconcileTown(state, now) {
  const productionEnd = Math.min(now, state.productionUntil);
  for (const job of state.jobs
    .filter((j) => j.status === "running" && j.endsAt <= now)
    .sort((a, b) => a.endsAt - b.endsAt)) {
    advanceFood(state, Math.min(job.endsAt, productionEnd));
    job.status = "completed";
    state.plots[job.plotId] = { building: job.building, level: job.level };
    if (job.building === "house") {
      state.houseLevel = job.level;
      state.houseCapacity = constructionRecipes.house.capacity;
      state.housePowerDemand = constructionRecipes.house.powerDemand;
    }
    initializeFood(state, job.endsAt);
    state.revision++;
  }
  advanceFood(state, productionEnd);
  state.lastSimulatedAt = Math.max(state.lastSimulatedAt, now);
  return state;
}
export function applyTownCommand(state, input, now) {
  if (input.action === "build" || input.action === "upgrade-house") {
    const upgrade = input.action === "upgrade-house";
    const plotId = upgrade ? "home" : input.plotId;
    requireRule(Object.hasOwn(state.plots, plotId), "Choose a valid plot");
    const plot = state.plots[plotId];
    if (upgrade)
      requireRule(
        plot.building === "house" && plot.level === 1,
        "House is already at the available upgrade level",
      );
    else requireRule(!plot.building, "Plot is occupied");
    requireRule(
      !state.jobs.some((j) => j.plotId === plotId && j.status === "running"),
      "Plot is occupied by a running project",
    );
    requireRule(
      state.jobs.filter((j) => j.status === "running").length <
        state.constructionSlots,
      "Both construction slots are occupied",
    );
    const { cost, duration } =
      constructionRecipes[upgrade ? "house" : "greenhouse"];
    requireRule(
      state.resources.blocks >= cost.blocks &&
        state.resources.parts >= cost.parts,
      "Insufficient materials",
    );
    state.resources.blocks -= cost.blocks;
    state.resources.parts -= cost.parts;
    state.jobs.push({
      id: randomUUID(),
      plotId,
      building: upgrade ? "house" : "greenhouse",
      level: upgrade ? 2 : 1,
      startedAt: now,
      endsAt: now + duration,
      duration,
      cost,
      status: "running",
    });
  } else if (input.action === "spend-credit") {
    requireRule(
      input.expectedRevision === state.revision,
      "Town changed. Refresh the credit preview.",
    );
    const job = state.jobs.find(
      (j) => j.id === input.jobId && j.status === "running",
    );
    requireRule(job, "Choose a running construction or upgrade job");
    const used = Math.min(
      Math.max(0, job.endsAt - now),
      state.constructionCredit,
    );
    requireRule(used > 0, "No construction credit can be applied");
    state.constructionCredit -= used;
    job.endsAt -= used;
    job.creditApplied = (job.creditApplied ?? 0) + used;
    reconcileTown(state, now);
  } else if (input.action === "cancel") {
    const job = state.jobs.find(
      (j) => j.id === input.jobId && j.status === "running",
    );
    requireRule(job, "Choose a running job");
    job.status = "cancelled";
    state.resources.blocks += job.cost.blocks;
    state.resources.parts += job.cost.parts;
  } else if (
    !applyFoodCommand(state, input) &&
    !applyPracticeCommand(state, input)
  )
    throw new TownRuleError("Unknown town command");
  state.revision++;
  return state;
}
