// initCanvas.ts
export function setupCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}
