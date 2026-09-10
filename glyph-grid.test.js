import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDesign } from "./drawing.js";
import { parseGrid, formatGrid } from "./glyph-grid.js";
import { readGlyph, writeGlyph, renderGlyph } from "./local-project.js";

test("grid round trips all sizes, preserves coordinates and accepts Windows line endings", () => {
  for (const size of [8, 16, 24, 32]) {
    const design = createDesign(size);
    design.pixels[2 * size + 3] = 1;
    const grid = formatGrid(design);
    assert.equal(grid.split("\n")[2][3], "#");
    assert.deepEqual(parseGrid(grid), design);
    assert.deepEqual(parseGrid(grid.replaceAll("\n", "\r\n")), design);
    assert.deepEqual(parseGrid(grid.trimEnd()), design);
  }
});

test("missing, empty, malformed grids and invalid styles are rejected", () => {
  const grid = formatGrid(createDesign(8));
  for (const value of [
    undefined,
    null,
    "",
    "\n",
    grid + "\n",
    grid.replace(".", "x"),
    grid.slice(1),
    ".........\n".repeat(9),
  ])
    assert.throws(() => parseGrid(value), /Grid must/);
  assert.throws(() => parseGrid(grid, { color: "red" }), /valid Lattice/);
  assert.equal(parseGrid(grid, { roundness: 25, gap: 10 }).roundness, 25);
});

test("disk edits, conflict protection and actual PNG/SVG rendering", () => {
  const directory = mkdtempSync(join(tmpdir(), "lattice-"));
  const file = join(directory, "test.glyph");
  try {
    writeFileSync(file, formatGrid(createDesign(8)));
    writeFileSync(join(directory, "test.json"), "{}");
    const original = readGlyph(file);
    const edited = { ...original.design, roundness: 50, gap: 12 };
    edited.pixels[0] = 1;
    const saved = writeGlyph(file, edited, original.revision);
    assert.deepEqual(saved.design, edited);
    assert.equal(writeGlyph(file, createDesign(8), original.revision), null);
    assert.deepEqual(readGlyph(file).design, edited);
    const png = readFileSync(renderGlyph(file));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), 640);
    assert.equal(png.readUInt32BE(20), 512);
    assert.match(
      readFileSync(join(directory, "test.svg"), "utf8"),
      /rx="0.22"/,
    );
    writeFileSync(file, "partial edit");
    assert.throws(() => writeGlyph(file, edited, saved.revision), /Grid must/);
    assert.equal(readFileSync(file, "utf8"), "partial edit");
  } finally {
    rmSync(directory, { recursive: true });
  }
});
