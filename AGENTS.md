# Creating glyphs in Lattice

- Edit `glyphs/current.glyph` directly. Each character is one square: `#` is filled, `.` is empty. Each line is a row, from top to bottom; columns run left to right. No spaces or comments. Use a square grid of 8, 16, 24 or 32 cells. A final newline is allowed.
- Edit `glyphs/current.json` only for name, hex color, roundness (0–100) and gap (0–60). Grid dimensions come from the grid itself.
- Run `npm run glyph` after editing. Wait for success, then open `glyphs/current.png` with your image-viewing tool. It shows a large preview and actual 16/32/48 px previews down the right. Inspect the silhouette, spacing and legibility, then refine. `glyphs/current.svg` is the transparent export. Rendering works without a running browser.
- Run `npm run dev` and open the printed local URL with `?local` to see changes in Lattice. File changes appear within about a second; drawing in the editor saves back to the same files. Avoid editing the file while the user is drawing. A conflict pauses browser saving and preserves the browser drawing for JSON export; reload to adopt the file.
- To retain another glyph, copy both source files under a new matching stem. Render it with `npm run glyph -- glyphs/name.glyph`. The live editor syncs only `current.glyph`.
- Do not edit the app source to create artwork. Do not edit generated PNG/SVG files. Do not claim to have inspected a preview unless you opened the image.

For code changes, follow neighbouring conventions, preserve the existing JSON format and static browser workflow, and run `npm test` and `npm run build`.
