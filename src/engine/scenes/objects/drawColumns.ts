export function drawColumns(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  cL: number, cR: number,
  fwL: number, fwR: number,
  side: number, fh: number, depth: number
) {
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
}