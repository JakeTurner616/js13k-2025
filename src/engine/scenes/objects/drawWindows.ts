import type { BuildingVariant } from "./types";

export function drawWindows(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  v: BuildingVariant,
  cL: number, cR: number,
  fwL: number, fwR: number,
  side: number, fh: number, depth: number,
  time: number
) {
  const winW = 8, hSpace = 6, rows = v.rows, vMar = fh * .1,
    winArea = fh - vMar * 2, winH = Math.min(16, Math.max(8, winArea / (rows * 1.5))),
    rowGap = (winArea - rows * winH) / (rows + 1),
    lights = v.windowLights ?? [],
    LIT_L = "#fce473", UN_L = "#1a1a1a", LIT_R = "#ffd966", UN_R = "#111";

  const drawWin = (wx: number, wy: number, d0: number, d1: number, left: boolean, lit: boolean) => {
    const fs = lit ? (left ? LIT_L : LIT_R) : (left ? UN_L : UN_R);
    ctx.fillStyle = fs;
    ctx.beginPath();
    if (left) {
      ctx.moveTo(wx, wy + d0);
      ctx.lineTo(wx + winW * .5, wy + d1);
      ctx.lineTo(wx + winW * .5, wy + d1 + winH);
      ctx.lineTo(wx, wy + d0 + winH);
    } else {
      ctx.moveTo(wx, wy + d0);
      ctx.lineTo(wx + winW, wy + d1);
      ctx.lineTo(wx + winW, wy + d1 + winH);
      ctx.lineTo(wx, wy + d0 + winH);
    }
    ctx.closePath();
    ctx.fill();
    if (lit) {
      const tOff = (wx + wy) * .1 % Math.PI, pulse = Math.sin(time * 2 + tOff);
      ctx.save();
      ctx.shadowColor = fs;
      ctx.shadowBlur = 2 + Math.sin(time * 4 + tOff) * .1;
      ctx.globalAlpha = .2 + .3 * pulse;
      ctx.fill();
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
        drawWin(wx, wy, d0, d1, left, col === LIT_L || col === LIT_R);
      }
    }
  };

  renderSide(cL, x, y, fwL, 1, true);
  renderSide(cR, x + side, y + depth, fwR, -1, false);
}
