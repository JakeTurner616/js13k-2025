// src/engine/renderer/initCanvas.ts

export function setupCanvasPair(w: number, h: number, maskW = 48, maskH = 48) {
  const c = document.createElement("canvas"),
        g = document.createElement("canvas"),
        m = document.createElement("canvas"),
        all = [c, g];

  all.forEach(el => {
    el.width = w;
    el.height = h;
    el.style.cssText = "position:absolute;image-rendering:pixelated";
    document.body.appendChild(el);
  });

  Object.assign(g.style, { zIndex: "1", pointerEvents: "none" });

  // ✅ Mask canvas is now configurable
  m.width = maskW;
  m.height = maskH;

  const resize = () => {
    const s = Math.floor(Math.min(innerWidth / w, innerHeight / h)),
          W = w * s + "px",
          H = h * s + "px";
    all.forEach(el => Object.assign(el.style, { width: W, height: H }));
  };

  addEventListener("resize", resize);
  resize();

  return {
    canvas: c,
    glCanvas: g,
    mask: m,
    ctx: c.getContext("2d")!,
    maskCtx: m.getContext("2d")!
  };
}
