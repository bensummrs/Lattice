import { resolve } from "node:path";
import { renderGlyph } from "./local-project.js";

try {
  console.log(renderGlyph(resolve(process.argv[2] ?? "glyphs/current.glyph")));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
