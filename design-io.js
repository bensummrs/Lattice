import { pixelRects, toSvg, validateDesign } from "./drawing.js";

export const STORAGE_KEY = "lattice.design.v1";

export function loadStoredDesign(storage = localStorage) {
  const saved = storage.getItem(STORAGE_KEY);
  return saved === null ? null : validateDesign(JSON.parse(saved));
}

export function storeDesign(design, storage = localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(design));
}

export function designFileName(name, extension) {
  const base =
    name.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") ||
    "lattice-icon";
  return `${base}.${extension}`;
}

function download(blob, design, extension) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = designFileName(design.name, extension);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSvg(design, transparent) {
  download(
    new Blob([toSvg(design, transparent)], { type: "image/svg+xml" }),
    design,
    "svg",
  );
}

export function downloadPng(design, transparent, onFailure) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const context = canvas.getContext("2d");
  const scale = 1024 / design.size;
  context.scale(scale, scale);
  if (!transparent) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, design.size, design.size);
  }
  context.fillStyle = design.color;
  for (const { x, y, width, radius } of pixelRects(design)) {
    context.beginPath();
    context.roundRect(x, y, width, width, radius);
    context.fill();
  }
  canvas.toBlob((blob) => {
    if (!blob) return onFailure();
    download(blob, design, "png");
  }, "image/png");
}

export function downloadProject(design) {
  download(
    new Blob([JSON.stringify(design)], { type: "application/json" }),
    design,
    "json",
  );
}

export async function readProject(file) {
  if (file.size > 100_000) {
    throw new Error(
      "This file is too large for a Lattice drawing. Choose a saved Lattice .json file.",
    );
  }
  return validateDesign(JSON.parse(await file.text()));
}
