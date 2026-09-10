import {
  DEFAULT_COLOR,
  STARTERS,
  createDesign,
  validateDesign,
  linePoints,
  paint,
  floodFill,
  resizeDesign,
  transformPixels,
  pixelRects,
  toSvg,
  starterDesign,
} from "./drawing.js";

const $ = (id) => document.getElementById(id);
const board = $("board");
const context = board.getContext("2d");
const storageKey = "lattice.design.v1";
let design = createDesign();
let tool = "draw";
let showGrid = true;
let stroke = null;
let cursor = { x: 0, y: 0 };
let keyboardCursor = false;
const undoStack = [];
let redoStack = [];
let toastTimer;
let framePending = false;
let controlBefore = null;

function notify(message) {
  $("status").textContent = message;
  $("status").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("status").classList.remove("visible"), 4500);
}

try {
  const saved = localStorage.getItem(storageKey);
  if (saved !== null) design = validateDesign(JSON.parse(saved));
} catch (error) {
  notify(
    "Could not restore the saved drawing. You can open a saved editable file.",
  );
  console.warn("Lattice restore failed:", error);
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(design));
  } catch (error) {
    notify(
      "Browser saving is unavailable. Use “Save editable file” to keep your work.",
    );
    console.warn("Lattice save failed:", error);
  }
}

function commit(before) {
  if (JSON.stringify(before) === JSON.stringify(design)) return render();
  undoStack.push(before);
  if (undoStack.length > 100) undoStack.shift();
  redoStack = [];
  save();
  render();
}

function change(action) {
  finishStroke();
  const before = structuredClone(design);
  action();
  commit(before);
}

function history(direction) {
  finishStroke();
  const source = direction === "undo" ? undoStack : redoStack;
  const destination = direction === "undo" ? redoStack : undoStack;
  if (!source.length) return;
  destination.push(structuredClone(design));
  design = source.pop();
  cursor.x = Math.min(cursor.x, design.size - 1);
  cursor.y = Math.min(cursor.y, design.size - 1);
  save();
  render();
}

function drawBoard() {
  const bounds = board.getBoundingClientRect();
  const resolution = Math.round(bounds.width * window.devicePixelRatio);
  if (board.width !== resolution) board.width = board.height = resolution;
  const unit = board.width / design.size;
  context.setTransform(unit, 0, 0, unit, 0, 0);
  context.clearRect(0, 0, design.size, design.size);
  context.fillStyle = design.color;
  for (const { x, y, width, radius } of pixelRects(design)) {
    context.beginPath();
    context.roundRect(x, y, width, width, radius);
    context.fill();
  }
  if (showGrid) {
    context.beginPath();
    context.strokeStyle = "#d7dccf";
    context.lineWidth = 1 / unit;
    for (let index = 0; index <= design.size; index++) {
      context.moveTo(index, 0);
      context.lineTo(index, design.size);
      context.moveTo(0, index);
      context.lineTo(design.size, index);
    }
    context.stroke();
  }
  if (keyboardCursor && document.activeElement === board) {
    context.strokeStyle = "#769534";
    context.lineWidth = 2 / unit;
    context.strokeRect(cursor.x + 0.08, cursor.y + 0.08, 0.84, 0.84);
  }
}

function renderDrawing() {
  drawBoard();
  const svg = toSvg(design);
  $("preview").innerHTML = svg;
  $("size-previews").innerHTML = [16, 32, 48]
    .map(
      (size) =>
        `<div>${svg.replace('width="1024" height="1024"', `width="${size}" height="${size}"`)}<span>${size} px</span></div>`,
    )
    .join("");
  $("pixel-count").textContent =
    `${design.pixels.reduce((sum, pixel) => sum + pixel, 0)} pixels placed`;
}

function scheduleDrawing() {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(() => {
    framePending = false;
    renderDrawing();
  });
}

function render() {
  $("name").value = design.name;
  $("size").value = design.size;
  for (const property of ["roundness", "gap", "color"]) {
    $(property).value = design[property];
    $(`${property}-value`).textContent =
      property === "color"
        ? design.color.toUpperCase()
        : `${design[property]}%`;
  }
  document
    .querySelectorAll("[data-color]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        button.dataset.color === design.color.toLowerCase(),
      ),
    );
  $("dimensions").textContent = `${design.size} × ${design.size}`;
  $("undo").disabled = undoStack.length === 0;
  $("redo").disabled = redoStack.length === 0;
  renderDrawing();
}

