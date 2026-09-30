import { renderBuildPanel } from "./town-build-panel";
import { mountVisit } from "./town-visit";
import { renderPractice } from "./town-practice";
import { renderConstruction } from "./town-construction";
type Api = (path: string, data?: unknown) => Promise<any>;
// Each tab gets a separate identity, including tabs sharing the same login cookie.
const deviceId = crypto.randomUUID();
export function mountManagement(
  root: HTMLElement,
  townId: string,
  api: Api,
  options: {
    guest?: boolean;
    autoManage?: boolean;
    compact?: boolean;
    onSnapshot?: (state: any, managed: boolean) => void;
  } = {},
) {
  const events = new AbortController();
  let disposed = false;
  let generation = 0;
  let managed = false;
  let busy = true;
  let connected = false;
  let commandError: string | null = null;
  root.innerHTML = `<p data-return-summary></p><h3>Town management</h3><p data-management-status role="status">Refreshing management…</p><p data-motto></p><button data-takeover disabled>Manage here / take over</button><button data-sync>Refresh management</button><form data-preference><label>Town motto<input name="motto" maxlength="80" required></label><button disabled>Save motto</button></form>${options.guest ? `<form data-guest-profile><label>Explorer name<input name="name" maxlength="40" required></label><label>Practice grade<select name="grade">${["K", "1", "2", "3", "4", "5"].map((grade) => `<option>${grade}</option>`).join("")}</select></label><button data-mutation>Save explorer</button></form>` : ""}<div data-construction></div><section data-practice></section>`;
  const status = root.querySelector<HTMLElement>("[data-management-status]")!;
  const takeover = root.querySelector<HTMLButtonElement>("[data-takeover]")!;
  const form = root.querySelector<HTMLFormElement>("form")!;
  const save = form.querySelector<HTMLButtonElement>("button")!;
  const storageKey = `town-preference-${townId}`;
  function controls() {
    takeover.disabled = busy || !connected || managed;
    save.disabled = busy || !connected || !managed;
    root
      .querySelectorAll<HTMLButtonElement>("[data-mutation]")
      .forEach((button) => (button.disabled = save.disabled));
  }
  async function refresh() {
    busy = true;
    connected = false;
    controls();
    try {
      const [lease, state] = await Promise.all([
        api(`/api/towns/${townId}/management`),
        api(`/api/towns/${townId}`),
      ]);
      if (disposed) return;
      if (options.autoManage && lease.available) {
        const acquired = await api(`/api/towns/${townId}/management`, {
          deviceId,
          generation: lease.generation,
          requestId: crypto.randomUUID(),
        });
        Object.assign(lease, acquired);
        if (disposed) return;
      }
      const profile = root.querySelector<HTMLFormElement>(
        "[data-guest-profile]",
      );
      if (profile && !profile.dataset.loaded) {
        (profile.elements.namedItem("name") as HTMLInputElement).value =
          state.guestName ?? "";
        (profile.elements.namedItem("grade") as HTMLSelectElement).value =
          state.guestGrade ?? "K";
        profile.dataset.loaded = "true";
      }
      generation = lease.generation;
      managed = lease.deviceId === deviceId;
      connected = navigator.onLine;
      root.querySelector<HTMLElement>("[data-motto]")!.textContent =
        `Town motto: ${state.motto ?? "Not set"}`;
      options.onSnapshot?.(state, managed);
      if (state.plots)
        (options.compact ? renderBuildPanel : renderConstruction)(
          root.querySelector<HTMLElement>("[data-construction]")!,
          state,
          sendIntent,
        );
      if (state.practice)
        renderPractice(
          root.querySelector<HTMLElement>("[data-practice]")!,
          state.practice,
          sendIntent,
          !options.guest,
          options.compact,
        );
      status.dataset.quiet = String(managed && !commandError);
      status.textContent =
        commandError ??
        (managed
          ? "You manage this town."
          : "Read only. Choose Manage here to take over.");
    } catch (error) {
      status.dataset.quiet = "false";
      status.textContent =
        error instanceof Error ? error.message : "Connection unavailable.";
    } finally {
      busy = false;
      controls();
    }
  }
  function sendIntent(intent: unknown) {
    const key = `town-command-${townId}`;
    const { password, ...durableIntent } = intent as Record<string, unknown>;
    let pending;
    try {
      pending = JSON.parse(sessionStorage.getItem(key) ?? "null");
    } catch {}
    if (
      !pending ||
      JSON.stringify(pending.command) !== JSON.stringify(durableIntent)
    )
      pending = { command: durableIntent, requestId: crypto.randomUUID() };
    sessionStorage.setItem(key, JSON.stringify(pending));
    void command(
      "command",
      {
        ...pending,
        command: {
          ...durableIntent,
          ...(password === undefined ? {} : { password }),
        },
        deviceId,
        generation,
      },
      key,
    );
  }
  async function command(
    path: string,
    payload: unknown,
    receiptKey = storageKey,
  ) {
    busy = true;
    commandError = null;
    controls();
    try {
      await api(`/api/towns/${townId}/${path}`, payload);
      await refresh();
      if (path !== "management" && connected)
        sessionStorage.removeItem(receiptKey);
    } catch (error) {
      connected = false;
      commandError = `${error instanceof Error ? error.message : "Connection lost."} Refresh or retry.`;
      status.dataset.quiet = "false";
      status.textContent = commandError;
    } finally {
      busy = false;
      controls();
    }
  }
  const profile = root.querySelector<HTMLFormElement>("[data-guest-profile]");
  if (profile)
    profile.onsubmit = (event) => {
      event.preventDefault();
      const fields = new FormData(profile);
      sendIntent({
        action: "guest-profile",
        name: fields.get("name"),
        grade: fields.get("grade"),
      });
    };
  takeover.onclick = () =>
    void command("management", {
      deviceId,
      generation,
      requestId: crypto.randomUUID(),
    });
  form.onsubmit = (event) => {
    event.preventDefault();
    if (save.disabled) return;
    const motto = String(new FormData(form).get("motto")).trim();
    let pending;
    try {
      pending = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    } catch {}
    if (!pending || pending.motto !== motto)
      pending = { motto, requestId: crypto.randomUUID() };
    pending = { ...pending, deviceId, generation };
    sessionStorage.setItem(storageKey, JSON.stringify(pending));
    void command("preference", pending);
  };
  root.querySelector<HTMLButtonElement>("[data-sync]")!.onclick = () => {
    commandError = null;
    void refresh();
  };
  window.addEventListener(
    "offline",
    () => {
      connected = false;
      status.dataset.quiet = "false";
      status.textContent = "Offline: town changes are disabled.";
      controls();
    },
    { signal: events.signal },
  );
  window.addEventListener("online", () => void refresh(), {
    signal: events.signal,
  });
  const unmountVisit = mountVisit(
    root.querySelector<HTMLElement>("[data-return-summary]")!,
    townId,
    api,
    refresh,
  );
  void refresh();
  const poll = window.setInterval(() => {
    if (!busy && navigator.onLine) void refresh();
  }, 2000);
  return () => {
    clearInterval(poll);
    unmountVisit();
    disposed = true;
    events.abort();
  };
}
