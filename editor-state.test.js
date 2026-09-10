import test from "node:test";
import assert from "node:assert/strict";
import { createDesign } from "./drawing.js";
import { createEditorState } from "./editor-state.js";

function createEditor() {
  const changes = [];
  let renders = 0;
  const editor = createEditorState(createDesign(8), {
    onChange: (design) => changes.push(structuredClone(design)),
    onRender: () => renders++,
  });
  return { editor, changes, rendered: () => renders };
}

test("changes can mutate or replace a design and are undoable", () => {
  const { editor, changes } = createEditor();
  editor.change((design) => {
    design.name = "First";
  });
  editor.change((design) => ({ ...design, name: "Second" }));

  assert.equal(editor.design.name, "Second");
  assert.equal(editor.canUndo, true);
  assert.equal(editor.canRedo, false);
  assert.equal(changes.length, 2);

  editor.history("undo");
  assert.equal(editor.design.name, "First");
  assert.equal(editor.canRedo, true);
  editor.history("redo");
  assert.equal(editor.design.name, "Second");
});

test("no-op changes render without creating history or saving", () => {
  const { editor, changes, rendered } = createEditor();
  editor.change(() => {});

  assert.equal(editor.canUndo, false);
  assert.equal(changes.length, 0);
  assert.equal(rendered(), 1);
});

test("an in-progress canvas edit can be committed from a snapshot", () => {
  const { editor, changes } = createEditor();
  const before = editor.snapshot();
  editor.design.pixels[0] = 1;
  editor.commit(before);

  assert.equal(changes.length, 1);
  assert.equal(editor.canUndo, true);
  editor.history("undo");
  assert.equal(editor.design.pixels[0], 0);
});

test("a new change clears redo history", () => {
  const { editor } = createEditor();
  editor.change((design) => {
    design.name = "First";
  });
  editor.history("undo");
  editor.change((design) => {
    design.name = "Different";
  });

  assert.equal(editor.canRedo, false);
});
