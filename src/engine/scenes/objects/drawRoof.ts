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
  side: number, fh: number, depth: number,
  v: BuildingVariant & { blinkOffset?: number }, time: number
) {
  const fwSum = side + fwRight;

  // Roof top plane
  poly(ctx, "#555", [
    [x, y],
    [x + fwLeft, y - depth],
    [x + fwSum, y],
    [x + side, y + depth]
  ]);

  if (!v.hat) return;

  // Hat sizing decoupled from building height (fh)
  const pad =
    (v as any).hatOverhangPx ??
    clamp(Math.round(side * 0.08), 3, 8);

  const hh =
    (v as any).hatHeightPx ??
    clamp(Math.round(depth * 0.55), 6, 12);

  // Hat lid
  poly(ctx, "#666", [
    [x - pad, y - hh],
    [x + fwLeft, y - hh - depth],
    [x + fwSum + pad, y - hh],
    [x + side, y - hh + depth]
  ]);

  // Hat left fascia
  poly(ctx, "#444", [
    [x - pad, y - hh],
    [x, y],
    [x + side, y + depth],
    [x + side, y - hh + depth]
  ]);

  // Hat right fascia
  poly(ctx, "#333", [
    [x + side, y - hh + depth],
    [x + side, y + depth],
    [x + fwSum, y],
    [x + fwSum + pad, y - hh]
  ]);

  // Antenna (optional)
  if (v.hasAntenna && v.antennaHeight && v.antennaRungs) {
    drawAntenna(
      ctx,
      x + fwLeft * 0.5,
      y - hh,
      v.antennaHeight,
      v.antennaRungs,
      time,
      false,
      v.blinkOffset ?? 0
    );
  }
}