const HISTORY_LIMIT = 100;

export function createEditorState(initialDesign, { onChange, onRender }) {
  let design = initialDesign;
  const undoStack = [];
  let redoStack = [];

  function commit(before) {
    if (JSON.stringify(before) === JSON.stringify(design)) {
      onRender();
      return;
    }

    undoStack.push(before);
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack = [];
    onChange(design);
    onRender();
  }

  return {
    get design() {
      return design;
    },
    get canUndo() {
      return undoStack.length > 0;
    },
    get canRedo() {
      return redoStack.length > 0;
    },
    snapshot() {
      return structuredClone(design);
    },
    commit,
    change(action) {
      const before = structuredClone(design);
      design = action(design) ?? design;
      commit(before);
    },
    history(direction) {
      const source = direction === "undo" ? undoStack : redoStack;
      const destination = direction === "undo" ? redoStack : undoStack;
      if (!source.length) return;

      destination.push(structuredClone(design));
      design = source.pop();
      onChange(design);
      onRender();
    },
  };
}
