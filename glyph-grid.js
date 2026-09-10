import { createDesign, validateDesign } from "./drawing.js";

export function parseGrid(text, settings = {}) {
  const rows =
    typeof text === "string"
      ? text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n")
      : [];
  if (
    ![8, 16, 24, 32].includes(rows.length) ||
    rows.some((row) => row.length !== rows.length || /[^.#]/.test(row))
  ) {
    throw new Error(
      "Grid must be 8, 16, 24 or 32 square rows of only . and #.",
    );
  }
  return validateDesign({
    ...createDesign(rows.length),
    ...settings,
    version: 1,
    size: rows.length,
    pixels: [...rows.join("")].map((cell) => Number(cell === "#")),
  });
}

export function formatGrid(design) {
  return (
    Array.from({ length: design.size }, (_, row) =>
      design.pixels
        .slice(row * design.size, (row + 1) * design.size)
        .map((pixel) => (pixel ? "#" : "."))
        .join(""),
    ).join("\n") + "\n"
  );
}
