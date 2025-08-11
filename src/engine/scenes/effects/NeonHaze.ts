// src/engine/scenes/effects/NeonHaze.ts
export function drawNeonHaze(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  cx: number
) {
  const s = Math.sin, C = ["255,80,180", "160,60,255"];
  for (let i = 0; i < 6; i++) {
    const bx = ((i * 300 + cx * .5) % (w + 200)) - 100;
    const by = h * .55 + s(t * .3 + i) * 20;
    const R  = 150 + s(t * .7 + i) * 40;
    const a  = .4 + .3 * s(t * .5 + i * 2);
    const g  = ctx.createRadialGradient(bx, by, 0, bx, by, R);
    g.addColorStop(0, `rgba(${C[i & 1]},${a})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(bx - R, by - R, R * 2, R * 2);
  }
}
