/** Coarse primary input includes phones/tablets, without enabling touch UI on mouse-first laptops. */
export function isMobileDevice(): boolean {
  return (
    matchMedia("(pointer: coarse)").matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function usesTouchControls(): boolean {
  return isMobileDevice() || innerWidth <= 900;
}

export function installDisplayMode(
  onPortrait: () => void,
  onLandscape: () => void,
) {
  const dialog = document.createElement("dialog");
  dialog.id = "rotate-device";
  dialog.setAttribute("aria-labelledby", "rotate-title");
  dialog.innerHTML = `<div><span aria-hidden="true">↻</span><h1 id="rotate-title">Rotate your device</h1><p>Turn your phone or tablet sideways to play.</p></div>`;
  dialog.addEventListener("cancel", (event) => event.preventDefault());
  document.body.append(dialog);
  let portrait = false;
  const refresh = () => {
    const touch = usesTouchControls();
    document.documentElement.dataset.touchControls = String(touch);
    const tip = document.querySelector(".combat-tip");
    if (tip)
      tip.textContent = touch
        ? "DRAG TO MOVE · TAP MED-GEL TO HEAL · FIRING IS AUTOMATIC"
        : "MOVE: WASD / ARROWS · MED-GEL: Q · FIRING IS AUTOMATIC";
    const next = isMobileDevice() && innerHeight > innerWidth;
    if (next) {
      onPortrait();
      if (!dialog.open) dialog.showModal();
    } else if (portrait) {
      dialog.close();
      onLandscape();
    }
    portrait = next;
  };
  window.addEventListener("resize", refresh);
  screen.orientation?.addEventListener("change", refresh);
  matchMedia("(pointer: coarse)").addEventListener("change", refresh);
  refresh();
  return { refresh };
}
