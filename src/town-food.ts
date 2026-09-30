import { availableWorker } from "./town-workers";
export function renderFood(
  root: HTMLElement,
  state: any,
  send: (command: unknown) => void,
) {
  const summary = state.foodSummary;
  const section = document.createElement("section");
  section.dataset.food = "true";
  const heading = document.createElement("h3");
  heading.textContent = "Workers and food";
  section.append(heading);
  const info = document.createElement("p");
  info.textContent = `${summary.available} adult workers available · ${summary.assigned} assigned · ${state.adults} residents / ${state.houseCapacity} housing. Food: ${state.resources.food} / ${state.foodCapacity}. One-day household reserve: ${summary.reserve} / ${summary.reserveTarget}. Emergency meals supplied: ${state.foodTotals.emergencyMeals}.`;
  section.append(info);
  function button(label: string, command: unknown, container = section) {
    const b = document.createElement("button");
    b.textContent = label;
    b.dataset.mutation = "true";
    b.onclick = () => send(command);
    container.append(b);
    return b;
  }
  if (!state.seeds.includes("lettuce"))
    button(
      `Unlock lettuce seeds · ${state.cropRecipes.lettuce.seedCost} credits once`,
      { action: "unlock-seed", crop: "lettuce" },
    ).dataset.unlockSeed = "true";
  if (Object.values<number>(state.utilities).some((capacity) => capacity < 10))
    button("Restore starter essential utilities", {
      action: "restore-utilities",
    });
  for (const [id, farm] of Object.entries<any>(summary.farms)) {
    const group = document.createElement("section");
    group.dataset.farm = id;
    const label = document.createElement("p");
    label.textContent = `${id} Greenhouse: ${farm.status}. ${farm.held} portions held outside storage. ${Math.ceil(farm.remaining / 1000)} growing seconds until next harvest.`;
    group.append(label);
    if (farm.workerId)
      button(
        `Remove ${farm.workerId}`,
        { action: "assign-worker", plotId: id, workerId: null },
        group,
      );
    else {
      const available = availableWorker(state);
      if (available)
        button(
          `Assign ${available}`,
          { action: "assign-worker", plotId: id, workerId: available },
          group,
        );
    }
    if (!farm.crop && state.seeds.includes("lettuce"))
      button(
        `Grow lettuce · ${state.cropRecipes.lettuce.yield} portions every ${state.cropRecipes.lettuce.duration / 60000} minutes · auto-replant free`,
        { action: "select-crop", plotId: id, crop: "lettuce" },
        group,
      );
    section.append(group);
  }
  root.append(section);
}
