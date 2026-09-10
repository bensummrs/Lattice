import test from "node:test";
import assert from "node:assert/strict";
import { designFileName, loadStoredDesign, storeDesign } from "./design-io.js";
import { createDesign } from "./drawing.js";

test("design filenames are safe and retain a useful fallback", () => {
  assert.equal(designFileName("My first icon!", "svg"), "My-first-icon.svg");
  assert.equal(designFileName("///", "json"), "lattice-icon.json");
});

test("browser storage round trips designs and handles an empty store", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.equal(loadStoredDesign(storage), null);

  const design = createDesign(8);
  design.pixels[0] = 1;
  storeDesign(design, storage);
  assert.deepEqual(loadStoredDesign(storage), design);
});
