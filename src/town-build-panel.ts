import { availableWorker } from "./town-workers";
const time = (ms: number) =>
  ms < 60000
    ? `${Math.ceil(ms / 1000)}s`
    : ms < 3600000
      ? `${Math.ceil(ms / 60000)}m`
      : `${Math.ceil(ms / 3600000)}h`;
export function renderBuildPanel(
  root: HTMLElement,
  state: any,
  send: (command: unknown) => void,
) {
  const focused = root.contains(document.activeElement)
    ? (document.activeElement as HTMLElement).dataset.focusKey
    : undefined;
  const expanded = new Set(
    Array.from(
      root.querySelectorAll<HTMLDetailsElement>("details[open]"),
      (d) => d.dataset.job,
    ),
  );
  root.replaceChildren();
  for (const [id, plot] of Object.entries<any>(state.plots)) {
    const card = document.createElement("section");
    card.dataset.plot = id;
    card.hidden =
      !!root.dataset.selectedPlot && root.dataset.selectedPlot !== id;
    const job = state.jobs.find(
      (j: any) => j.plotId === id && j.status === "running",
    );
    const title = document.createElement("h3");
    title.textContent =
      plot.building === "house"
        ? `House · Lv ${plot.level}`
        : plot.building === "greenhouse" || job
          ? "Greenhouse"
          : "Empty plot";
    card.append(title);
    const location = document.createElement("small");
    location.textContent =
      (
        {
          home: "Plaza",
          garden: "Garden",
          market: "Market",
          edge: "Outskirts",
        } as Record<string, string>
      )[id] ?? id;
    card.append(location);
    const note = (text: string) => {
      const p = document.createElement("p");
      p.textContent = text;
      card.append(p);
    };
    const button = (label: string, command: unknown) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.dataset.mutation = "true";
      b.dataset.focusKey = `${id}:${label}`;
      b.onclick = () => send(command);
      card.append(b);
      return b;
    };
    if (job) {
      const left = Math.max(0, job.endsAt - state.serverNow),
        credit = Math.min(left, state.constructionCredit);
      const progress = document.createElement("progress");
      progress.max = job.duration;
      progress.value = job.duration - left;
      progress.setAttribute("aria-label", "Construction progress");
      card.append(progress);
      note(`${time(left)} remaining`);
      if (credit > 0)
        button(`Boost −${time(credit)}`, {
          action: "spend-credit",
          jobId: job.id,
          expectedRevision: state.revision,
        }).dataset.spendCredit = job.id;
      const details = document.createElement("details"),
        summary = document.createElement("summary");
      details.dataset.job = job.id;
      details.open = expanded.has(job.id);
      summary.dataset.focusKey = `cancel:${job.id}`;
      summary.textContent = "Cancel build";
      details.append(summary);
      const warning = document.createElement("p");
      warning.textContent = `Refund: ${job.cost.blocks} blocks + ${job.cost.parts} parts. Progress and spent boosts are lost.`;
      details.append(warning);
      const cancel = button("Confirm cancel", {
        action: "cancel",
        jobId: job.id,
      });
      details.append(cancel);
      card.append(details);
    } else if (plot.building === "house") {
      note(`${state.adults} / ${state.houseCapacity} residents`);
      if (plot.level === 1) {
        const r = state.recipes.house;
        note(
          `${r.cost.blocks} blocks · ${r.cost.parts} parts · ${time(r.duration)}`,
        );
        button("Upgrade", { action: "upgrade-house" }).dataset.upgradeHouse =
          "true";
      }
    } else if (!plot.building) {
      const r = state.recipes.greenhouse;
      note(
        `${r.cost.blocks} blocks · ${r.cost.parts} parts · ${time(r.duration)}`,
      );
      button("Build greenhouse", { action: "build", plotId: id });
    }
    const farm = state.foodSummary?.farms[id];
    if (farm) {
      card.dataset.farm = id;
      note(
        farm.crop
          ? `${farm.status} · ${time(farm.remaining)}`
          : "Choose a crop",
      );
      if (farm.held) note(`${farm.held} food awaiting storage`);
      if (farm.workerId)
        button("Unassign worker", {
          action: "assign-worker",
          plotId: id,
          workerId: null,
        });
      else {
        const worker = availableWorker(state);
        if (worker)
          button("Assign worker", {
            action: "assign-worker",
            plotId: id,
            workerId: worker,
          });
        else note("No free workers");
      }
      if (!state.seeds.includes("lettuce"))
        button(
          `Unlock lettuce · ${state.cropRecipes.lettuce.seedCost} credits`,
          { action: "unlock-seed", crop: "lettuce" },
        ).dataset.unlockSeed = "true";
      else if (!farm.crop)
        button("Plant lettuce", {
          action: "select-crop",
          plotId: id,
          crop: "lettuce",
        });
    }
    root.append(card);
  }
  if (focused)
    Array.from(root.querySelectorAll<HTMLElement>("[data-focus-key]"))
      .find((e) => e.dataset.focusKey === focused)
      ?.focus({ preventScroll: true });
  if (Object.values<number>(state.utilities).some((n) => n < 10)) {
    const b = document.createElement("button");
    b.textContent = "Restore utilities";
    b.dataset.mutation = "true";
    b.onclick = () => send({ action: "restore-utilities" });
    root.append(b);
  }
}
