// js13k-ts/src/engine/scenes/objects/drawAntenna.ts
import { drawBlinkingLight } from "./lights";

export function drawAntenna(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  poleHeight: number,
  rungs: number,
  time: number,
  glowOnly = false,
  blinkOffset = 0
) {
  if (!glowOnly) {
    ctx.strokeStyle = "#444";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - poleHeight);
    ctx.stroke();

    for (let i = 1; i <= rungs; i++) {
      const y = cy - (poleHeight * i) / (rungs + 1);
      ctx.beginPath();
      ctx.moveTo(cx - 3, y);
      ctx.lineTo(cx + 3, y);
      ctx.stroke();
    }
  }

  // Use offset to shift PHASE and slightly jitter SPEED so cycles drift apart
  const phaseShift = blinkOffset;                 // 0..1
  const speedJitter = 0.85 + blinkOffset * 0.5;   // ~0.85..1.35 Hz
  const duty = 0.18 + (blinkOffset * 0.08);       // ~0.18..0.26 on-time

  drawBlinkingLight(
    ctx,
    cx,
    cy - poleHeight - 3,
    "#ff2020",
    2,
    time + phaseShift,
    speedJitter,
    duty
  );
}
