type Api = (path: string, data?: unknown) => Promise<any>;
// Each tab gets a separate identity, including tabs sharing the same login cookie.
const deviceId = crypto.randomUUID();
export function mountManagement(root: HTMLElement, townId: string, api: Api) {
  const events = new AbortController();
  let disposed = false;
  let generation = 0;
  let managed = false;
  let busy = true;
  let connected = false;
  root.innerHTML = `<h3>Town management</h3><p data-management-status role="status">Refreshing management…</p><p data-motto></p><button data-takeover disabled>Manage here / take over</button><button data-sync>Refresh management</button><form data-preference><label>Town motto<input name="motto" maxlength="80" required></label><button disabled>Save motto</button></form>`;
  const status = root.querySelector<HTMLElement>("[data-management-status]")!;
  const takeover = root.querySelector<HTMLButtonElement>("[data-takeover]")!;
  const form = root.querySelector<HTMLFormElement>("form")!;
  const save = form.querySelector<HTMLButtonElement>("button")!;
  const storageKey = `town-preference-${townId}`;
  function controls() {
    takeover.disabled = busy || !connected || managed;
    save.disabled = busy || !connected || !managed;
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
      generation = lease.generation;
      managed = lease.deviceId === deviceId;
      connected = navigator.onLine;
      root.querySelector<HTMLElement>("[data-motto]")!.textContent =
        `Town motto: ${state.motto ?? "Not set"}`;
      status.textContent = managed
        ? "You manage this town."
        : "Read only. Choose Manage here to take over.";
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "Connection unavailable.";
    } finally {
      busy = false;
      controls();
    }
  }
  async function command(path: string, payload: unknown) {
    busy = true;
    controls();
    try {
      await api(`/api/towns/${townId}/${path}`, payload);
      if (path === "preference") sessionStorage.removeItem(storageKey);
      await refresh();
    } catch (error) {
      connected = false;
      status.textContent = `${error instanceof Error ? error.message : "Connection lost."} Refresh management before retrying.`;
    } finally {
      busy = false;
      controls();
    }
  }
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
    if (
      !pending ||
      pending.motto !== motto ||
      pending.generation !== generation ||
      pending.deviceId !== deviceId
    )
      pending = { deviceId, generation, motto, requestId: crypto.randomUUID() };
    sessionStorage.setItem(storageKey, JSON.stringify(pending));
    void command("preference", pending);
  };
  root.querySelector<HTMLButtonElement>("[data-sync]")!.onclick = () =>
    void refresh();
  window.addEventListener(
    "offline",
    () => {
      connected = false;
      status.textContent = "Offline: town changes are disabled.";
      controls();
    },
    { signal: events.signal },
  );
  window.addEventListener("online", () => void refresh(), {
    signal: events.signal,
  });
  void refresh();
  return () => {
    disposed = true;
    events.abort();
  };
}
