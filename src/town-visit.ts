type Api = (path: string, data?: unknown) => Promise<any>;
export function mountVisit(
  root: HTMLElement,
  townId: string,
  api: Api,
  refresh: () => Promise<void>,
) {
  const events = new AbortController();
  const path = `/api/towns/${townId}/visit`;
  let pendingId: string | null = null;
  let activeId: string | null = null,
    disposed = false,
    opening = false;
  function visible() {
    return (
      !disposed && navigator.onLine && document.visibilityState === "visible"
    );
  }
  function leave(id = activeId) {
    activeId = null;
    pendingId = null;
    if (!id) return;
    void fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "leave", visitId: id }),
      keepalive: true,
    }).catch(() => {});
  }
  async function open() {
    if (!visible() || opening || activeId) return;
    opening = true;
    const id = pendingId ?? crypto.randomUUID();
    pendingId = id;
    activeId = id;
    try {
      const summary = await api(path, { event: "open", visitId: id });
      if (!visible() || activeId !== id) {
        leave(id);
        return;
      }
      pendingId = null;
      root.textContent = `Since your last town visit: ${summary.completedJobs} projects finished, ${summary.harvested} portions harvested, ${summary.meals} stored-food meals served and ${summary.emergencyMeals} emergency meals supplied. Food simulation: ${(summary.simulatedMs / 3600000).toFixed(1)} hours. ${summary.capped ? "Production and consumption paused after 48 hours; both resume now. Construction could finish throughout the absence." : "Production and consumption reconciled once."} ${summary.pauses.join(". ")}. Residents remain safe; assign workers or restore utilities to resume paused growing.`;
      await refresh();
    } catch {
      if (activeId === id) activeId = null;
      root.textContent = "Connect to reconcile your town visit.";
    } finally {
      opening = false;
    }
  }
  async function heartbeat() {
    if (!visible()) return;
    if (!activeId) {
      await open();
      return;
    }
    const id = activeId;
    try {
      await api(path, { event: "heartbeat", visitId: id });
    } catch {
      if (activeId === id) {
        activeId = null;
        await open();
      }
    }
  }
  document.addEventListener(
    "visibilitychange",
    () => {
      if (visible()) void open();
      else leave();
    },
    { signal: events.signal },
  );
  window.addEventListener("pagehide", () => leave(), { signal: events.signal });
  window.addEventListener("offline", () => leave(), { signal: events.signal });
  window.addEventListener("online", () => void open(), {
    signal: events.signal,
  });
  const timer = window.setInterval(() => void heartbeat(), 15000);
  void open();
  return () => {
    disposed = true;
    events.abort();
    clearInterval(timer);
    leave();
  };
}
