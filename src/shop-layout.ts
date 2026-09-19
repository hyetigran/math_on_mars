/** Keep each between-wave activity on one screen; page growing inventories. */
let selectedView = "Shop";
let currentMission = "";
const pages = new Map<string, number>();

export function mountShopLayout(mission: string): () => void {
  if (mission !== currentMission) {
    currentMission = mission;
    selectedView = "Shop";
    pages.clear();
  }
  const screen = document.querySelector<HTMLElement>(".shop-screen")!;
  const loadout = screen.querySelector<HTMLElement>(".loadout")!;
  const originalStats =
    loadout.querySelector<HTMLDetailsElement>(":scope > details")!;
  const stats = document.createElement("section");
  const statsHeading = document.createElement("h3");
  statsHeading.textContent = "Marine stats";
  stats.append(statsHeading, originalStats.querySelector("p")!);
  const gear = document.createElement("section");
  gear.append(
    loadout.querySelector(".loadout-heading")!,
    loadout.querySelector(".weapon-dock")!,
  );
  const merge = loadout.querySelector<HTMLElement>(".merge-row");
  if (merge) {
    const detail = merge.querySelector("details")!;
    const content = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = detail.querySelector("summary")!.textContent;
    content.append(
      heading,
      ...Array.from(detail.children).filter(
        (child) => child.tagName !== "SUMMARY",
      ),
    );
    detail.replaceWith(content);
  }
  const views: [string, HTMLElement, string?][] = [
    [
      "Shop",
      screen.querySelector<HTMLElement>(".market-panel")!,
      ".shop-offers",
    ],
    ["Ammo", loadout.querySelector<HTMLElement>(".reserve")!, ".reserve-grid"],
    ["Gear", gear],
    ["Stats", stats],
    ...(merge ? [["Merge", merge, "ul"] as [string, HTMLElement, string]] : []),
  ];
  const body = document.createElement("div");
  body.className = "shop-view-body";
  const pager = document.createElement("div");
  pager.className = "shop-pager";
  const previous = document.createElement("button");
  previous.textContent = "← Previous";
  const status = document.createElement("span");
  status.setAttribute("aria-live", "polite");
  const next = document.createElement("button");
  next.textContent = "Next →";
  for (const button of [previous, next]) {
    button.type = "button";
    button.className = "button secondary";
  }
  pager.append(previous, status, next);
  for (const [label, panel] of views) {
    panel.classList.add("shop-view");
    panel.id = `shop-view-${label.toLowerCase()}`;
    body.append(panel);
  }
  const openView = (label: string) => {
    selectedView = label;
    update();
  };
  const equipment = document.createElement("button");
  equipment.type = "button";
  equipment.className = "button secondary";
  equipment.textContent = "Equipment";
  equipment.onclick = () => openView("Ammo");
  screen.querySelector(".shop-actions > div")!.prepend(equipment);
  for (const [label, panel] of views) {
    if (label === "Shop") continue;
    const actions = document.createElement("div");
    actions.className = "equipment-actions";
    const choices =
      label === "Ammo"
        ? [
            ["Shop", "Back to shop"],
            ["Gear", "Loadout"],
            ["Stats", "Marine stats"],
            ...(merge ? [["Merge", "Merge ammo"]] : []),
          ]
        : [["Ammo", "Back to equipment"]];
    for (const [target, text] of choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button secondary";
      button.textContent = text;
      button.onclick = () => openView(target);
      actions.append(button);
    }
    panel.prepend(actions);
  }
  loadout.remove();
  screen.querySelector(".shop-actions")!.before(body, pager);
  if (!views.some(([label]) => label === selectedView)) selectedView = "Shop";
  let pageCount = 1;
  function update(): void {
    for (const [label, panel, selector] of views) {
      const active = label === selectedView;
      panel.hidden = !active;
      equipment.hidden = selectedView !== "Shop";
      if (!active) continue;
      const list = selector ? panel.querySelector<HTMLElement>(selector) : null;
      const items = list ? (Array.from(list.children) as HTMLElement[]) : [];
      // Short landscape screens use horizontal cards; narrow screens show one.
      const size =
        label === "Merge"
          ? 1
          : body.clientWidth >= 850 && body.clientHeight >= 330
            ? 4
            : body.clientWidth >= 550 && body.clientHeight >= 330
              ? 2
              : 1;
      pageCount = Math.max(1, Math.ceil(items.length / size));
      const page = Math.min(pages.get(label) ?? 0, pageCount - 1);
      pages.set(label, page);
      list?.style.setProperty("--shop-columns", String(size));
      items.forEach((item, i) => {
        item.hidden = i < page * size || i >= (page + 1) * size;
      });
      previous.disabled = page === 0;
      next.disabled = page === pageCount - 1;
      status.textContent = items.length
        ? `${page * size + 1}–${Math.min((page + 1) * size, items.length)} of ${items.length}`
        : "";
      pager.hidden = pageCount === 1;
    }
  }
  previous.onclick = () => {
    pages.set(selectedView, Math.max(0, (pages.get(selectedView) ?? 0) - 1));
    update();
  };
  next.onclick = () => {
    pages.set(
      selectedView,
      Math.min(pageCount - 1, (pages.get(selectedView) ?? 0) + 1),
    );
    update();
  };
  const observer = new ResizeObserver(update);
  observer.observe(body);
  update();
  return () => observer.disconnect();
}
