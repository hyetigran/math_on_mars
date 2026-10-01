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
  function open(panel: string, plot?: string) {
    if (!dialog.open || !dialog.contains(document.activeElement))
      opener =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    dialog.classList.toggle("building-tray", !!plot);
    management.dataset.panel = panel;
    title.textContent =
      panel === "build"
        ? "Build"
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
        }
      }
      root.querySelector<HTMLElement>("[data-builders]")!.textContent =
        `${state.jobs.filter((j: any) => j.status === "running").length}/${state.constructionSlots}`;
      root.querySelector<HTMLButtonElement>("[data-manage-here]")!.hidden =
        managed;
    },
  });
  root
    .querySelectorAll<HTMLButtonElement>("button[data-panel]")
    .forEach((b) => (b.onclick = () => open(b.dataset.panel!)));
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
    b.textContent = walking ? "▦ Town" : "♟ Walk";
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