function pointAt(event) {
  const rect = board.getBoundingClientRect();
  return {
    x: Math.max(
      0,
      Math.min(
        design.size - 1,
        Math.floor(((event.clientX - rect.left) / rect.width) * design.size),
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        design.size - 1,
        Math.floor(((event.clientY - rect.top) / rect.height) * design.size),
      ),
    ),
  };
}

function finishStroke() {
  if (!stroke) return;
  const { before, pointerId } = stroke;
  stroke = null;
  if (board.hasPointerCapture(pointerId))
    board.releasePointerCapture(pointerId);
  commit(before);
}

board.addEventListener("pointerdown", (event) => {
  if (stroke || (event.button !== 0 && event.button !== 2)) return;
  event.preventDefault();
  board.focus({ preventScroll: true });
  keyboardCursor = false;
  const point = pointAt(event);
  const erase = event.button === 2 || tool === "erase";
  const value = erase
    ? 0
    : tool === "draw"
      ? 1 - design.pixels[point.y * design.size + point.x]
      : 1;
  stroke = {
    before: structuredClone(design),
    start: point,
    last: point,
    value,
    pointerId: event.pointerId,
    tool: erase ? "erase" : tool,
  };
  board.setPointerCapture(event.pointerId);
  if (stroke.tool === "fill")
    floodFill(design, point, value, $("symmetry").value);
  else paint(design, point, value, $("symmetry").value);
  scheduleDrawing();
});

board.addEventListener("pointermove", (event) => {
  if (!stroke || event.pointerId !== stroke.pointerId || stroke.tool === "fill")
    return;
  const point = pointAt(event);
  if (stroke.tool === "line") design.pixels = [...stroke.before.pixels];
  for (const pixel of linePoints(
    stroke.tool === "line" ? stroke.start : stroke.last,
    point,
  )) {
    paint(design, pixel, stroke.value, $("symmetry").value);
  }
  stroke.last = point;
  scheduleDrawing();
});
for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
  board.addEventListener(eventName, (event) => {
    if (event.pointerId === stroke?.pointerId) finishStroke();
  });
}
board.addEventListener("contextmenu", (event) => event.preventDefault());
board.addEventListener("blur", scheduleDrawing);
board.addEventListener("keydown", (event) => {
  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
    keyboardCursor = true;
    cursor.x = Math.max(
      0,
      Math.min(
        design.size - 1,
        cursor.x + (event.key === "ArrowRight") - (event.key === "ArrowLeft"),
      ),
    );
    cursor.y = Math.max(
      0,
      Math.min(
        design.size - 1,
        cursor.y + (event.key === "ArrowDown") - (event.key === "ArrowUp"),
      ),
    );
    scheduleDrawing();
  }
  if ([" ", "Enter", "Delete", "Backspace"].includes(event.key)) {
    event.preventDefault();
    keyboardCursor = true;
    change(() => {
      const value =
        ["Delete", "Backspace"].includes(event.key) || tool === "erase"
          ? 0
          : 1 - design.pixels[cursor.y * design.size + cursor.x];
      if (tool === "fill")
        floodFill(design, cursor, value, $("symmetry").value);
      else paint(design, cursor, value, $("symmetry").value);
    });
  }
});

function selectTool(selected) {
  finishStroke();
  tool = selected;
  document
    .querySelectorAll("[data-tool]")
    .forEach((button) =>
      button.setAttribute("aria-pressed", button.dataset.tool === tool),
    );
}
document
  .querySelectorAll("[data-tool]")
  .forEach((button) =>
    button.addEventListener("click", () => selectTool(button.dataset.tool)),
  );
$("undo").addEventListener("click", () => history("undo"));
$("redo").addEventListener("click", () => history("redo"));
$("grid").addEventListener("click", () => {
  showGrid = !showGrid;
  $("grid").setAttribute("aria-pressed", showGrid);
  drawBoard();
});
$("size").addEventListener("change", (event) => {
  change(() => {
    design = resizeDesign(design, Number(event.target.value));
    cursor = { x: 0, y: 0 };
  });
  notify("Grid resized. Your drawing is centered. Undo to restore.");
});
$("rotate").addEventListener("click", () =>
  change(() => {
    design.pixels = transformPixels(design, "rotate");
  }),
);
$("flip").addEventListener("click", () =>
  change(() => {
    design.pixels = transformPixels(design, "flip");
  }),
);
$("clear").addEventListener("click", () => {
  change(() => design.pixels.fill(0));
  notify("A fresh canvas. Undo brings your drawing back.");
});
$("name").addEventListener("change", (event) =>
  change(() => {
    design.name = event.target.value.trim() || "Untitled icon";
  }),
);

