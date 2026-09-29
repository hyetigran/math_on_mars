import { renderFood } from "./town-food";
export function renderConstruction(
  root: HTMLElement,
  state: any,
  send: (command: unknown) => void,
) {
  root.innerHTML = `<h3>Construction</h3><p>${state.resources.blocks} blocks · ${state.resources.parts} parts · ${state.resources.credits} credits · ${state.resources.food} food</p><p>Utilities: ${state.utilities.power} power · ${state.utilities.water} water · ${state.utilities.oxygen} oxygen · House demand: ${state.housePowerDemand} power</p><p>${state.jobs.filter((j: any) => j.status === "running").length} / ${state.constructionSlots} construction slots occupied</p>`;
  for (const [id, plot] of Object.entries<any>(state.plots)) {
    const section = document.createElement("section");
    section.dataset.plot = id;
    const job = state.jobs.find(
      (j: any) => j.plotId === id && j.status === "running",
    );
    const label = document.createElement("p");
    label.textContent = `${id}: ${plot.building ?? (job ? "Greenhouse under construction" : "Empty ordinary plot")}`;
    section.append(label);
    const button = document.createElement("button");
    button.dataset.mutation = "true";
    if (job) {
      const remaining = Math.max(0, job.endsAt - state.serverNow);
      const progress = document.createElement("progress");
      progress.max = job.duration;
      progress.value = job.duration - remaining;
      section.append(progress);
      const note = document.createElement("p");
      note.textContent = `${Math.ceil(remaining / 1000)} seconds remaining. Cancel returns ${job.cost.blocks} blocks and ${job.cost.parts} parts; all progress and applied construction credit are lost.`;
      section.append(note);
      const applicable = Math.min(remaining, state.constructionCredit);
      const preview = document.createElement("p");
      preview.textContent = `Bank: ${state.constructionCredit / 60000} minutes. Apply ${applicable / 1000} seconds; ${Math.ceil((remaining - applicable) / 1000)} seconds remain. Completion: ${new Date(job.endsAt - applicable).toLocaleString()}. Excess credit stays banked.`;
      section.append(preview);
      if (applicable > 0) {
        const spend = document.createElement("button");
        spend.dataset.mutation = "true";
        spend.dataset.spendCredit = job.id;
        spend.textContent = "Apply previewed construction credit";
        spend.onclick = () =>
          send({
            action: "spend-credit",
            jobId: job.id,
            expectedRevision: state.revision,
          });
        section.append(spend);
      }
      button.textContent = "Cancel and refund materials";
      button.onclick = () => send({ action: "cancel", jobId: job.id });
      section.append(button);
    } else if (plot.building === "house" && plot.level === 1) {
      const recipe = state.recipes.house;
      button.textContent = `Upgrade House to level 2 · ${recipe.cost.blocks} blocks + ${recipe.cost.parts} parts · ${recipe.duration / 60000} minutes`;
      button.dataset.upgradeHouse = "true";
      button.onclick = () => send({ action: "upgrade-house" });
      section.append(button);
    } else if (!plot.building) {
      const recipe = state.recipes.greenhouse;
      button.textContent = `Build Greenhouse · ${recipe.cost.blocks} blocks + ${recipe.cost.parts} parts · ${recipe.duration / 1000} seconds`;
      button.onclick = () => send({ action: "build", plotId: id });
      section.append(button);
    }
    root.append(section);
  }
  if (state.foodSummary) renderFood(root, state, send);
}
