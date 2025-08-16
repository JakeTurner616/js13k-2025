// src/engine/scenes/objects/drawRoof.ts
import { drawAntenna } from "./drawAntenna";
import type { BuildingVariant } from "./types";

const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n);

const poly = (c: CanvasRenderingContext2D, fill: string, pts: [number, number][]) => {
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) c.lineTo(...pts[i]);
  c.closePath();
  c.fill();
};

export function drawRoof(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  fwLeft: number, fwRight: number,
  side: number, depth: number,
  v: BuildingVariant & { blinkOffset?: number }, time: number
) {
  const fwSum = side + fwRight;

  // Convert ~0.75 device px to local units (handles BackgroundScene's ctx.scale)
  const tr = (ctx as any).getTransform ? ctx.getTransform() : { a: 1, d: 1 };
  const ey = 0.75 / (tr as any).d; // small Y overdraw to hide seams

  // Roof top plane — overlap down onto walls along the shared edges
  poly(ctx, "#555", [
    [x,            y + ey],
    [x + fwLeft,   y - depth],         // back edge (no seam needed)
    [x + fwSum,    y + ey],
    [x + side,     y + depth + ey]
  ]);

  if (!v.hat) return;

  // Hat sizing decoupled from building height
  const pad =
    (v as any).hatOverhangPx ??
    clamp(Math.round(side * 0.08), 3, 8);

  const hh =
    (v as any).hatHeightPx ??
    clamp(Math.round(depth * 0.55), 6, 12);

  // Fascias first (they already overlap down onto roof plane)
  poly(ctx, "#444", [
    [x - pad,      y - hh],
    [x,            y + ey],            // base overlaps roof
    [x + side,     y + depth + ey],    // base overlaps roof
    [x + side,     y - hh + depth]
  ]);

  poly(ctx, "#333", [
    [x + side,        y - hh + depth],
    [x + side,        y + depth + ey], // base overlaps roof
    [x + fwSum,       y + ey],         // base overlaps roof
    [x + fwSum + pad, y - hh]
  ]);

  // Hat lid LAST, shifted down slightly to overlap fascias and kill that seam
  poly(ctx, "#666", [
    [x - pad,         y - hh + ey],
    [x + fwLeft,      y - hh - depth + ey],
    [x + fwSum + pad, y - hh + ey],
    [x + side,        y - hh + depth + ey]
  ]);

  // Antenna (optional) — stays on top
  if (v.hasAntenna && v.antennaHeight && v.antennaRungs) {
    drawAntenna(
      ctx,
      x + fwLeft * 0.5,
      y - hh + ey, // align with lid shift
      v.antennaHeight,
      v.antennaRungs,
      time,
      false,
      v.blinkOffset ?? 0
    );
  }
}
