import { appUrl, currentRoute } from "./app-route";
import { mountTownHud } from "./town-hud";
import {
  api,
  escapeHtml as esc,
  openParentSignIn,
  pendingRequest,
  type Access,
  type Cadet,
} from "./town-access";
import "./town-app.css";
const root = document.querySelector<HTMLElement>("#town-app")!;
let access: Access = { parent: null, cadets: [], guest: null };
let active: Cadet | null = null;
let dispose: (() => void) | undefined;
let navigation = 0;
const route = currentRoute;
function go(path: string) {
  history.pushState(null, "", appUrl(path));
  void render();
}
function parentAction() {
  if (access.parent) go("/parents");
  else openParentSignIn(() => void render());
}
function header() {
  return `<header class="site-header"><a class="brand" href="/" data-route aria-label="Math on Mars home"><span class="planet" aria-hidden="true">✦</span> math<span>on</span>mars</a><nav aria-label="Main navigation">${`<button data-parent>${access.parent ? "Parent account" : "Parent sign in"}</button>`}</nav></header>`;
}
function bindNavigation() {
  root.querySelectorAll<HTMLAnchorElement>("[data-route]").forEach((a) => {
    const path = a.getAttribute("href")!;
    a.href = appUrl(path);
    a.onclick = (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      go(path);
    };
  });
  root
    .querySelectorAll<HTMLButtonElement>("[data-parent]")
    .forEach((b) => (b.onclick = parentAction));
  root
    .querySelector<HTMLButtonElement>("[data-menu]")
    ?.addEventListener("click", openMenu);
}
function openMenu() {
  const dialog = document.createElement("dialog");
  dialog.className = "town-dialog";
  dialog.setAttribute("aria-labelledby", "menu-title");
  dialog.innerHTML = `<button class="dialog-close" aria-label="Close menu">×</button><h2 id="menu-title">Menu</h2><div class="menu-links"><button data-parent>${access.parent ? "Parent dashboard" : "Parent sign in"}</button><button data-home>Home</button></div>`;
  document.body.append(dialog);
  dialog.querySelector<HTMLButtonElement>(".dialog-close")!.onclick = () =>
    dialog.close();
  dialog.querySelector<HTMLButtonElement>("[data-parent]")!.onclick = () => {
    dialog.close();
    parentAction();
  };
  dialog.querySelector<HTMLButtonElement>("[data-home]")!.onclick = () => {
    dialog.close();
    go("/");
  };
  dialog.onclose = () => dialog.remove();
  dialog.showModal();
}
function landing() {
  root.innerHTML = `${header()}<main id="content" class="landing"><section class="hero-copy"><h1>Build a town<br>on Mars.</h1><p class="intro">Grow food. Practice math to speed up construction.</p><a class="primary play-cta" href="/play" data-route>Play <span aria-hidden="true">↗</span></a><p class="hint">No sign-in required.</p></section><section class="hero-world" aria-label="Illustration of a town on Mars"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="moon"></div><div class="town-island"><div class="village"><i class="tree tree-one"></i><i class="tree tree-two"></i><i class="house house-one"><b></b></i><i class="house house-two"><b></b></i><i class="house house-three"><b></b></i><i class="glasshouse"></i><div class="town-path"></div><i class="garden"></i></div></div></section></main>`;
}
async function loadPlay(turn: number) {
  const selected =
    new URLSearchParams(location.search).get("cadet") ??
    localStorage.getItem("town-active-cadet");
  const available = [...access.cadets, ...(access.guest ? [access.guest] : [])];
  active =
    available.find((c) => c.id === selected) ??
    access.guest ??
    access.cadets[0] ??
    null;
  if (!active) {
    // Serialize first launch across browser tabs so they share one guest cookie.
    const ensureGuest = async () => api("/api/guest", {});
    active = navigator.locks
      ? await navigator.locks.request("mars-guest-start", ensureGuest)
      : await ensureGuest();
    access.guest = active;
  }
  if (turn !== navigation) return;
  localStorage.setItem("town-active-cadet", active!.id);
  root.innerHTML = `<main id="content" class="game-screen"><div class="town-view"><iframe title="Your 3D Mars town" src="${appUrl(`/town-prototype.html?town=${active!.id}&hud=1`)}"></iframe></div><div class="game-top"><div class="game-tools"><button data-menu class="hud-square" aria-label="Menu">☰</button><button data-panel="settings" class="hud-square" aria-label="Settings">⚙</button></div><div class="resource-strip" aria-label="Town resources">${[
    ["blocks", "▰", "Blocks"],
    ["parts", "⚙", "Parts"],
    ["credits", "✦", "Credits"],
    ["food", "❧", "Food"],
  ]
    .map(
      ([key, icon, label]) =>
        `<div class="resource-pill" aria-label="${label}" title="${label}"><span aria-hidden="true">${icon}</span><strong data-resource="${key}">—</strong><small>${label}</small></div>`,
    )
    .join(
      "",
    )}</div></div><div class="game-notices"><p data-network role="status" hidden>Offline</p><button data-manage-here hidden>Manage here</button></div><div class="game-bottom"><a class="hud-action battle-action" data-route href="/play/battle"><span aria-hidden="true">⚔</span>Battle</a><div class="game-actions"><button class="hud-action" data-panel="practice"><span aria-hidden="true">✧</span>Practice</button><button class="hud-action build-action" data-panel="build"><span aria-hidden="true">▰</span>Build <small data-builders>—</small></button></div></div><button class="camera-toggle" data-camera aria-pressed="false">♟ Walk</button><dialog class="game-panel" aria-labelledby="panel-title"><div class="panel-heading"><h2 id="panel-title">Build</h2><button data-close-panel aria-label="Close panel">×</button></div><button data-all-plots hidden>← All plots</button><div id="management" data-panel="build"></div></dialog></main>`;
  dispose = mountTownHud(
    root,
    active!.id,
    api,
    active!.id === access.guest?.id,
  );
}
function parents() {
  root.innerHTML = `${header()}<main id="content" class="parent-page"><h1>Parents</h1>${access.parent ? `<p>Signed in as <strong>${esc(access.parent.username)}</strong>.</p><button data-logout>Sign out</button>${access.guest ? `<section class="card"><h2>Link guest town</h2><p>Add ${esc(access.guest.name)} as a new cadet. Existing cadets are unchanged.</p><button class="primary" data-link>Link town</button></section>` : ""}<section class="card"><h2>Your cadets</h2><div class="cadet-list">${access.cadets.map((c) => `<a data-route href="/play?cadet=${c.id}">${esc(c.name)} <span>Open town ↗</span></a>`).join("") || "<p>No cadets.</p>"}</div><form data-create><label>New cadet name<input name="name" maxlength="40" required></label><button>Create cadet town</button></form></section>` : `<p>Sign in to manage cadets.</p><div class="actions"><button class="primary" data-parent>Parent sign in</button><a data-route href="/play">Play ↗</a></div>`}<p role="alert" data-error></p></main>`;
  root.querySelector<HTMLButtonElement>("[data-logout]")?.addEventListener(
    "click",
    () =>
      void action(async () => {
        await api("/api/logout", {});
        active = null;
        await render();
      }),
  );
  root.querySelector<HTMLButtonElement>("[data-link]")?.addEventListener(
    "click",
    () =>
      void action(async () => {
        const key = `town-link-${access.parent!.username}-${access.guest!.id}`;
        const linked = await api("/api/guest/link", {
          requestId: pendingRequest(key),
        });
        localStorage.setItem("town-active-cadet", linked.id);
        sessionStorage.removeItem(key);
        await render();
      }),
  );
  const form = root.querySelector<HTMLFormElement>("[data-create]");
  if (form)
    form.onsubmit = (event) => {
      event.preventDefault();
      const name = String(new FormData(form).get("name")).trim();
      void action(async () => {
        const key = `town-create-${access.parent!.username}-${name}`;
        const cadet = await api("/api/cadets", {
          name,
          requestId: pendingRequest(key),
        });
        sessionStorage.removeItem(key);
        go(`/play?cadet=${cadet.id}`);
      });
    };
}
let working = false;
async function action(work: () => Promise<void>) {
  if (working) return;
  working = true;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>("button")];
  buttons.forEach((b) => (b.disabled = true));
  try {
    await work();
  } catch (error) {
    const message = root.querySelector<HTMLElement>("[data-error]");
    if (message)
      message.textContent =
        error instanceof Error ? error.message : "Please try again.";
  } finally {
    working = false;
    buttons.forEach((b) => (b.disabled = false));
  }
}
async function render() {
  const turn = ++navigation;
  dispose?.();
  dispose = undefined;
  const current = route();
  // The landing page and battle entry remain usable even if the town API is down.
  if (current === "/") {
    landing();
    bindNavigation();
  } else if (current === "/play")
    root.innerHTML = `<main id="content" class="game-loading"><p role="status">Loading town…</p></main>`;
  else
    root.innerHTML = `${header()}<main id="content" class="parent-page"><p role="status">Loading…</p></main>`;
  try {
    if (current !== "/play/battle") access = await api("/api/access");
    if (turn !== navigation) return;
    if (current === "/") landing();
    else if (current === "/play") await loadPlay(turn);
    else if (current === "/parents") parents();
    else if (current === "/play/battle")
      root.innerHTML = `<header class="battle-header"><a data-route href="/play">← Return to town</a><span>Battle</span></header><main id="content" class="battle-view"><iframe title="Math on Mars battle" src="${appUrl("/battle.html?townBattle=1")}"></iframe></main>`;
    else
      root.innerHTML = `${header()}<main id="content" class="parent-page"><h1>Page not found</h1><a data-route href="/">Home</a></main>`;
    if (turn !== navigation) return;
    bindNavigation();
  } catch (error) {
    if (turn !== navigation || current === "/") return;
    root.innerHTML = `${header()}<main id="content" class="parent-page"><h1>Connection error</h1><p role="alert">${esc(error instanceof Error ? error.message : "Please try again.")}</p><button data-retry>Try again</button> <a data-route href="/">Home</a></main>`;
    root.querySelector<HTMLButtonElement>("[data-retry]")!.onclick = () =>
      void render();
    bindNavigation();
  }
}
window.addEventListener("popstate", () => void render());
window.addEventListener("message", (event) => {
  if (
    event.origin === location.origin &&
    event.source ===
      root.querySelector<HTMLIFrameElement>(".battle-view iframe")
        ?.contentWindow &&
    event.data?.type === "return-to-town"
  )
    go("/play");
});
void render();
