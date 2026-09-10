# Make glyphs with your coding agent

## 1. Start Lattice

Open PowerShell and run:

```powershell
cd C:\Users\bensu\source\repos\Lattice
npm install
npm run dev
```

You only need `npm install` on first setup or after dependencies change. Leave this terminal running while you use Lattice.

## 2. Open the editor

Open the **Local** URL printed in the terminal. Click **Sync local grid file** below the drawing controls.

Alternatively, add `?local` to that URL, for example:

```text
http://127.0.0.1:5173/?local
```

Use the port your terminal shows; it may be different. Save any existing browser drawing before switching to file sync.

## 3. Ask your agent to draw

Use this Lattice folder as the workspace in Codex Desktop or Claude Code:

```text
C:\Users\bensu\source\repos\Lattice
```

Paste this prompt:

> Read AGENTS.md. Create a fox glyph in glyphs/current.glyph. Run npm run glyph, open glyphs/current.png to inspect it, and refine the drawing. Edit the glyph files, not the app code.

Replace “fox” with whatever you want. Keep the browser open to see the changes.

## How it works

- `glyphs/current.glyph` is the grid: `#` fills a square, `.` leaves it empty. Each line is one row.
- `glyphs/current.json` controls the name, colour, roundness and spacing.
- File edits appear in the editor within about a second. Drawing in the editor writes back to the same files; click away from a changed control to let it sync.
- `npm run glyph` creates `glyphs/current.png` for visual inspection and `glyphs/current.svg` for export. It also works when the editor is closed.

To keep a glyph before making another, copy both `current.glyph` and `current.json` under a new matching name, such as `fox.glyph` and `fox.json`.

## If something goes wrong

- **No updates?** Check that `npm run dev` is still running and the browser URL ends in `?local`.
- **Invalid grid?** Use only `.` and `#`, with exactly 8, 16, 24 or 32 rows and the same number of characters in every row.
- **Sync paused?** The file and browser changed at the same time. Click **Save editable file** to keep your browser version, then reload to load the file version.
- **`npm` not recognised?** Install Node.js 22.12 or newer, then reopen PowerShell.

This setup is ready for local coding agents with file and terminal access. Ordinary Claude Desktop chat needs additional file and command access; this project does not configure that connection.
