import { campBackgroundUrl } from "./assets/campAssets";
import {
  CAMP_WIDTH,
  CAMP_HEIGHT,
  CAMP_SPAWN,
  CAMP_PORTAL,
  type Point,
  type CampBoundaries,
} from "./camp-world";
import {
  BOUNDARIES_KEY,
  defaultBoundaries,
  loadBoundaries,
  validateBoundaries,
} from "./camp-boundaries";
import "./camp-boundary-editor.css";

export interface BoundaryEditorOptions {
  name: string;
  saveLabel?: string;
  width: number;
  height: number;
  image: string;
  key: string;
  markers: [Point, string][];
  defaults: () => CampBoundaries;
  load: () => CampBoundaries | undefined;
  validate: (value: unknown) => string | null;
}
export function openBoundaryEditor(
  onClose: (saved: boolean) => void,
  config?: BoundaryEditorOptions,
): void {
  const name = config?.name ?? "camp";
  const width = config?.width ?? CAMP_WIDTH,
    height = config?.height ?? CAMP_HEIGHT;
  const image = config?.image ?? campBackgroundUrl;
  const key = config?.key ?? BOUNDARIES_KEY;
  const defaults = config?.defaults ?? defaultBoundaries;
  const load = config?.load ?? loadBoundaries;
  const validate = config?.validate ?? validateBoundaries;
  const markers: [Point, string][] = config?.markers ?? [
    [CAMP_SPAWN, "Spawn"],
    [CAMP_PORTAL, "Portal"],
  ];
  let layout = load() ?? defaults();
  let selected = -1;
  let vertex = -1;
  let drawing: Point[] | null = null;
  let drawKind: "outline" | "blocked" = "outline";
  let drag: number | null = null;
  let saved = false;
  const history: string[] = [];
  const dialog = document.createElement("dialog");
  dialog.className = "boundary-editor";
  dialog.setAttribute("aria-labelledby", "boundary-title");
  dialog.innerHTML = `<header><div><h1 id="boundary-title">Draw ${name} boundaries</h1><p>Green = walkable area. Red = blocked scenery. Boundaries follow the marine’s feet.</p></div><button data-action="close">Cancel</button></header>
    <div class="boundary-tools">
      <label>Selected shape <select aria-label="Selected shape"></select></label>
      <button data-action="outline">Draw outer boundary</button><button data-action="blocked">Draw blocked area</button>
      <button data-action="finish">Finish shape</button><button data-action="undo">Undo</button>
      <button data-action="vertex">Delete corner</button><button data-action="remove">Delete blocked area</button>
    </div>
    <p class="boundary-instructions">Click to select a corner, then drag it. Double-click an edge to add a corner. Use the draw buttons to trace a new shape point by point.</p>
    <div class="boundary-image"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${name} boundary drawing canvas"></svg></div>
    <p class="boundary-message" role="status"></p>
    <footer><div><button data-action="reset">Restore defaults</button><button data-action="export">Export JSON</button><button data-action="import">Import JSON</button><input type="file" accept="application/json,.json" hidden></div><div><small>Saved in this browser. Export a copy to keep or share.</small><button data-action="save">${config?.saveLabel ?? `Save & test in ${name}`}</button></div></footer>`;
  document.body.append(dialog);
  const svg = dialog.querySelector("svg")!;
  const select = dialog.querySelector("select")!;
  const message = dialog.querySelector<HTMLElement>(".boundary-message")!;
  const signal = new AbortController();
  const shape = () =>
    selected === -1 ? layout.outline : layout.blocked[selected];
  const checkpoint = () => {
    history.push(JSON.stringify({ layout, selected, drawing, drawKind }));
    if (history.length > 100) history.shift();
  };
  const status = (text: string) => {
    message.textContent = text;
  };
  const render = () => {
    select.innerHTML =
      `<option value="-1">Walkable boundary</option>` +
      layout.blocked
        .map((_, i) => `<option value="${i}">Blocked area ${i + 1}</option>`)
        .join("");
    select.value = String(selected);
    select.disabled = drawing !== null;
    const path = (points: Point[]) =>
      points.map((p) => `${p.x},${p.y}`).join(" ");
    svg.innerHTML = `<image href="${image}" width="${width}" height="${height}"/>
      ${[layout.outline, ...layout.blocked].map((p, i) => `<polygon points="${path(p)}" fill="${i === 0 ? "#39e6a5" : "#ff566b"}" fill-opacity="${i === 0 ? 0.1 : 0.27}" stroke="${i === 0 ? "#59ffbd" : "#ff7889"}" stroke-width="${selected === i - 1 ? 4 : 2}" vector-effect="non-scaling-stroke" data-shape="${i - 1}"/>`).join("")}
      ${drawing ? `<polyline points="${path(drawing)}" fill="none" stroke="#ffe783" stroke-width="3" vector-effect="non-scaling-stroke"/>` : ""}
      ${(drawing ?? shape()).map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="${vertex === i ? 8 : 6}" fill="${drawing ? "#ffe783" : vertex === i ? "#fff" : "#142937"}" stroke="#fff" stroke-width="2" data-vertex="${i}"/>`).join("")}
      ${markers
        .map(([p, label]) => {
          const point = p as Point;
          return `<g pointer-events="none"><circle cx="${point.x}" cy="${point.y}" r="9" fill="#fff" stroke="#182333" stroke-width="3"/><text x="${point.x + 16}" y="${point.y + 6}" fill="white" stroke="#14202c" stroke-width="4" paint-order="stroke" font-size="22">${label}</text></g>`;
        })
        .join("")}`;
    for (const name of [
      "outline",
      "blocked",
      "remove",
      "vertex",
      "save",
      "export",
      "import",
      "reset",
    ])
      dialog.querySelector<HTMLButtonElement>(
        `[data-action="${name}"]`,
      )!.disabled =
        drawing !== null ||
        (name === "remove" && selected < 0) ||
        (name === "vertex" && (vertex < 0 || shape().length <= 3));
    dialog.querySelector<HTMLButtonElement>(
      '[data-action="finish"]',
    )!.disabled = !drawing || drawing.length < 3;
    dialog.querySelector<HTMLButtonElement>('[data-action="undo"]')!.disabled =
      !history.length;
  };
  const pointAt = (event: PointerEvent | MouseEvent): Point => {
    const matrix = svg.getScreenCTM()!;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    return {
      x: Math.round(Math.max(0, Math.min(width, point.x))),
      y: Math.round(Math.max(0, Math.min(height, point.y))),
    };
  };
  svg.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || drag !== null) return;
    const target = event.target as SVGElement;
    if (drawing) {
      checkpoint();
      drawing.push(pointAt(event));
      render();
      return;
    }
    if (target.hasAttribute("data-vertex")) {
      checkpoint();
      vertex = Number(target.getAttribute("data-vertex"));
      drag = event.pointerId;
      svg.setPointerCapture(event.pointerId);
      render();
    } else if (target.hasAttribute("data-shape")) {
      selected = Number(target.getAttribute("data-shape"));
      vertex = -1;
      render();
    }
  });
  svg.addEventListener("pointermove", (event) => {
    if (drag !== event.pointerId) return;
    shape()[vertex] = pointAt(event);
    render();
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    svg.addEventListener(name, () => {
      drag = null;
    });
  svg.addEventListener("dblclick", (event) => {
    if (drawing) return;
    const p = pointAt(event),
      polygon = shape();
    let best = -1,
      distance = Infinity;
    polygon.forEach((a, i) => {
      const b = polygon[(i + 1) % polygon.length];
      const t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) /
            ((b.x - a.x) ** 2 + (b.y - a.y) ** 2),
        ),
      );
      const d = Math.hypot(
        p.x - a.x - t * (b.x - a.x),
        p.y - a.y - t * (b.y - a.y),
      );
      if (d < distance) {
        distance = d;
        best = i;
      }
    });
    if (distance > 20) return;
    checkpoint();
    polygon.splice(best + 1, 0, p);
    vertex = best + 1;
    render();
  });
  select.addEventListener("change", () => {
    selected = Number(select.value);
    vertex = -1;
    render();
  });
  dialog.addEventListener("click", (event) => {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-action]",
    )?.dataset.action;
    if (!action) return;
    if (action === "close") {
      dialog.close();
      return;
    }
    if (action === "outline" || action === "blocked") {
      checkpoint();
      drawKind = action;
      drawing = [];
      vertex = -1;
      status(
        "Click around the shape, then choose Finish shape. Undo removes the last point.",
      );
    }
    if (action === "finish" && drawing && drawing.length >= 3) {
      checkpoint();
      if (drawKind === "outline") {
        layout.outline = drawing;
        selected = -1;
      } else {
        layout.blocked.push(drawing);
        selected = layout.blocked.length - 1;
      }
      drawing = null;
      vertex = -1;
      status(
        "Shape finished. Drag corners to refine it, or save to test walking.",
      );
    }
    if (action === "undo" && history.length) {
      const previous = JSON.parse(history.pop()!);
      layout = previous.layout;
      selected = previous.selected;
      drawing = previous.drawing;
      drawKind = previous.drawKind;
      vertex = -1;
      status("Undone.");
    }
    if (action === "vertex" && vertex >= 0 && shape().length > 3) {
      checkpoint();
      shape().splice(vertex, 1);
      vertex = -1;
    }
    if (action === "remove" && selected >= 0) {
      checkpoint();
      layout.blocked.splice(selected, 1);
      selected = -1;
      vertex = -1;
    }
    if (action === "reset") {
      checkpoint();
      layout = defaults();
      selected = -1;
      vertex = -1;
      status(
        "Defaults restored in the editor. Save to apply, or Undo to recover your drawing.",
      );
    }
    if (action === "save" || action === "export") {
      const error = validate(layout);
      if (error) {
        status(error);
        return;
      }
      if (action === "save") {
        try {
          localStorage.setItem(key, JSON.stringify(layout));
          saved = true;
          dialog.close();
        } catch {
          status(
            "Could not save in this browser. Export JSON to keep your drawing.",
          );
        }
        return;
      }
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(layout, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name}-boundaries.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      status(`Exported ${name}-boundaries.json.`);
    }
    if (action === "import") dialog.querySelector("input")!.click();
    render();
  });
  dialog.querySelector("input")!.addEventListener("change", async (event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error("File is too large.");
      const value: unknown = JSON.parse(await file.text());
      const error = validate(value);
      if (error) throw new Error(error);
      checkpoint();
      layout = value as CampBoundaries;
      selected = -1;
      vertex = -1;
      render();
      status("Imported. Save to apply this layout.");
    } catch (error) {
      status(
        error instanceof Error ? error.message : "Could not read the file.",
      );
    }
    input.value = "";
  });
  dialog.addEventListener(
    "keydown",
    (event) => {
      if (
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLInputElement ||
        drawing ||
        vertex < 0
      )
        return;
      const offsets: Record<string, Point> = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
      };
      const offset = offsets[event.key];
      if (!offset) return;
      event.preventDefault();
      checkpoint();
      const p = shape()[vertex],
        step = event.shiftKey ? 10 : 1;
      p.x = Math.max(0, Math.min(width, p.x + offset.x * step));
      p.y = Math.max(0, Math.min(height, p.y + offset.y * step));
      render();
    },
    { signal: signal.signal },
  );
  dialog.addEventListener(
    "close",
    () => {
      signal.abort();
      dialog.remove();
      onClose(saved);
    },
    { once: true },
  );
  render();
  status(
    `Select a shape to adjust it, or draw a replacement. ${markers.map(([, label]) => label).join(" and ")} must stay walkable.`,
  );
  dialog.showModal();
}
