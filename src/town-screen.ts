import { appUrl } from "./app-route";
import { townIcon } from "./town-ui-art";

const resources = {
  blocks: "Blocks",
  parts: "Parts",
  credits: "Credits",
  food: "Food",
};
export function townScreen(townId: string, playtest: boolean) {
  return `<main id="content" class="game-screen">
    <div class="town-view"><iframe title="Your 3D Mars town" src="${appUrl(`/town-prototype.html?town=${encodeURIComponent(townId)}&hud=1`)}"></iframe></div>
    <div class="game-top">
      <button class="level-panel" data-panel="build" aria-label="House level and upgrade progress">
        <span class="level-badge" data-house-level>1</span>
        <span><strong>House level</strong><progress data-level-progress max="1" value="0" aria-label="House upgrade progress"></progress><small data-level-status>Upgrade available</small></span>
      </button>
      <div class="worker-strip" aria-label="Workers and status">
        <button class="worker-counter" data-panel="build"><span aria-hidden="true">${townIcon("workers")}</span><span><strong data-workers>—</strong><small>Workers free</small></span></button>
        <button class="worker-counter" data-panel="build"><span aria-hidden="true">${townIcon("build")}</span><span><strong data-builders>—</strong><small data-builder-status>Builders free</small></span></button>
      </div>
      <div class="resource-strip" aria-label="Town resources">${Object.entries(
        resources,
      )
        .map(
          ([key, label]) =>
            `<div class="resource-pill" aria-label="${label}" title="${label}"><small>${label}</small><strong data-resource="${key}">—</strong><span aria-hidden="true">${townIcon(key)}</span></div>`,
        )
        .join("")}</div>
    </div>
    <div class="game-notices"><p data-network role="status" hidden>Offline</p><button data-manage-here hidden>Manage here</button></div>
    <button class="practice-shortcut hud-square" data-panel="practice" aria-label="Practice"><span aria-hidden="true">${townIcon("practice")}</span><small>Practice</small></button>
    <div class="game-bottom">
      <a class="hud-action battle-action" data-route href="/play/battle"><span aria-hidden="true">${townIcon("battle")}</span>Attack</a>
      <div class="game-actions">
        <div class="utility-actions"><button data-menu class="hud-square" aria-label="Menu">☰</button><button class="hud-square" data-camera aria-pressed="false" aria-label="Switch walking camera">♟</button><button data-panel="settings" class="hud-square" aria-label="Settings">⚙</button></div>
        <button class="hud-action build-action" data-panel="build"><span aria-hidden="true">${townIcon("build")}</span>Build / Inventory</button>
      </div>
    </div>
    ${
      playtest
        ? `<section class="playtest-clock" aria-label="Playtest time controls"><span>Test clock · <output data-test-time>Paused</output></span><div>${[
            [10, "+10s"],
            [600, "+10m"],
            [1800, "+30m"],
            [3600, "+1h"],
            [86400, "+1 day"],
          ]
            .map(
              ([seconds, label]) =>
                `<button data-fast-forward="${seconds}">${label}</button>`,
            )
            .join(
              "",
            )}</div><p data-clock-error role="alert" hidden></p></section>`
        : ""
    }
    <dialog class="game-panel" aria-labelledby="panel-title">
      <div class="panel-heading"><span class="panel-icon" aria-hidden="true">${townIcon("build")}</span><h2 id="panel-title">Buildings & Upgrades</h2><button data-close-panel aria-label="Close panel">×</button></div>
      <nav class="build-tabs" aria-label="Build menu"><button data-build-tab="buildings" aria-pressed="true">Buildings</button><button data-build-tab="inventory" aria-pressed="false">Inventory</button></nav>
      <button data-all-plots hidden>← All plots</button>
      <div id="management" data-panel="build" data-build-tab="buildings"></div>
      <section class="building-inventory" hidden><h3>Building inventory</h3><p>No stored buildings.</p><p>Building storage is not available yet.</p></section>
      <footer class="build-wallet" aria-label="Available resources">${Object.keys(
        resources,
      )
        .map(
          (key) =>
            `<span>${townIcon(key)}<strong data-wallet="${key}">—</strong></span>`,
        )
        .join("")}</footer>
    </dialog>
  </main>`;
}
