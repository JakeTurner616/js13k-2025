// src/engine/scenes/objects/drawBuilding.ts
// One-file building renderer: walls + columns + windows + roof + antenna + light.

export type BuildingVariant = {
  h: number;
  colsLeft: number;
  colsRight?: number;
  hat?: boolean;
  columns?: boolean;
  sills?: boolean;
  rows: number;
  hasAntenna?: boolean;
  antennaHeight?: number;
  antennaRungs?: number;
  wallLeftColor?: string;
  wallRightColor?: string;
  windowLights?: string[][]; // [row][column], shared for both walls
  // optional tuned pixels used by roof:
  hatOverhangPx?: number;
  hatHeightPx?: number;
  blinkOffset?: number;
};

const poly = (c: CanvasRenderingContext2D, fill: string, pts: [number, number][]) => {
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) c.lineTo(...pts[i]);
  c.closePath();
  c.fill();
};

const clamp = (n: number, lo: number, hi: number) => n < lo ? lo : n > hi ? hi : n;

// --- tiny light & antenna (inlined) ---
const blink = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: string, size: number,
  time: number, speed = 1, duty = .5
) => {
  const p = (time * speed) % 1;
  const on = p < duty;
  const a = on ? 1 - (p / duty) * .2 : .1;
  ctx.fillStyle = color;
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
};

const drawAntenna = (
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  poleHeight: number, rungs: number,
  time: number, glowOnly = false, blinkOffset = 0
) => {
  if (!glowOnly) {
    ctx.strokeStyle = "#444";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - poleHeight);
    ctx.stroke();
    for (let i = 1; i <= rungs; i++) {
      const y = cy - (poleHeight * i) / (rungs + 1);
      ctx.beginPath();
      ctx.moveTo(cx - 3, y);
      ctx.lineTo(cx + 3, y);
      ctx.stroke();
    }
  }
  const phase = blinkOffset;              // 0..1 phase shift
  const speed = 0.85 + blinkOffset * .5;  // drift
  const duty  = 0.18 + blinkOffset * .08;
  blink(ctx, cx, cy - poleHeight - 3, "#ff2020", 2, time + phase, speed, duty);
};

// --- walls ---
const drawWalls = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  fwRight: number, side: number, fh: number, depth: number,
  wallLeftColor: string, wallRightColor: string
) => {
  const fwSum = side + fwRight;
  const tr = (ctx as any).getTransform ? ctx.getTransform() : { a: 1, d: 1 };
  const ex = 0.5 / (tr as any).a, ey = 0.5 / (tr as any).d;

  // RIGHT wall first
  poly(ctx, wallRightColor, [
    [x + side - ex,  y + depth],
    [x + fwSum,      y],
    [x + fwSum,      y + fh + ey],
    [x + side - ex,  y + fh + depth]
  ]);

  // LEFT wall overlaps shared edge slightly
  poly(ctx, wallLeftColor, [
    [x,              y],
    [x,              y + fh + ey],
    [x + side + ex,  y + fh + depth],
    [x + side + ex,  y + depth]
  ]);
};

// --- columns ---
const drawColumns = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  cL: number, cR: number,
  fwL: number, fwR: number,
  side: number, fh: number, depth: number
) => {
  const winW = 8, hSpace = 6;
  const drawSide = (cols: number, baseX: number, baseY: number, wallW: number, dMul: number, fill: string) => {
    ctx.fillStyle = fill;
    for (let c = 1; c < cols; c++) {
      const lx = c * (winW + hSpace) - hSpace / 2,
        x0 = baseX + (dMul > 0 ? lx * .5 : lx),
        d0 = (lx / wallW) * depth * dMul,
        d1 = ((lx + 1) / wallW) * depth * dMul,
        y0 = baseY, y1 = baseY + fh;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + d0);
      ctx.lineTo(x0 + 0.5 * dMul, y0 + d1);
      ctx.lineTo(x0 + 0.5 * dMul, y1 + d1);
      ctx.lineTo(x0, y1 + d0);
      ctx.closePath();
      ctx.fill();
    }
  };
  drawSide(cL, x, y, fwL, 1, "#444");
  drawSide(cR, x + side, y + depth, fwR, -1, "#333");
};

