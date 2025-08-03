import { glyphs, data } from "./procFont";

const BITS = 35;

export function drawChar(
  ctx: CanvasRenderingContext2D,
  ch: string,
  px: number,
  py: number,
  scale = 2,
  color = "#fff"
) {
  const i = glyphs.indexOf(ch);
  if (i < 0) return;

  const v = BigInt(parseInt(data.slice(i * 7, i * 7 + 7), 36));
  ctx.fillStyle = color;

  for (let y = 0, b = BITS - 1; y < 7; y++) {
    for (let x = 0; x < 5; x++, b--) {
      if ((v >> BigInt(b)) & 1n) {
        ctx.fillRect(px + x * scale, py + y * scale, scale, scale);
      }
    }
  }
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  scale = 2,
  color = "#fff"
) {
  for (let i = 0; i < str.length; i++) {
    drawChar(ctx, str[i].toUpperCase(), x + i * (5 + 1) * scale, y, scale, color);
  }
}
