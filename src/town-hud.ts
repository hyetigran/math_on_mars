import { mountManagement } from "./town-management";
import "./town-hud.css";
export function mountTownHud(
  root: HTMLElement,
  townId: string,
  api: (path: string, data?: unknown) => Promise<any>,
  guest: boolean,
) {
  const frame = root.querySelector<HTMLIFrameElement>("iframe")!;
  const dialog = root.querySelector<HTMLDialogElement>(".game-panel")!;
  const management = root.querySelector<HTMLElement>("#management")!;
  const title = root.querySelector<HTMLElement>("#panel-title")!;
  let opener: HTMLElement | null = null;
  function buildTab(tab: string) {
    management.dataset.buildTab = tab;
    root.querySelector<HTMLElement>(".building-inventory")!.hidden =
      tab !== "inventory";
    root
      .querySelectorAll<HTMLButtonElement>("[data-build-tab]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.buildTab === tab)),
      );
  }
  function open(panel: string, plot?: string) {
    if (!dialog.open || !dialog.contains(document.activeElement))
      opener =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    dialog.classList.toggle("building-tray", !!plot);
    management.dataset.panel = panel;
    buildTab("buildings");
    root.querySelector<HTMLElement>(".build-tabs")!.hidden =
      panel !== "build" || !!plot;
    root.querySelector<HTMLElement>(".build-wallet")!.hidden =
      panel !== "build";
    title.textContent =
      panel === "build"
        ? plot
          ? "Building"
          : "Buildings & Upgrades"
        : panel === "practice"
          ? "Practice"
          : "Settings";
    const construction = management.querySelector<HTMLElement>(
      "[data-construction]",
    )!;
    construction.dataset.selectedPlot = plot ?? "";
    construction
      .querySelectorAll<HTMLElement>("[data-plot]")
      .forEach((c) => (c.hidden = !!plot && c.dataset.plot !== plot));
    root.querySelector<HTMLButtonElement>("[data-all-plots]")!.hidden =
      panel !== "build" || !plot;
    // A selected building uses a nonmodal tray so the town remains interactive.
    if (dialog.open) dialog.close();
    if (plot) dialog.show();
    else dialog.showModal();
  }
  const dispose = mountManagement(management, townId, api, {
    guest,
    autoManage: true,
    compact: true,
    onSnapshot(state, managed) {
      for (const [key, value] of Object.entries(state.resources)) {
        const el = root.querySelector<HTMLElement>(`[data-resource=${key}]`);
        if (el) {
          const next = Number(value).toLocaleString();
          if (el.textContent !== "—" && el.textContent !== next) {
            el.classList.remove("resource-changed");
            void el.offsetWidth;
            el.classList.add("resource-changed");
          }
          el.textContent = next;
          const wallet = root.querySelector<HTMLElement>(
            `[data-wallet=${key}]`,
          );
          if (wallet) wallet.textContent = next;
        }
      }
      const running = state.jobs.filter((j: any) => j.status === "running");
      root.querySelector<HTMLElement>("[data-builders]")!.textContent =
        `${state.constructionSlots - running.length}/${state.constructionSlots}`;
      root.querySelector<HTMLElement>("[data-builder-status]")!.textContent =
        running.length ? `${running.length} building` : "Builders free";
      root.querySelector<HTMLElement>("[data-workers]")!.textContent =
        `${state.foodSummary.available}/${state.adults}`;
      root.querySelector<HTMLElement>("[data-house-level]")!.textContent =
        String(state.houseLevel);
      const upgrade = running.find((job: any) => job.building === "house");
      const progress = root.querySelector<HTMLProgressElement>(
        "[data-level-progress]",
      )!;
      progress.max = upgrade?.duration ?? 1;
      progress.value = upgrade
        ? upgrade.duration - Math.max(0, upgrade.endsAt - state.serverNow)
        : state.houseLevel > 1
          ? 1
          : 0;
      root.querySelector<HTMLElement>("[data-level-status]")!.textContent =
        upgrade
          ? `${Math.ceil((upgrade.endsAt - state.serverNow) / 60000)}m remaining`
          : state.houseLevel > 1
            ? "Upgrade complete"
            : "Upgrade available";
      root.querySelector<HTMLButtonElement>("[data-manage-here]")!.hidden =
        managed;
    },
  });
  root
    .querySelectorAll<HTMLButtonElement>("button[data-panel]")
    .forEach((b) => (b.onclick = () => open(b.dataset.panel!)));
  root
    .querySelectorAll<HTMLButtonElement>("[data-build-tab]")
    .forEach((b) => (b.onclick = () => buildTab(b.dataset.buildTab!)));
  const clockButtons = root.querySelectorAll<HTMLButtonElement>(
    "[data-fast-forward]",
  );
  let pendingTime: { seconds: number; requestId: string } | null = null;
  if (clockButtons.length)
    void api("/api/playtest/time")
      .then((result) => {
        root.querySelector<HTMLElement>("[data-test-time]")!.textContent =
          `Paused · ${Math.floor(result.elapsed / 60)}m ${result.elapsed % 60}s`;
      })
      .catch(() => {});
  clockButtons.forEach(
    (b) =>
      (b.onclick = async () => {
        clockButtons.forEach((button) => (button.disabled = true));
        const error = root.querySelector<HTMLElement>("[data-clock-error]")!;
        error.hidden = true;
        try {
          const seconds = Number(b.dataset.fastForward);
          if (pendingTime?.seconds !== seconds)
            pendingTime = { seconds, requestId: crypto.randomUUID() };
          const result = await api("/api/playtest/time", pendingTime);
          pendingTime = null;
          root.querySelector<HTMLElement>("[data-test-time]")!.textContent =
            `Paused · ${Math.floor(result.elapsed / 60)}m ${result.elapsed % 60}s`;
          management.querySelector<HTMLButtonElement>("[data-sync]")!.click();
        } catch (e) {
          error.textContent =
            e instanceof Error ? e.message : "Could not advance time";
          error.hidden = false;
        } finally {
          clockButtons.forEach((button) => (button.disabled = false));
        }
      }),
  );
  root.querySelector<HTMLButtonElement>("[data-close-panel]")!.onclick = () =>
    dialog.close();
  root.querySelector<HTMLButtonElement>("[data-all-plots]")!.onclick = () =>
    open("build");
  root.querySelector<HTMLButtonElement>("[data-manage-here]")!.onclick = () =>
    open("settings");
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dialog.classList.contains("building-tray"))
      dialog.close();
  });
  dialog.onclose = () => {
    if (!dialog.open) opener?.focus();
  };
  let walking = false;
  root.querySelector<HTMLButtonElement>("[data-camera]")!.onclick = (event) => {
    walking = !walking;
    const b = event.currentTarget as HTMLButtonElement;
    b.setAttribute("aria-pressed", String(walking));
    b.textContent = walking ? "▦" : "♟";
    b.setAttribute(
      "aria-label",
      walking ? "Switch town camera" : "Switch walking camera",
    );
    frame.contentWindow?.postMessage(
      { type: "town-camera", mode: walking ? "walk" : "overview" },
      location.origin,
    );
  };
  const receive = (event: MessageEvent) => {
    if (
      event.origin !== location.origin ||
      event.source !== frame.contentWindow
    )
      return;
    if (
      event.data?.type === "town-select" &&
      ["home", "garden", "market", "edge"].includes(event.data.plotId)
    )
      open("build", event.data.plotId);
  };
  window.addEventListener("message", receive);
  const offline = () => {
    root.querySelector<HTMLElement>("[data-network]")!.hidden =
      navigator.onLine;
  };
  window.addEventListener("offline", offline);
  window.addEventListener("online", offline);
  offline();
  return () => {
    dispose();
    dialog.close();
    window.removeEventListener("message", receive);
    window.removeEventListener("offline", offline);
    window.removeEventListener("online", offline);
  };
}