// --- windows ---
const drawWindows = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  v: BuildingVariant,
  cL: number, cR: number,
  fwL: number, fwR: number,
  side: number, fh: number, depth: number,
  time: number
) => {
  const winW = 8, hSpace = 6, rows = v.rows, vMar = fh * .1,
    winArea = fh - vMar * 2, winH = Math.min(16, Math.max(8, winArea / (rows * 1.5))),
    rowGap = (winArea - rows * winH) / (rows + 1),
    lights = v.windowLights ?? [],
    LIT_L = "#fce473", UN_L = "#1a1a1a", LIT_R = "#ffd966", UN_R = "#111";
  const OVERLAP = 2;

  const drawWin = (wx: number, wy: number, d0: number, d1: number, left: boolean, lit: boolean, overlap: boolean) => {
    const fs = lit ? (left ? LIT_L : LIT_R) : (left ? UN_L : UN_R);
    ctx.fillStyle = fs;
    ctx.beginPath();
    if (left) {
      ctx.moveTo(wx, wy + d0);
      ctx.lineTo(wx + winW * .5 + (overlap ? OVERLAP : 0), wy + d1);
      ctx.lineTo(wx + winW * .5 + (overlap ? OVERLAP : 0), wy + d1 + winH);
      ctx.lineTo(wx, wy + d0 + winH);
    } else {
      ctx.moveTo(wx - (overlap ? OVERLAP : 0), wy + d0);
      ctx.lineTo(wx + winW, wy + d1);
      ctx.lineTo(wx + winW, wy + d1 + winH);
      ctx.lineTo(wx - (overlap ? OVERLAP : 0), wy + d0 + winH);
    }
    ctx.closePath();
    ctx.fill();
    if (lit) {
      const tOff = (wx + wy) * .1 % Math.PI, pulse = Math.sin(time * 2 + tOff);
      ctx.save();
      ctx.shadowColor = fs;
      ctx.shadowBlur = 2 + Math.sin(time * 4 + tOff) * .1;
      ctx.globalAlpha = .2 + .3 * pulse;
      ctx.fill(); // re-fill to apply glow
      ctx.restore();
    }
  };

  const renderSide = (cols: number, baseX: number, baseY: number, wallW: number, dMul: number, left: boolean) => {
    for (let r = 0; r < rows; r++) {
      const wy = baseY + vMar + rowGap * (r + 1) + winH * r;
      for (let c = 0; c < cols; c++) {
        const lx = c * (winW + hSpace), wx = baseX + (left ? lx * .5 : lx),
          d0 = (lx / wallW) * depth * dMul, d1 = ((lx + winW) / wallW) * depth * dMul;
        const idx = left ? c : (c === 0 ? v.colsLeft - 1 : c);
        const col = lights[r]?.[idx];
        const overlap = (left && c === cols - 1) || (!left && c === 0);
        drawWin(wx, wy, d0, d1, left, col === LIT_L || col === LIT_R, overlap);
      }
    }
  };

  renderSide(cL, x, y, fwL, 1, true);
  renderSide(cR, x + side, y + depth, fwR, -1, false);
};

// --- roof (calls antenna) ---
const drawRoof = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  fwLeft: number, fwRight: number,
  side: number, depth: number,
  v: BuildingVariant, time: number
) => {
  const fwSum = side + fwRight;
  const tr = (ctx as any).getTransform ? ctx.getTransform() : { a: 1, d: 1 };
  const ey = 0.75 / (tr as any).d; // small Y overdraw to hide seams

  // top plane (overlaps onto walls)
  poly(ctx, "#555", [
    [x,            y + ey],
    [x + fwLeft,   y - depth],
    [x + fwSum,    y + ey],
    [x + side,     y + depth + ey]
  ]);

  if (!v.hat) return;

  const pad = (v as any).hatOverhangPx ?? clamp(Math.round(side * .08), 3, 8);
  const hh  = (v as any).hatHeightPx  ?? clamp(Math.round(depth * .55), 6, 12);

  // fascias
  poly(ctx, "#444", [
    [x - pad,      y - hh],
    [x,            y + ey],
    [x + side,     y + depth + ey],
    [x + side,     y - hh + depth]
  ]);
  poly(ctx, "#333", [
    [x + side,        y - hh + depth],
    [x + side,        y + depth + ey],
    [x + fwSum,       y + ey],
    [x + fwSum + pad, y - hh]
  ]);

  // hat lid (last), shifted down slightly to kill seam
  poly(ctx, "#666", [
    [x - pad,         y - hh + ey],
    [x + fwLeft,      y - hh - depth + ey],
    [x + fwSum + pad, y - hh + ey],
    [x + side,        y - hh + depth + ey]
  ]);

  // antenna (optional)
  if (v.hasAntenna && v.antennaHeight && v.antennaRungs) {
    drawAntenna(
      ctx,
      x + fwLeft * .5,
      y - hh + ey,
      v.antennaHeight,
      v.antennaRungs,
      time,
      false,
      (v as any).blinkOffset ?? 0
    );
  }
};

// === public: drawBuilding ===
export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  variant: BuildingVariant,
  time: number
) {
  const winW = 8, hSpacing = 6;

  const colsLeft = variant.colsLeft;
  const colsRight = variant.colsRight ?? colsLeft;

  const fwLeft = colsLeft * winW + (colsLeft - 1) * hSpacing;
  const fwRight = colsRight * winW + (colsRight - 1) * hSpacing;
  const fh = variant.h;
  const side = fwLeft * .5;
  const depth = fh * .03;

  drawWalls(
    ctx, x, y, fwRight, side, fh, depth,
    variant.wallLeftColor ?? "#333",
    variant.wallRightColor ?? "#222"
  );

  if (variant.columns) {
    drawColumns(ctx, x, y, colsLeft, colsRight, fwLeft, fwRight, side, fh, depth);
  }

  drawWindows(ctx, x, y, variant, colsLeft, colsRight, fwLeft, fwRight, side, fh, depth, time);
  drawRoof(ctx, x, y, fwLeft, fwRight, side, depth, variant, time);
}
