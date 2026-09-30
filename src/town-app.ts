import { mountManagement } from "./town-management";
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
const route = () => location.pathname.replace(/\/+$/, "") || "/";
function go(path: string) {
  history.pushState(null, "", path);
  void render();
}
function parentAction() {
  if (access.parent) go("/parents");
  else openParentSignIn(() => void render());
}
function header(base = false) {
  return `<header class="site-header"><a class="brand" href="/" data-route aria-label="Math on Mars home"><span class="planet" aria-hidden="true">✦</span> math<span>on</span>mars</a><nav aria-label="Main navigation">${base ? '<a data-route href="/play/battle">Battle</a><button data-menu>Menu</button>' : `<button data-parent>${access.parent ? "Parent account" : "Parent sign in"}</button>`}</nav></header>`;
}
function bindNavigation() {
  root.querySelectorAll<HTMLAnchorElement>("[data-route]").forEach(
    (a) =>
      (a.onclick = (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        go(a.getAttribute("href")!);
      }),
  );
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
  dialog.innerHTML = `<button class="dialog-close" aria-label="Close menu">×</button><p class="eyebrow">Take a breather</p><h2 id="menu-title">Your little world.</h2><p>${access.guest?.id === active?.id ? "This town is remembered in this browser. A parent can link it to an account to keep it across devices." : "Your town is saved to your parent account."}</p><div class="menu-links"><button data-parent>${access.parent ? "Parent dashboard" : "Parent sign in"}</button><button data-home>Back to landing page</button></div>`;
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
  root.innerHTML = `${header()}<main id="content" class="landing"><section class="hero-copy"><p class="eyebrow"><span class="live-dot"></span> A new home. A whole world to grow.</p><h1>Big dreams.<br>Little town.<br><em>All yours.</em></h1><p class="intro">Make yourself at home on Mars. Build a cozy town, grow something good, and let a little learning take you a long way.</p><a class="primary play-cta" href="/play" data-route>Play <span aria-hidden="true">↗</span></a><p class="hint">Jump right in. No sign-in needed.</p></section><section class="hero-world" aria-label="Illustration of a cozy town on Mars"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="moon"></div><div class="town-island"><div class="village"><i class="tree tree-one"></i><i class="tree tree-two"></i><i class="house house-one"><b></b></i><i class="house house-two"><b></b></i><i class="house house-three"><b></b></i><i class="glasshouse"></i><div class="town-path"></div><i class="garden"></i></div></div><div class="world-caption"><span class="live-dot"></span> A little world of possibility</div><span class="world-coordinates" aria-hidden="true">MARS · YOUR NEXT CHAPTER</span></section><section class="possibilities" aria-label="Ways to play"><article><span>01 / Make it yours</span><h2>From the first brick.</h2><p>Start small. Build and upgrade a place to call home.</p></article><article><span>02 / Watch it grow</span><h2>A town with a rhythm.</h2><p>Plant crops, put your colonists to work, and return to new progress.</p></article><article><span>03 / Find your spark</span><h2>Small lessons. Big steps.</h2><p>Practice math to help your building projects along.</p></article></section></main><footer>Math on Mars <span>A little curiosity goes a long way.</span></footer>`;
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
  root.innerHTML = `${header(true)}<main id="content" class="base-layout"><section class="town-view"><div class="town-title"><p class="eyebrow">Welcome home</p><h1>Your Mars town</h1></div><iframe title="Your 3D Mars town" src="/town-prototype.html?town=${active!.id}"></iframe></section><aside class="town-panel" aria-label="Build and grow"><h2>Build & grow</h2><p class="hint">A little progress, every time you visit.</p><div id="management"></div></aside></main>`;
  dispose = mountManagement(
    root.querySelector<HTMLElement>("#management")!,
    active!.id,
    api,
    { guest: active!.id === access.guest?.id, autoManage: true },
  );
}
function parents() {
  root.innerHTML = `${header()}<main id="content" class="parent-page"><p class="eyebrow">The grown-up corner</p><h1>A little support.<br>A world of discovery.</h1>${access.parent ? `<p>Signed in as <strong>${esc(access.parent.username)}</strong>.</p><button data-logout>Sign out</button>${access.guest ? `<section class="card"><h2>Keep this town.</h2><p>Link ${esc(access.guest.name)}’s guest town as a new cadet. Your existing cadets stay as they are.</p><button class="primary" data-link>Save this town to my account</button></section>` : ""}<section class="card"><h2>Your cadets</h2><div class="cadet-list">${access.cadets.map((c) => `<a data-route href="/play?cadet=${c.id}">${esc(c.name)} <span>Open town ↗</span></a>`).join("") || "<p>No linked towns yet. You can start playing or create a cadet below.</p>"}</div><form data-create><label>New cadet name<input name="name" maxlength="40" required></label><button>Create cadet town</button></form></section>` : `<p>Sign in to save a town across devices and manage your cadets’ practice topics.</p><div class="actions"><button class="primary" data-parent>Parent sign in</button><a data-route href="/play">Keep playing ↗</a></div>`}<p role="alert" data-error></p></main>`;
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
  } else
    root.innerHTML = `${header()}<main id="content" class="parent-page"><p role="status">Opening your world…</p></main>`;
  try {
    if (current !== "/play/battle") access = await api("/api/access");
    if (turn !== navigation) return;
    if (current === "/") landing();
    else if (current === "/play") await loadPlay(turn);
    else if (current === "/parents") parents();
    else if (current === "/play/battle")
      root.innerHTML = `<header class="battle-header"><a data-route href="/play">← Return to town</a><span>Battle</span></header><main id="content" class="battle-view"><iframe title="Math on Mars battle" src="/battle.html?townBattle=1"></iframe></main>`;
    else
      root.innerHTML = `${header()}<main id="content" class="parent-page"><h1>A little off the map.</h1><a data-route href="/">Back home</a></main>`;
    if (turn !== navigation) return;
    bindNavigation();
  } catch (error) {
    if (turn !== navigation || current === "/") return;
    root.innerHTML = `${header()}<main id="content" class="parent-page"><h1>Let’s reconnect.</h1><p role="alert">${esc(error instanceof Error ? error.message : "Please try again.")}</p><button data-retry>Try again</button> <a data-route href="/">Back home</a></main>`;
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
