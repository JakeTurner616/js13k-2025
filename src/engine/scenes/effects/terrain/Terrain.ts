// src/engine/scenes/effects/terrain/Terrain.ts
// Tiny, no-registration terrain: factory + two prebuilt layers.

type Drawer = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, camX: number) => void;

function ridge(x: number, s: number) {
  // 3-frequency sum with seed offsets; cheap & smooth
  return (
    Math.sin(x * 0.018 + s) * 0.6 +
    Math.sin(x * 0.034 + s * 1.7) * 0.3 +
    Math.sin(x * 0.058 + s * 2.3) * 0.15
  ) * 0.5 + 0.5;
}

function createMountainLayer(
  seed: number,
  parallax: number,
  base: number,   // 0..1 screen height
  amp: number,    // px amplitude
  top: string,
  bot: string
): Drawer {
  return (ctx, w, h, _t, camX) => {
    const off = camX * parallax, y0 = h * base;
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 2) {
      const r = ridge(x + off, seed);
      const y = Math.min(h - 1, Math.max(h * 0.22, y0 + (r - 0.5) * amp));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1; ctx.stroke();
  };
}

// === New fractal mountain layer ===
function createFractalMountainLayer(
  seed: number,
  parallax: number,
  base: number,
  amp: number,
  color: string
): Drawer {
  const fbm = (x: number, y: number, s: number) => {
    let a = 0, b = 1;
    for (let o = 0; o < 4; o++) {
      a += b * (
        Math.sin(x * 0.02 + s) +
        Math.sin(y * 0.02 + s * 1.3) +
        Math.sin((x + y) * 0.015 + s * 2.1)
      ) / 3;
      b *= 0.5; x *= 1.8; y *= 1.8;
    }
    return a * 0.5 + 0.5;
  };

  return (ctx, w, h, _t, camX) => {
    const offX = camX * parallax, s = seed;
    const yBase = h * base;
    const step = 2;
    for (let px = 0; px < w; px += step) {
      for (let py = 0; py < h * 0.5; py += step) {
        const wx = (px + offX) * 0.6, wy = py * 0.6;
        const wxw = wx + fbm(wx * 0.5, wy * 0.5, s) * 40;
        const wyw = wy + fbm(wx * 0.5 + 100, wy * 0.5 + 100, s) * 30;
        const n = fbm(wxw, wyw, s * 0.7);
        const mask = Math.max(0, Math.min(1, (n - 0.5) / 0.15));
        if (mask > 0 && py > h * 0.25) {
          ctx.fillStyle = color;
          ctx.fillRect(px, yBase + py - (amp * mask), step, step);
        }
      }
    }
  };
}

const behindLayers: Drawer[] = [
  createMountainLayer(11, 0.18, 0.70, 28, "#0b0e19", "#0a0b13"),
  createMountainLayer(23, 0.28, 0.76, 20, "#121624", "#0e111c"),
  // New fractal silhouette layer
  createFractalMountainLayer(7, 0.4, 0.72, 60, "#1d2230")
];

const frontLayers: Drawer[] = [
  // Subtle ground mist
  (_ctx, _w, _h, _t, _camX) => {}
];

export function drawTerrainBehind(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, camX: number) {
  for (const d of behindLayers) d(ctx, w, h, t, camX);
}

export function drawTerrainFront(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, camX: number) {
  for (const d of frontLayers) d(ctx, w, h, t, camX);
}
