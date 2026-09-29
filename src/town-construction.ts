export function renderConstruction(
  root: HTMLElement,
  state: any,
  send: (command: unknown) => void,
) {
  root.innerHTML = `<h3>Construction</h3><p>${state.resources.blocks} blocks · ${state.resources.parts} parts · ${state.resources.credits} credits · ${state.resources.food} food</p><p>Utilities: ${state.utilities.power} power · ${state.utilities.water} water · ${state.utilities.oxygen} oxygen</p><p>${state.jobs.filter((j: any) => j.status === "running").length} / ${state.constructionSlots} construction slots occupied</p>`;
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
      button.textContent = "Cancel and refund materials";
      button.onclick = () => send({ action: "cancel", jobId: job.id });
      section.append(button);
    } else if (!plot.building) {
      const recipe = state.recipes.greenhouse;
      button.textContent = `Build Greenhouse · ${recipe.cost.blocks} blocks + ${recipe.cost.parts} parts · ${recipe.duration / 1000} seconds`;
      button.onclick = () => send({ action: "build", plotId: id });
      section.append(button);
    } else if (plot.building === "greenhouse") {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "Open Greenhouse";
      details.append(summary);
      const note = document.createElement("p");
      note.textContent =
        "Greenhouse complete. Worker and crop controls arrive in the farming slice.";
      details.append(note);
      section.append(details);
    }
    root.append(section);
  }
}
