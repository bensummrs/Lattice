import { createCanvasEditor } from "./canvas-editor.js";
import { loadStoredDesign, storeDesign } from "./design-io.js";
import { createDesign, starterDesign } from "./drawing.js";
import {
  bindEditorControls,
  bindFileControls,
  bindHelpAndShortcuts,
} from "./editor-controls.js";
import { createEditorState } from "./editor-state.js";
import {
  $,
  buildPalette,
  buildStarters,
  createNotifier,
  renderDrawing,
  renderEditor,
} from "./editor-view.js";

const notify = createNotifier();
let tool = "draw";
let canvasEditor;

function restoreDesign() {
  try {
    return loadStoredDesign() ?? createDesign();
  } catch (error) {
    notify(
      "Could not restore the saved drawing. You can open a saved editable file.",
    );
    console.warn("Lattice restore failed:", error);
    return createDesign();
  }
}

function saveDesign(design) {
  try {
    storeDesign(design);
  } catch (error) {
    notify(
      "Browser saving is unavailable. Use “Save editable file” to keep your work.",
    );
    console.warn("Lattice save failed:", error);
  }
}

const editor = createEditorState(restoreDesign(), {
  onChange: saveDesign,
  onRender: () => renderEditor(editor, canvasEditor),
});

function change(action) {
  canvasEditor.finishStroke();
  editor.change(action);
}

function history(direction) {
  canvasEditor.finishStroke();
  editor.history(direction);
  canvasEditor.clampCursor();
}

function selectTool(selected) {
  canvasEditor.finishStroke();
  tool = selected;
  document
    .querySelectorAll("[data-tool]")
    .forEach((button) =>
      button.setAttribute("aria-pressed", button.dataset.tool === tool),
    );
}

canvasEditor = createCanvasEditor({
  board: $("board"),
  getDesign: () => editor.design,
  getSymmetry: () => $("symmetry").value,
  getTool: () => tool,
  onChange: change,
  onCommit: editor.commit,
  onDraw: () => renderDrawing(editor.design),
});

buildPalette((color) =>
  change((design) => {
    design.color = color;
  }),
);
buildStarters((name) => {
  change((design) => {
    const starter = starterDesign(name, design.size);
    return { ...design, name: starter.name, pixels: starter.pixels };
  });
  notify(`${name} is yours to play with. Undo restores the previous drawing.`);
});

const controls = {
  canvasEditor,
  change,
  editor,
  history,
  notify,
  selectTool,
};
bindEditorControls(controls);
bindFileControls(controls);
bindHelpAndShortcuts(controls);
renderEditor(editor, canvasEditor);

if (import.meta.env.DEV) {
  $("local-file").hidden = false;
  if (new URLSearchParams(location.search).has("local")) {
    const { connectLocalFile } = await import("./local-sync.js");
    connectLocalFile({ editor, canvasEditor, notify });
  }
}
