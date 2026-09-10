# Lattice

A small, local-first pixel icon studio inspired by [GLYPH by Kate Ander](https://glyph.kateander.com/). Plain JavaScript and Canvas, with Vite for local development and resvg for agent-friendly PNG previews. No account or hosted backend.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm test` checks drawing, transforms, import validation, and export geometry. `npm run build` produces the static site in `dist/`.

## Use

### Create with Codex or Claude Code

Open this repository in your local coding agent. Ask it to edit `glyphs/current.glyph`: every `#` is a filled square and every `.` an empty square, one row per line. Supported square grids are 8, 16, 24 and 32 cells. Styling lives in `glyphs/current.json`.

Run `npm run dev`, then open the printed URL with `?local` (or click **Sync local grid file**). This mode loads the file instead of the browser drawing and checks for changes every 750 ms. Drawing and styling changes save back after you release the pointer and leave the control. External changes are undoable. If the file and browser both change, syncing pauses: save the browser drawing as editable JSON before reloading to load the file. Invalid file edits leave the canvas intact and display an error until corrected. Save any existing browser drawing before entering local mode.

Run `npm run glyph` to generate `glyphs/current.png` and `.svg`, even without the server. The PNG shows a large preview plus 16, 32 and 48 px versions down the right. Agents should open it after each change to inspect their work. While local mode is open, previews are also regenerated when valid changes are detected. To render another saved pair of `.glyph`/`.json` files: `npm run glyph -- glyphs/name.glyph`.

AGENTS.md and CLAUDE.md teach local agents this workflow. No MCP or model API key is needed. Claude Desktop requires filesystem and command access to use the same workflow; this does not install an integration into Claude Desktop.

The local file endpoint is available only during `npm run dev`. Production builds retain the browser-only editor.

### Draw manually

- Click to toggle a pixel; drag to draw. Right-click or select Erase to remove pixels.
- B, E, F, L select Draw, Erase, Fill, and Line. Drag with Line to preview a straight stroke.
- Mirror drawing across either or both axes. Adjust ink, roundness, and spacing at any time.
- Ctrl/Command Z undoes; Ctrl/Command Shift Z redoes. History keeps the last 100 edits for this session.
- Focus the grid and use arrow keys to move, Space/Enter to paint, and Delete/Backspace to erase.
- Grid resizing centers the existing design. Shrinking crops the edges; undo restores them.
- Export SVG for scalable artwork, or a 1024 × 1024 PNG. Turn off transparency for a white background.
- The current drawing saves in this browser's local storage after edits. Save/open editable JSON files to keep multiple designs or move between browsers. Imported files are validated before replacing the drawing; opening a file is undoable.

The app requests Google Fonts for typography, falling back to system sans-serif when unavailable. Drawing data stays on the device. Nothing is published by running or building the app.

## Code structure

- `app.js` composes the modules and coordinates cross-module workflows.
- `canvas-editor.js` owns canvas rendering and pointer/keyboard drawing gestures.
- `editor-controls.js` binds toolbar, file, help, and keyboard actions.
- `editor-state.js` owns the current design and undo/redo history.
- `editor-view.js` renders the surrounding UI and builds dynamic controls.
- `design-io.js` owns browser storage, editable files, and image downloads.
- `drawing.js` contains the DOM-free drawing, validation, and SVG rules.

Keep drawing rules in `drawing.js` so they remain independently testable. Browser-specific behavior belongs in the module that owns that browser boundary; `app.js` should remain orchestration rather than accumulating implementation details.
