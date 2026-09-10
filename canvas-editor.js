import { floodFill, linePoints, paint, pixelRects } from "./drawing.js";

export function createCanvasEditor({
  board,
  getDesign,
  getSymmetry,
  getTool,
  onChange,
  onCommit,
  onDraw,
}) {
  const context = board.getContext("2d");
  let stroke = null;
  let cursor = { x: 0, y: 0 };
  let keyboardCursor = false;
  let framePending = false;
  let showGrid = true;

  function draw() {
    const design = getDesign();
    const bounds = board.getBoundingClientRect();
    const resolution = Math.round(bounds.width * window.devicePixelRatio);
    if (board.width !== resolution) board.width = board.height = resolution;
    const unit = board.width / design.size;
    context.setTransform(unit, 0, 0, unit, 0, 0);
    context.clearRect(0, 0, design.size, design.size);
    context.fillStyle = design.color;
    for (const { x, y, width, radius } of pixelRects(design)) {
      context.beginPath();
      context.roundRect(x, y, width, width, radius);
      context.fill();
    }
    if (showGrid) {
      context.beginPath();
      context.strokeStyle = "#d7dccf";
      context.lineWidth = 1 / unit;
      for (let index = 0; index <= design.size; index++) {
        context.moveTo(index, 0);
        context.lineTo(index, design.size);
        context.moveTo(0, index);
        context.lineTo(design.size, index);
      }
      context.stroke();
    }
    if (keyboardCursor && document.activeElement === board) {
      context.strokeStyle = "#769534";
      context.lineWidth = 2 / unit;
      context.strokeRect(cursor.x + 0.08, cursor.y + 0.08, 0.84, 0.84);
    }
  }

  function scheduleDraw() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(() => {
      framePending = false;
      draw();
      onDraw();
    });
  }

  function pointAt(event) {
    const design = getDesign();
    const rect = board.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          design.size - 1,
          Math.floor(((event.clientX - rect.left) / rect.width) * design.size),
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          design.size - 1,
          Math.floor(((event.clientY - rect.top) / rect.height) * design.size),
        ),
      ),
    };
  }

  function finishStroke() {
    if (!stroke) return;
    const { before, pointerId } = stroke;
    stroke = null;
    if (board.hasPointerCapture(pointerId))
      board.releasePointerCapture(pointerId);
    onCommit(before);
  }

  board.addEventListener("pointerdown", (event) => {
    if (stroke || (event.button !== 0 && event.button !== 2)) return;
    event.preventDefault();
    board.focus({ preventScroll: true });
    keyboardCursor = false;
    const design = getDesign();
    const point = pointAt(event);
    const erase = event.button === 2 || getTool() === "erase";
    const value = erase
      ? 0
      : getTool() === "draw"
        ? 1 - design.pixels[point.y * design.size + point.x]
        : 1;
    stroke = {
      before: structuredClone(design),
      start: point,
      last: point,
      value,
      pointerId: event.pointerId,
      tool: erase ? "erase" : getTool(),
    };
    board.setPointerCapture(event.pointerId);
    if (stroke.tool === "fill")
      floodFill(design, point, value, getSymmetry());
    else paint(design, point, value, getSymmetry());
    scheduleDraw();
  });

  board.addEventListener("pointermove", (event) => {
    if (!stroke || event.pointerId !== stroke.pointerId || stroke.tool === "fill")
      return;
    const design = getDesign();
    const point = pointAt(event);
    if (stroke.tool === "line") design.pixels = [...stroke.before.pixels];
    for (const pixel of linePoints(
      stroke.tool === "line" ? stroke.start : stroke.last,
      point,
    )) {
      paint(design, pixel, stroke.value, getSymmetry());
    }
    stroke.last = point;
    scheduleDraw();
  });

  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    board.addEventListener(eventName, (event) => {
      if (event.pointerId === stroke?.pointerId) finishStroke();
    });
  }

  board.addEventListener("contextmenu", (event) => event.preventDefault());
  board.addEventListener("blur", scheduleDraw);
  board.addEventListener("keydown", (event) => {
    const design = getDesign();
    if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      keyboardCursor = true;
      cursor.x = Math.max(
        0,
        Math.min(
          design.size - 1,
          cursor.x + (event.key === "ArrowRight") - (event.key === "ArrowLeft"),
        ),
      );
      cursor.y = Math.max(
        0,
        Math.min(
          design.size - 1,
          cursor.y + (event.key === "ArrowDown") - (event.key === "ArrowUp"),
        ),
      );
      scheduleDraw();
    }
    if ([" ", "Enter", "Delete", "Backspace"].includes(event.key)) {
      event.preventDefault();
      keyboardCursor = true;
      onChange((currentDesign) => {
        const value =
          ["Delete", "Backspace"].includes(event.key) || getTool() === "erase"
            ? 0
            : 1 - currentDesign.pixels[cursor.y * currentDesign.size + cursor.x];
        if (getTool() === "fill")
          floodFill(currentDesign, cursor, value, getSymmetry());
        else paint(currentDesign, cursor, value, getSymmetry());
      });
    }
  });

  window.addEventListener("blur", finishStroke);
  new ResizeObserver(scheduleDraw).observe(board);

  return {
    draw,
    scheduleDraw,
    finishStroke,
    resetCursor() {
      cursor = { x: 0, y: 0 };
    },
    clampCursor() {
      const { size } = getDesign();
      cursor.x = Math.min(cursor.x, size - 1);
      cursor.y = Math.min(cursor.y, size - 1);
    },
    toggleGrid() {
      showGrid = !showGrid;
      draw();
      return showGrid;
    },
  };
}
