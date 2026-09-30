import { appUrl } from "./app-route";
if (!new URLSearchParams(location.search).has("legacy"))
  location.replace(appUrl("/"));
import { mountManagement } from "./town-management";
import "./connected-town.css";
const root = document.querySelector<HTMLElement>("#connected")!;
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
let notice = "",
  busy = false,
  cadets: { id: string; name: string }[] | null = null;
let active: { id: string; name: string } | null = null;
async function api(path: string, data?: unknown) {
  const response = await fetch(path, {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      cadets = null;
      active = null;
    }
    throw Error(result.error ?? "Request failed");
  }
  return result;
}
async function act(action: () => Promise<void>) {
  busy = true;
  notice = "Connecting…";
  render();
  try {
    await action();
    notice = "";
  } catch (e) {
    notice =
      e instanceof Error
        ? e.message
        : "Connection unavailable. Retry when connected.";
  } finally {
    busy = false;
    render();
  }
}
async function refresh() {
  cadets = await api("/api/cadets");
}
let unmountManagement: (() => void) | undefined;
function render() {
  unmountManagement?.();
  root.innerHTML = `<header><h1>Your Mars town</h1><p>Connected town preview · Town progress is separate from battle profiles.</p></header><p role="status">${escape(notice)}</p>${cadets === null ? `<section><h2>Parent sign-in</h2><p>Choose a parent username and a password of at least 12 characters. Cadets do not need email accounts.</p><form id="auth"><label>Parent username<input name="username" autocomplete="username" minlength="3" maxlength="40" required></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="12" maxlength="128" required></label><button name="action" value="login" ${busy ? "disabled" : ""}>Sign in</button><button name="action" value="register" ${busy ? "disabled" : ""}>Create parent account</button></form></section>` : `<section><div class="row"><h2>Choose a cadet</h2><button id="logout" ${busy ? "disabled" : ""}>Sign out</button><button id="refresh" ${busy ? "disabled" : ""}>Refresh connection</button></div><div class="row">${cadets.map((c) => `<button data-cadet="${c.id}" aria-pressed="${active?.id === c.id}" ${busy ? "disabled" : ""}>${escape(c.name)}</button>`).join("")}</div><form id="create"><label>New cadet name<input name="name" maxlength="40" required></label><button ${busy ? "disabled" : ""}>Create cadet town</button></form></section>${active ? `<h2>${escape(active.name)}’s town</h2><button id="close-town">Back to cadets</button><section id="management"></section><iframe title="${escape(active.name)}'s 3D town" src="./town-prototype.html?town=${active.id}"></iframe>` : "<p>Select or create a cadet to load a saved town.</p>"}`}`;
  if (active && cadets !== null)
    unmountManagement = mountManagement(
      root.querySelector<HTMLElement>("#management")!,
      active.id,
      api,
    );
  const closeTown = root.querySelector<HTMLButtonElement>("#close-town");
  if (closeTown)
    closeTown.onclick = () => {
      active = null;
      render();
    };
  const auth = root.querySelector<HTMLFormElement>("#auth");
  if (auth)
    auth.onsubmit = (e) => {
      e.preventDefault();
      const data = new FormData(auth),
        action = (e.submitter as HTMLButtonElement)?.value ?? "login";
      void act(async () => {
        await api("/api/" + action, {
          username: data.get("username"),
          password: data.get("password"),
        });
        await refresh();
      });
    };
  const create = root.querySelector<HTMLFormElement>("#create");
  if (create)
    create.onsubmit = (e) => {
      e.preventDefault();
      const name = String(new FormData(create).get("name")).trim();
      let pending: { name: string; requestId: string } | null = null;
      try {
        pending = JSON.parse(
          sessionStorage.getItem("town-pending-cadet") ?? "null",
        );
      } catch {}
      if (!pending || pending.name !== name)
        pending = { name, requestId: crypto.randomUUID() };
      sessionStorage.setItem("town-pending-cadet", JSON.stringify(pending));
      const payload = pending;
      void act(async () => {
        active = await api("/api/cadets", payload);
        await refresh();
        sessionStorage.removeItem("town-pending-cadet");
      });
    };
  root.querySelectorAll<HTMLButtonElement>("[data-cadet]").forEach(
    (b) =>
      (b.onclick = () => {
        active = cadets!.find((c) => c.id === b.dataset.cadet)!;
        render();
      }),
  );
  const logout = root.querySelector<HTMLButtonElement>("#logout");
  if (logout)
    logout.onclick = () =>
      void act(async () => {
        await api("/api/logout", {});
        cadets = null;
        active = null;
      });
  const refreshButton = root.querySelector<HTMLButtonElement>("#refresh");
  if (refreshButton) refreshButton.onclick = () => void act(refresh);
}
window.addEventListener("online", () => {
  busy = false;
  notice = "Connection restored. Refresh before continuing.";
  render();
});
window.addEventListener("offline", () => {
  notice = "Offline: town changes require a connection.";
  busy = true;
  render();
});
void act(refresh);
