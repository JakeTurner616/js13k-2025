const poly = (c: CanvasRenderingContext2D, fill: string, pts: [number, number][]) => {
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) c.lineTo(...pts[i]);
  c.closePath();
  c.fill();
};

export function drawWalls(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  fwLeft: number, fwRight: number,
  side: number, fh: number, depth: number,
  wallLeftColor: string, wallRightColor: string
) {
  const fwSum = side + fwRight;
  poly(ctx, "", [
    [x, y + fh],
    [x + fwLeft, y + fh - depth],
    [x + fwSum, y + fh],
    [x + side, y + fh + depth]
  ]);
  poly(ctx, wallLeftColor, [
    [x, y],
    [x, y + fh],
    [x + side, y + fh + depth],
    [x + side, y + depth]
  ]);
  poly(ctx, wallRightColor, [
    [x + side, y + depth],
    [x + fwSum, y],
    [x + fwSum, y + fh],
    [x + side, y + fh + depth]
  ]);
}
