import { drawWalls } from "./drawWalls";
import { drawColumns } from "./drawColumns";
import { drawWindows } from "./drawWindows";
import { drawRoof } from "./drawRoof";
import type { BuildingVariant } from "./types";

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  variant: BuildingVariant,
  time: number
) {
  const winW = 8;
  const hSpacing = 6;

  const colsLeft = variant.colsLeft;
  const colsRight = variant.colsRight ?? colsLeft;

  const fwLeft = colsLeft * winW + (colsLeft - 1) * hSpacing;
  const fwRight = colsRight * winW + (colsRight - 1) * hSpacing;
  const fh = variant.h;
  const side = fwLeft * 0.5;
  const depth = fh * 0.03; // super important for perspective

  drawWalls(
    ctx,
    x,
    y,
    fwLeft,
    fwRight,
    side,
    fh,
    depth,
    variant.wallLeftColor ?? "#333",
    variant.wallRightColor ?? "#222"
  );

  if (variant.columns) {
    drawColumns(ctx, x, y, colsLeft, colsRight, fwLeft, fwRight, side, fh, depth);
  }

  drawWindows(ctx, x, y, variant, colsLeft, colsRight, fwLeft, fwRight, side, fh, depth, time);

  drawRoof(ctx, x, y, fwLeft, fwRight, side, fh, depth, variant, time);
}
