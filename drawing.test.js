import test from "node:test";
import assert from "node:assert/strict";
import {
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
  STARTERS,
} from "./drawing.js";

test("saved designs round trip; missing, malformed and unsupported input is rejected", () => {
  const design = createDesign();
  assert.deepEqual(validateDesign(JSON.parse(JSON.stringify(design))), design);
  for (const value of [
    undefined,
    null,
    {},
    "",
    { ...design, version: 2 },
    { ...design, size: 17 },
    { ...design, pixels: [] },
    { ...design, pixels: Array(256).fill("1") },
    { ...design, color: '"><script>' },
    { ...design, gap: NaN },
    { ...design, roundness: 101 },
    { ...design, name: null },
  ]) {
    assert.throws(() => validateDesign(value), /valid Lattice file/);
  }
  const copied = validateDesign(design);
  copied.pixels[0] = 1;
  assert.equal(design.pixels[0], 0);
});

test("lines include endpoints with no gaps in every direction", () => {
  for (const end of [
    { x: 0, y: 0 },
    { x: 7, y: 3 },
    { x: 2, y: 7 },
    { x: -4, y: -7 },
  ]) {
    const points = linePoints({ x: 0, y: 0 }, end);
    assert.deepEqual(points[0], { x: 0, y: 0 });
    assert.deepEqual(points.at(-1), end);
    points.slice(1).forEach((point, index) => {
      assert.ok(
        Math.abs(point.x - points[index].x) <= 1 &&
          Math.abs(point.y - points[index].y) <= 1,
      );
    });
  }
});

test("paint mirrors across both axes and erases the same pixels", () => {
  const design = createDesign(8);
  paint(design, { x: 1, y: 2 }, 1, "both");
  assert.deepEqual(
    design.pixels.flatMap((pixel, index) => (pixel ? [index] : [])),
    [17, 22, 41, 46],
  );
  paint(design, { x: 1, y: 2 }, 0, "both");
  assert.equal(
    design.pixels.reduce((a, b) => a + b),
    0,
  );
});

test("fill respects boundaries and same-color fills terminate", () => {
  const design = createDesign(8);
  for (let y = 0; y < 8; y++) paint(design, { x: 3, y }, 1);
  floodFill(design, { x: 0, y: 0 }, 1, "none");
  assert.equal(
    design.pixels.reduce((a, b) => a + b),
    32,
  );
  assert.equal(design.pixels[4], 0);
  floodFill(design, { x: 0, y: 0 }, 1, "none");
  assert.equal(
    design.pixels.reduce((a, b) => a + b),
    32,
  );
  floodFill(design, { x: 0, y: 0 }, 0, "none");
  assert.ok(design.pixels.every((pixel) => pixel === 0));
});

test("mirrored fill calculates the region before changing reflected pixels", () => {
  const design = createDesign(8);
  floodFill(design, { x: 0, y: 0 }, 1, "both");
  assert.ok(design.pixels.every((pixel) => pixel === 1));
});

test("resize keeps centered artwork, crops edges, and preserves style", () => {
  const design = createDesign(16);
  design.pixels[0] = 1;
  design.pixels[7 * 16 + 7] = 1;
  const small = resizeDesign(design, 8);
  assert.equal(
    small.pixels.reduce((a, b) => a + b),
    1,
  );
  assert.equal(small.pixels[3 * 8 + 3], 1);
  assert.equal(small.color, design.color);
  assert.deepEqual(resizeDesign(resizeDesign(design, 24), 16), design);
});

test("four rotations and two flips restore the drawing", () => {
  const design = createDesign(8);
  design.pixels[1] = 1;
  const original = [...design.pixels];
  design.pixels = transformPixels(design, "rotate");
  assert.equal(design.pixels[15], 1);
  for (let index = 0; index < 3; index++)
    design.pixels = transformPixels(design, "rotate");
  assert.deepEqual(design.pixels, original);
  design.pixels = transformPixels(design, "flip");
  assert.equal(design.pixels[6], 1);
  design.pixels = transformPixels(design, "flip");
  assert.deepEqual(design.pixels, original);
});

test("export geometry shares spacing and corner calculations with the canvas", () => {
  const design = createDesign(8);
  assert.deepEqual(pixelRects(design), []);
  assert.ok(!toSvg(design).includes('fill="#ffffff"'));
  assert.ok(toSvg(design, false).includes('fill="#ffffff"'));
  design.pixels[9] = 1;
  design.gap = 20;
  design.roundness = 100;
  assert.deepEqual(pixelRects(design), [
    { x: 1.1, y: 1.1, width: 0.8, radius: 0.4 },
  ]);
  assert.ok(toSvg(design).includes('width="0.8" height="0.8" rx="0.4"'));
});

test("all starter shapes produce valid non-empty drawings at every grid size", () => {
  for (const name of Object.keys(STARTERS))
    for (const size of [8, 16, 24, 32]) {
      const design = starterDesign(name, size);
      assert.deepEqual(validateDesign(design), design);
      assert.ok(design.pixels.some(Boolean));
    }
});
