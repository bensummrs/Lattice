# Lattice

A small, local-first pixel icon studio inspired by [GLYPH by Kate Ander](https://glyph.kateander.com/). Plain JavaScript and Canvas; Vite is the only development dependency. No account, backend, or runtime libraries.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm test` checks drawing, transforms, import validation, and export geometry. `npm run build` produces the static site in `dist/`.

## Use

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
