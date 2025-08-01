export function setupCanvasPair(width: number, height: number) {
  const canvas = document.createElement("canvas");
  const glCanvas = document.createElement("canvas");
  [canvas, glCanvas].forEach(c => {
    Object.assign(c, { width, height });
    c.style.position = "absolute";
    c.style.imageRendering = "pixelated";
    document.body.appendChild(c);
  });
  glCanvas.style.zIndex = "1";
  glCanvas.style.pointerEvents = "none";

  const mask = document.createElement("canvas");
  Object.assign(mask, { width: 48, height: 48 });

  function resize() {
    const scale = Math.floor(Math.min(
      window.innerWidth / width,
      window.innerHeight / height
    ));
    const w = width * scale + "px", h = height * scale + "px";
    [canvas, glCanvas].forEach(c => { c.style.width = w; c.style.height = h; });
  }
  window.addEventListener("resize", resize);
  resize();

  return {
    canvas, glCanvas, mask,
    ctx: canvas.getContext("2d")!,
    maskCtx: mask.getContext("2d")!
  };
}
