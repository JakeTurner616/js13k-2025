import { drawText } from "../font/fontEngine";
import { applyPhysics, type PhysicsBody } from "../../player/Physics";

export class BouncingTitle {
  chars: (PhysicsBody & { ch: string; delay: number })[] = [];

  constructor(text: string, scale: number = 4) {
    for (let i = 0; i < text.length; i++) {
      this.chars.push({
        ch: text[i],
        pos: { x: 40 + i * 8 * scale, y: -999 },
        vel: { x: 0, y: 0 },
        width: 8 * scale,
        height: 8 * scale,
        grounded: false,
        gravity: 0.2,
        bounce: 0.5,
        delay: text.length - i - 1
      });
    }
  }

  update(t: number, ctx: CanvasRenderingContext2D, map: { width: number; height: number; tiles: number[] }) {
    const tick = ((t / 1000) * 10) | 0;
    for (let c of this.chars) {
      if (tick >= c.delay && c.pos.y === -999) c.pos.y = 0;
      if (c.pos.y !== -999) {
        applyPhysics(c, ctx, map, true);
        c.vel.x = 0;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (let c of this.chars) {
      if (c.pos.y !== -999) drawText(ctx, c.ch, c.pos.x | 0, c.pos.y | 0, 4, "#fff");
    }
  }
}
