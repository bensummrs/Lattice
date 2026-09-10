import { DEFAULT_COLOR, STARTERS, starterDesign, toSvg } from "./drawing.js";

export const $ = (id) => document.getElementById(id);

export function createNotifier() {
  let toastTimer;
  return (message) => {
    $("status").textContent = message;
    $("status").classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      () => $("status").classList.remove("visible"),
      4500,
    );
  };
}

export function renderDrawing(design) {
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

export function renderEditor(editor, canvasEditor) {
  const { design } = editor;
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
  $("undo").disabled = !editor.canUndo;
  $("redo").disabled = !editor.canRedo;

  canvasEditor.draw();
  renderDrawing(design);
}

export function buildPalette(onSelect) {
  const colors = [DEFAULT_COLOR, "#758b52", "#b494ce", "#e88b66", "#6b94bd"];
  $("palette").innerHTML =
    colors
      .map(
        (color) =>
          `<button class="swatch" style="--swatch:${color}" data-color="${color}" aria-label="Ink ${color}" aria-pressed="false"></button>`,
      )
      .join("") +
    '<label class="custom-color" title="Choose a custom ink color">+<input id="color" type="color" aria-label="Custom ink color"></label>';
  document
    .querySelectorAll("[data-color]")
    .forEach((button) =>
      button.addEventListener("click", () => onSelect(button.dataset.color)),
    );
}

export function buildStarters(onSelect) {
  $("starters").innerHTML = Object.keys(STARTERS)
    .map(
      (name) =>
        `<button class="starter" data-starter="${name}" title="Use ${name} starter (can be undone)">${toSvg(starterDesign(name, 8))}<span>${name}</span></button>`,
    )
    .join("");
  document
    .querySelectorAll("[data-starter]")
    .forEach((button) =>
      button.addEventListener("click", () => onSelect(button.dataset.starter)),
    );
}
