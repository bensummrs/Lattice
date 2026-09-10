import {
  downloadPng,
  downloadProject,
  downloadSvg,
  readProject,
} from "./design-io.js";
import { resizeDesign, transformPixels } from "./drawing.js";
import { $ } from "./editor-view.js";

export function bindEditorControls({
  canvasEditor,
  change,
  editor,
  history,
  notify,
  selectTool,
}) {
  document
    .querySelectorAll("[data-tool]")
    .forEach((button) =>
      button.addEventListener("click", () => selectTool(button.dataset.tool)),
    );
  $("undo").addEventListener("click", () => history("undo"));
  $("redo").addEventListener("click", () => history("redo"));
  $("grid").addEventListener("click", () => {
    $("grid").setAttribute("aria-pressed", canvasEditor.toggleGrid());
  });
  $("size").addEventListener("change", (event) => {
    change((design) => resizeDesign(design, Number(event.target.value)));
    canvasEditor.resetCursor();
    notify("Grid resized. Your drawing is centered. Undo to restore.");
  });
  $("rotate").addEventListener("click", () =>
    change((design) => {
      design.pixels = transformPixels(design, "rotate");
    }),
  );
  $("flip").addEventListener("click", () =>
    change((design) => {
      design.pixels = transformPixels(design, "flip");
    }),
  );
  $("clear").addEventListener("click", () => {
    change((design) => {
      design.pixels.fill(0);
    });
    notify("A fresh canvas. Undo brings your drawing back.");
  });
  $("name").addEventListener("change", (event) =>
    change((design) => {
      design.name = event.target.value.trim() || "Untitled icon";
    }),
  );

  let controlBefore = null;
  for (const property of ["roundness", "gap", "color"]) {
    $(property).addEventListener("input", (event) => {
      if (!controlBefore) controlBefore = editor.snapshot();
      editor.design[property] =
        property === "color" ? event.target.value : Number(event.target.value);
      $(`${property}-value`).textContent =
        property === "color"
          ? editor.design.color.toUpperCase()
          : `${editor.design[property]}%`;
      canvasEditor.scheduleDraw();
    });
    $(property).addEventListener("change", () => {
      if (!controlBefore) return;
      const before = controlBefore;
      controlBefore = null;
      editor.commit(before);
    });
  }
}

export function bindFileControls({ canvasEditor, change, editor, notify }) {
  $("export-svg").addEventListener("click", () =>
    downloadSvg(editor.design, $("transparent").checked),
  );
  $("export-png").addEventListener("click", () =>
    downloadPng(editor.design, $("transparent").checked, () =>
      notify("PNG export failed. Please try SVG instead."),
    ),
  );
  $("save-project").addEventListener("click", () =>
    downloadProject(editor.design),
  );
  $("open-project").addEventListener("click", () => $("file").click());
  $("file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const imported = await readProject(file);
      change(() => imported);
      canvasEditor.resetCursor();
      notify("Drawing opened. Make it yours.");
    } catch (error) {
      notify(
        error instanceof SyntaxError
          ? "This file is not valid JSON. Choose a saved Lattice file."
          : error.message,
      );
    }
    event.target.value = "";
  });
}

export function bindHelpAndShortcuts({ history, selectTool }) {
  $("help-button").addEventListener("click", () => $("help").showModal());
  $("close-help").addEventListener("click", () => $("help").close());
  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, select, textarea") || $("help").open) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      history(event.shiftKey ? "redo" : "undo");
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const shortcut = { b: "draw", e: "erase", f: "fill", l: "line" }[
      event.key.toLowerCase()
    ];
    if (shortcut) selectTool(shortcut);
    if (event.key === "?") $("help").showModal();
  });
}
