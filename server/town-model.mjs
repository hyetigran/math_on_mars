import { initializeFood, advanceFood, applyFoodCommand } from "./town-food.mjs";
import { TownRuleError, requireRule } from "./town-rules.mjs";
export { TownRuleError } from "./town-rules.mjs";
import { randomUUID } from "node:crypto";
export const constructionRecipes = {
  greenhouse: { cost: { blocks: 20, parts: 5 }, duration: 10000 },
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
  return state;
}
export function reconcileTown(state, now) {
  for (const job of state.jobs
    .filter((j) => j.status === "running" && j.endsAt <= now)
    .sort((a, b) => a.endsAt - b.endsAt)) {
    advanceFood(state, job.endsAt);
    job.status = "completed";
    state.plots[job.plotId] = { building: job.building, level: job.level };
    initializeFood(state, job.endsAt);
    state.revision++;
  }
  advanceFood(state, now);
  return state;
}
export function applyTownCommand(state, input, now) {
  if (input.action === "build") {
    const plot = state.plots[input.plotId];
    requireRule(
      Object.hasOwn(state.plots, input.plotId),
      "Choose a valid plot",
    );
    requireRule(
      !plot.building &&
        !state.jobs.some(
          (j) => j.plotId === input.plotId && j.status === "running",
        ),
      "Plot is occupied",
    );
    requireRule(
      state.jobs.filter((j) => j.status === "running").length <
        state.constructionSlots,
      "Both construction slots are occupied",
    );
    const { cost, duration } = constructionRecipes.greenhouse;
    requireRule(
      state.resources.blocks >= cost.blocks &&
        state.resources.parts >= cost.parts,
      "Insufficient materials",
    );
    state.resources.blocks -= cost.blocks;
    state.resources.parts -= cost.parts;
    state.jobs.push({
      id: randomUUID(),
      plotId: input.plotId,
      building: "greenhouse",
      level: 1,
      startedAt: now,
      endsAt: now + duration,
      duration,
      cost,
      status: "running",
    });
  } else if (input.action === "cancel") {
    const job = state.jobs.find(
      (j) => j.id === input.jobId && j.status === "running",
    );
    requireRule(job, "Choose a running job");
    job.status = "cancelled";
    state.resources.blocks += job.cost.blocks;
    state.resources.parts += job.cost.parts;
  } else if (!applyFoodCommand(state, input))
    throw new TownRuleError("Unknown town command");
  state.revision++;
  return state;
}
