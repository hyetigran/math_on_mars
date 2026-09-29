import { requireRule } from "./town-rules.mjs";
export const cropRecipes = {
  lettuce: { seedCost: 10, duration: 1800000, yield: 4, power: 2, water: 2 },
};
export function initializeFood(state, now) {
  if (state.version < 3)
    Object.assign(state, {
      version: 3,
      lastSimulatedAt: now,
      mealRemaining: 3600000,
      seeds: [],
      farms: {},
      foodTotals: { harvested: 0, meals: 0, emergencyMeals: 0 },
    });
  for (const [id, plot] of Object.entries(state.plots))
    if (plot.building === "greenhouse" && !state.farms[id])
      state.farms[id] = {
        workerId: null,
        crop: null,
        remaining: cropRecipes.lettuce.duration,
        held: 0,
      };
}
export function foodSummary(state) {
  let power = state.utilities.power,
    water = state.utilities.water - state.adults;
  const assigned = Object.values(state.farms).filter((f) => f.workerId).length;
  const farms = {};
  for (const [id, farm] of Object.entries(state.farms)) {
    let status;
    if (farm.held) status = "Storage full: harvest held safely";
    else if (!farm.workerId) status = "Paused: assign an adult worker";
    else if (!farm.crop) status = "Paused: select an unlocked crop";
    else {
      const recipe = cropRecipes[farm.crop];
      if (
        power < recipe.power ||
        water < recipe.water ||
        state.utilities.oxygen < state.adults
      )
        status = "Paused: insufficient utilities";
      else {
        status = "Growing";
        power -= recipe.power;
        water -= recipe.water;
      }
    }
    farms[id] = { ...farm, status };
  }
  return {
    farms,
    assigned,
    available: state.adults - assigned,
    reserve: Math.min(state.resources.food, state.adults * 24),
    reserveTarget: state.adults * 24,
  };
}
function transferHarvests(state) {
  for (const farm of Object.values(state.farms))
    if (farm.held && state.resources.food + farm.held <= state.foodCapacity) {
      state.resources.food += farm.held;
      farm.held = 0;
    }
}
export function advanceFood(state, until) {
  let remaining = Math.max(0, until - state.lastSimulatedAt);
  while (remaining > 0) {
    transferHarvests(state);
    const growing = Object.entries(foodSummary(state).farms)
      .filter(([, f]) => f.status === "Growing")
      .map(([id]) => state.farms[id]);
    const step = Math.min(
      remaining,
      state.mealRemaining,
      ...growing.map((f) => f.remaining),
    );
    remaining -= step;
    state.lastSimulatedAt += step;
    state.mealRemaining -= step;
    for (const farm of growing) farm.remaining -= step;
    if (state.mealRemaining === 0) {
      const meals = Math.min(state.resources.food, state.adults);
      state.resources.food -= meals;
      state.foodTotals.meals += meals;
      state.foodTotals.emergencyMeals += state.adults - meals;
      state.mealRemaining = 3600000;
    }
    for (const farm of growing)
      if (farm.remaining === 0) {
        const recipe = cropRecipes[farm.crop];
        farm.held = recipe.yield;
        farm.remaining = recipe.duration;
        state.foodTotals.harvested += recipe.yield;
      }
    transferHarvests(state);
  }
}
export function applyFoodCommand(state, input) {
  if (input.action === "unlock-seed") {
    requireRule(Object.hasOwn(cropRecipes, input.crop), "Choose a valid crop");
    requireRule(!state.seeds.includes(input.crop), "Seed already unlocked");
    const recipe = cropRecipes[input.crop];
    requireRule(
      state.resources.credits >= recipe.seedCost,
      "Insufficient credits",
    );
    state.resources.credits -= recipe.seedCost;
    state.seeds.push(input.crop);
  } else if (
    input.action === "assign-worker" ||
    input.action === "select-crop"
  ) {
    requireRule(
      Object.hasOwn(state.farms, input.plotId),
      "Choose a completed Greenhouse",
    );
    const farm = state.farms[input.plotId];
    if (input.action === "assign-worker") {
      requireRule(
        input.workerId === null ||
          Array.from(
            { length: state.adults },
            (_, i) => `adult-${i + 1}`,
          ).includes(input.workerId),
        "Choose an adult worker",
      );
      requireRule(
        input.workerId === null ||
          !Object.entries(state.farms).some(
            ([id, f]) => id !== input.plotId && f.workerId === input.workerId,
          ),
        "Adult already assigned",
      );
      farm.workerId = input.workerId;
    } else {
      requireRule(state.seeds.includes(input.crop), "Choose an unlocked crop");
      farm.crop = input.crop;
    }
  } else if (input.action === "restore-utilities") {
    state.utilities = { power: 10, water: 10, oxygen: 10 };
  } else return false;
  return true;
}
