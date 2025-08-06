import { drawText } from "../font/fontEngine";

type Char = { ch: string; baseX: number; baseY: number; offset: number };

export class FloatingTitle {
  chars: Char[] = [];

  constructor(text: string, xOffset = 80, y = 30) {
    for (let i = 0; i < text.length; i++) {
      this.chars.push({
        ch: text[i],
        baseX: xOffset + i * 32,
        baseY: y,
        offset: i
      });
    }
  }

  drawShadow(ctx: CanvasRenderingContext2D, t: number) {
    const time = t / 1000;
    for (let f of this.chars) {
      const y = f.baseY + Math.sin(time * 2 + f.offset) * 3;
      drawText(
        ctx,
        f.ch,
        (f.baseX + 2) | 0,   // X offset for shadow
        (y + 2) | 0,         // Y offset for shadow
        4,
        "#111"               // Shadow color (dark)
      );
    }
  }

  drawMain(ctx: CanvasRenderingContext2D, t: number) {
    const time = t / 1000;
    for (let f of this.chars) {
      const y = f.baseY + Math.sin(time * 2 + f.offset) * 3;
      drawText(
        ctx,
        f.ch,
        f.baseX | 0,
        y | 0,
        4,
        "#fff"
      );
    }
  }
}
