import type { Ammo } from "./types";

/** A stack may be dropped onto itself when it contains a second matching copy. */
export function matchingMergePair(
  ammo: Ammo[],
  sourceId: string,
  targetId: string,
): [string, string] | null {
  const source = ammo.find((item) => item.id === sourceId);
  const target =
    sourceId === targetId
      ? ammo.find(
          (item) =>
            item.id !== sourceId &&
            item.type === source?.type &&
            item.tier === source?.tier &&
            !item.legendary,
        )
      : ammo.find((item) => item.id === targetId);
  return source &&
    target &&
    !source.legendary &&
    !target.legendary &&
    source.tier < 4 &&
    source.type === target.type &&
    source.tier === target.tier
    ? [source.id, target.id]
    : null;
}

export function bindAmmoDragging(
  root: HTMLElement,
  ammo: Ammo[],
  merge: (pair: [string, string]) => void,
): void {
  let gesture: {
    id: number;
    x: number;
    y: number;
    source: HTMLElement;
    dragging: boolean;
  } | null = null;
  let suppressClick = false;
  const clear = () => {
    root
      .querySelectorAll(".merge-target, .ammo-dragging")
      .forEach((el) => el.classList.remove("merge-target", "ammo-dragging"));
    gesture = null;
  };
  root.addEventListener("pointerdown", (event) => {
    const source = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-ammo-id]",
    );
    if (!source || event.button !== 0 || gesture) return;
    gesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      source,
      dragging: false,
    };
  });
  root.addEventListener("pointermove", (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (
      !gesture.dragging &&
      Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 8
    )
      return;
    gesture.dragging = true;
    root.setPointerCapture(event.pointerId);
    gesture.source.classList.add("ammo-dragging");
    root
      .querySelectorAll<HTMLElement>("[data-ammo-id]")
      .forEach((el) =>
        el.classList.toggle(
          "merge-target",
          !!matchingMergePair(
            ammo,
            gesture!.source.dataset.ammoId!,
            el.dataset.ammoId!,
          ),
        ),
      );
  });
  root.addEventListener("pointerup", (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-ammo-id]");
    const pair =
      gesture.dragging && target && root.contains(target)
        ? matchingMergePair(
            ammo,
            gesture.source.dataset.ammoId!,
            target.dataset.ammoId!,
          )
        : null;
    const dragged = gesture.dragging;
    if (root.hasPointerCapture(event.pointerId))
      root.releasePointerCapture(event.pointerId);
    if (dragged) {
      suppressClick = true;
      setTimeout(() => {
        suppressClick = false;
      }, 0);
    }
    clear();
    if (pair) merge(pair);
  });
  root.addEventListener("pointercancel", clear);
  root.addEventListener("lostpointercapture", clear);
  root.addEventListener(
    "click",
    (event) => {
      if (suppressClick) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
}