const colors = [DEFAULT_COLOR, "#758b52", "#b494ce", "#e88b66", "#6b94bd"];
$("palette").innerHTML =
  colors
    .map(
      (color) =>
        `<button class="swatch" style="--swatch:${color}" data-color="${color}" aria-label="Ink ${color}" aria-pressed="false"></button>`,
    )
    .join("") +
  '<label class="custom-color" title="Choose a custom ink color">+<input id="color" type="color" aria-label="Custom ink color"></label>';
document.querySelectorAll("[data-color]").forEach((button) =>
  button.addEventListener("click", () =>
    change(() => {
      design.color = button.dataset.color;
    }),
  ),
);
for (const property of ["roundness", "gap", "color"]) {
  $(property).addEventListener("input", (event) => {
    if (!controlBefore) controlBefore = structuredClone(design);
    design[property] =
      property === "color" ? event.target.value : Number(event.target.value);
    $(`${property}-value`).textContent =
      property === "color"
        ? design.color.toUpperCase()
        : `${design[property]}%`;
    scheduleDrawing();
  });
  $(property).addEventListener("change", () => {
    if (!controlBefore) return;
    const before = controlBefore;
    controlBefore = null;
    commit(before);
  });
}

$("starters").innerHTML = Object.keys(STARTERS)
  .map(
    (name) =>
      `<button class="starter" data-starter="${name}" title="Use ${name} starter (can be undone)">${toSvg(starterDesign(name, 8))}<span>${name}</span></button>`,
  )
  .join("");
document.querySelectorAll("[data-starter]").forEach((button) =>
  button.addEventListener("click", () => {
    change(() => {
      const starter = starterDesign(button.dataset.starter, design.size);
      design = { ...design, name: starter.name, pixels: starter.pixels };
    });
    notify(
      `${button.dataset.starter} is yours to play with. Undo restores the previous drawing.`,
    );
  }),
);

function download(blob, extension) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${design.name.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "lattice-icon"}.${extension}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("export-svg").addEventListener("click", () =>
  download(
    new Blob([toSvg(design, $("transparent").checked)], {
      type: "image/svg+xml",
    }),
    "svg",
  ),
);
$("export-png").addEventListener("click", () => {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  const scale = 1024 / design.size;
  ctx.scale(scale, scale);
  if (!$("transparent").checked) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, design.size, design.size);
  }
  ctx.fillStyle = design.color;
  for (const { x, y, width, radius } of pixelRects(design)) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, width, radius);
    ctx.fill();
  }
  canvas.toBlob((blob) => {
    if (!blob) return notify("PNG export failed. Please try SVG instead.");
    download(blob, "png");
  }, "image/png");
});
$("save-project").addEventListener("click", () =>
  download(
    new Blob([JSON.stringify(design)], { type: "application/json" }),
    "json",
  ),
);
$("open-project").addEventListener("click", () => $("file").click());
$("file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 100_000)
      throw new Error(
        "This file is too large for a Lattice drawing. Choose a saved Lattice .json file.",
      );
    const imported = validateDesign(JSON.parse(await file.text()));
    change(() => {
      design = imported;
      cursor = { x: 0, y: 0 };
    });
    notify("Drawing opened. Make it yours.");
  } catch (error) {
    notify(
      error instanceof SyntaxError
        ? "This file is not valid JSON. Choose a saved Lattice file."
        : error.message,
    );
  }
  event.target.value = "";
});

$("help-button").addEventListener("click", () => $("help").showModal());
$("close-help").addEventListener("click", () => $("help").close());
document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, select, textarea") || $("help").open) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    history(event.shiftKey ? "redo" : "undo");
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const shortcut = { b: "draw", e: "erase", f: "fill", l: "line" }[
    event.key.toLowerCase()
  ];
  if (shortcut) selectTool(shortcut);
  if (event.key === "?") $("help").showModal();
});
window.addEventListener("blur", finishStroke);
new ResizeObserver(scheduleDrawing).observe(board);
render();
