import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { toSvg, validateDesign } from "./drawing.js";
import { formatGrid, parseGrid } from "./glyph-grid.js";

export function readGlyph(file) {
  const grid = readFileSync(file, "utf8");
  const settings = readFileSync(file.replace(/\.glyph$/, ".json"), "utf8");
  return {
    design: parseGrid(grid, JSON.parse(settings)),
    revision: createHash("sha256")
      .update(JSON.stringify([grid, settings]))
      .digest("hex"),
  };
}

export function writeGlyph(file, value, revision) {
  const design = validateDesign(value);
  if (readGlyph(file).revision !== revision) return null;
  const { name, color, roundness, gap } = design;
  writeFileSync(file, formatGrid(design));
  writeFileSync(
    file.replace(/\.glyph$/, ".json"),
    JSON.stringify({ name, color, roundness, gap }, null, 2) + "\n",
  );
  return readGlyph(file);
}

export function renderGlyph(file, design = readGlyph(file).design) {
  const svg = toSvg(design);
  const stem = resolve(dirname(file), basename(file, ".glyph"));
  writeFileSync(`${stem}.svg`, svg);
  const preview = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="512">${svg.replace('width="1024" height="1024"', 'width="512" height="512"')}${[16, 32, 48].map((size, index) => svg.replace('width="1024" height="1024"', `x="560" y="${32 + index * 112}" width="${size}" height="${size}"`)).join("")}</svg>`;
  writeFileSync(
    `${stem}.png`,
    new Resvg(preview, {
      background: "white",
      font: { loadSystemFonts: false },
    })
      .render()
      .asPng(),
  );
  return `${stem}.png`;
}
