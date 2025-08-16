// src/engine/scenes/objects/drawWalls.ts
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
  fwRight: number,
  side: number, fh: number, depth: number,
  wallLeftColor: string, wallRightColor: string
) {
  const fwSum = side + fwRight;

  // Convert ~0.5 device px into local coords (handles BackgroundScene's ctx.scale)
  const tr = (ctx as any).getTransform ? ctx.getTransform() : { a: 1, d: 1 };
  const ex = 0.5 / (tr as any).a;  // x overlap in world units
  const ey = 0.5 / (tr as any).d;  // y overlap in world units

  // Draw RIGHT wall first…
  poly(ctx, wallRightColor, [
    [x + side - ex,  y + depth],
    [x + fwSum,      y],
    [x + fwSum,      y + fh + ey],     // extend slightly to hide bottom seam
    [x + side - ex,  y + fh + depth]
  ]);

  // …then LEFT wall, overlapping shared vertical edge by ex
  poly(ctx, wallLeftColor, [
    [x,              y],
    [x,              y + fh + ey],     // tiny overdraw
    [x + side + ex,  y + fh + depth],
    [x + side + ex,  y + depth]
  ]);
}
