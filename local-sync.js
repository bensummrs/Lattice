export function connectLocalFile({ editor, canvasEditor, notify }) {
  const status = document.getElementById("local-file");
  let baseline;
  let revision;
  let stopped = false;
  let pointerDown = false;
  window.addEventListener("pointerdown", () => {
    pointerDown = true;
  });
  window.addEventListener("pointerup", () => {
    pointerDown = false;
  });
  window.addEventListener("pointercancel", () => {
    pointerDown = false;
  });
  window.addEventListener("blur", () => {
    pointerDown = false;
  });

  async function sync() {
    try {
      if (pointerDown || document.activeElement.matches("input, select"))
        return;
      const before = JSON.stringify(editor.design);
      const dirty = baseline !== undefined && before !== baseline;
      const response = await fetch(
        "/__glyph",
        dirty
          ? {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ design: editor.design, revision }),
            }
          : { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) stopped = true;
        throw new Error(result.error);
      }
      // Keep edits made while the request was in flight for the next save.
      if (dirty) {
        baseline = before;
        revision = result.revision;
      } else if (!pointerDown && JSON.stringify(editor.design) === before) {
        if (revision !== result.revision) {
          editor.change(() => result.design);
          canvasEditor.clampCursor();
        }
        baseline = JSON.stringify(result.design);
        revision = result.revision;
      }
      status.textContent = "Synced to glyphs/current.glyph";
    } catch (error) {
      status.textContent = error.message;
      if (stopped) notify(error.message);
    } finally {
      if (!stopped) setTimeout(sync, 750);
    }
  }
  sync();
}
