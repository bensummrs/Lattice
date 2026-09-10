const GRID_SIZES = [8, 16, 24, 32];
export const DEFAULT_COLOR = "#292d27";

export function createDesign(size = 16) {
  return {
    version: 1,
    name: "Untitled icon",
    size,
    pixels: Array(size * size).fill(0),
    color: DEFAULT_COLOR,
    roundness: 0,
    gap: 0,
  };
}

export function validateDesign(value) {
  if (
    !value ||
    value.version !== 1 ||
    !GRID_SIZES.includes(value.size) ||
    !Array.isArray(value.pixels) ||
    value.pixels.length !== value.size ** 2 ||
    !value.pixels.every((pixel) => pixel === 0 || pixel === 1) ||
    typeof value.name !== "string" ||
    value.name.length > 60 ||
    typeof value.color !== "string" ||
    !/^#[\da-f]{6}$/i.test(value.color) ||
    !Number.isFinite(value.roundness) ||
    value.roundness < 0 ||
    value.roundness > 100 ||
    !Number.isFinite(value.gap) ||
    value.gap < 0 ||
    value.gap > 60
  ) {
    throw new Error(
      "This is not a valid Lattice file. Choose an editable .json file saved from Lattice.",
    );
  }
  const { version, name, size, pixels, color, roundness, gap } = value;
  return { version, name, size, pixels: [...pixels], color, roundness, gap };
}

export function linePoints(from, to) {
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  if (steps === 0) return [from];
  return Array.from({ length: steps + 1 }, (_, step) => ({
    x: Math.round(from.x + ((to.x - from.x) * step) / steps),
    y: Math.round(from.y + ((to.y - from.y) * step) / steps),
  }));
}

export function paint(design, point, value, symmetry = "none") {
  const { size, pixels } = design;
  const columns = [point.x];
  const rows = [point.y];
  if (symmetry === "horizontal" || symmetry === "both")
    columns.push(size - 1 - point.x);
  if (symmetry === "vertical" || symmetry === "both")
    rows.push(size - 1 - point.y);
  for (const y of rows)
    for (const x of columns) {
      if (x >= 0 && y >= 0 && x < size && y < size)
        pixels[y * size + x] = value;
    }
}

export function floodFill(design, start, value, symmetry) {
  const { size, pixels } = design;
  const target = pixels[start.y * size + start.x];
  if (target === value) return;
  const pending = [start];
  const visited = new Set();
  const region = [];
  while (pending.length) {
    const point = pending.pop();
    const { x, y } = point;
    const index = y * size + x;
    if (
      x < 0 ||
      y < 0 ||
      x >= size ||
      y >= size ||
      visited.has(index) ||
      pixels[index] !== target
    )
      continue;
    visited.add(index);
    region.push(point);
    pending.push(
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    );
  }
  for (const point of region) paint(design, point, value, symmetry);
}

export function resizeDesign(design, size) {
  const pixels = Array(size * size).fill(0);
  const offset = Math.floor((size - design.size) / 2);
  for (let y = 0; y < design.size; y++)
    for (let x = 0; x < design.size; x++) {
      const nx = x + offset;
      const ny = y + offset;
      if (nx >= 0 && ny >= 0 && nx < size && ny < size)
        pixels[ny * size + nx] = design.pixels[y * design.size + x];
    }
  return { ...design, size, pixels };
}

export function transformPixels(design, operation) {
  const { size, pixels } = design;
  const transformed = Array(pixels.length).fill(0);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const destination =
        operation === "rotate"
          ? { x: size - 1 - y, y: x }
          : { x: size - 1 - x, y };
      transformed[destination.y * size + destination.x] = pixels[y * size + x];
    }
  return transformed;
}

export function pixelRects(design) {
  const inset = design.gap / 200;
  const width = 1 - 2 * inset;
  return design.pixels.flatMap((pixel, index) =>
    pixel
      ? [
          {
            x: (index % design.size) + inset,
            y: Math.floor(index / design.size) + inset,
            width,
            radius: (width * design.roundness) / 200,
          },
        ]
      : [],
  );
}

export function toSvg(design, transparent = true) {
  const rectangles = pixelRects(design)
    .map(
      ({ x, y, width, radius }) =>
        `<rect x="${x}" y="${y}" width="${width}" height="${width}" rx="${radius}"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 ${design.size} ${design.size}">${transparent ? "" : '<rect width="100%" height="100%" fill="#ffffff"/>'}<g fill="${design.color}">${rectangles}</g></svg>`;
}

export const STARTERS = {
  Spark: [
    "00011000",
    "00011000",
    "00111100",
    "11111111",
    "11111111",
    "00111100",
    "00011000",
    "00011000",
  ],
  Bloom: [
    "00100100",
    "01111110",
    "11111111",
    "01100110",
    "01100110",
    "11111111",
    "01111110",
    "00100100",
  ],
  Arrow: [
    "00011000",
    "00011100",
    "00011110",
    "11111111",
    "11111111",
    "00011110",
    "00011100",
    "00011000",
  ],
  Heart: [
    "00000000",
    "01100110",
    "11111111",
    "11111111",
    "01111110",
    "00111100",
    "00011000",
    "00000000",
  ],
  Steps: [
    "00000011",
    "00000011",
    "00001111",
    "00001111",
    "00111111",
    "00111111",
    "11111111",
    "11111111",
  ],
  Orbit: [
    "00111100",
    "01100110",
    "11000011",
    "10011001",
    "10011001",
    "11000011",
    "01100110",
    "00111100",
  ],
};

export function starterDesign(name, size = 16) {
  const design = createDesign(size);
  design.name = name;
  const scale = Math.max(1, Math.floor(size / 12));
  const offset = Math.floor((size - 8 * scale) / 2);
  STARTERS[name].forEach((row, y) =>
    [...row].forEach((pixel, x) => {
      if (pixel !== "1") return;
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) {
          paint(
            design,
            { x: offset + x * scale + dx, y: offset + y * scale + dy },
            1,
          );
        }
    }),
  );
  return design;
}
