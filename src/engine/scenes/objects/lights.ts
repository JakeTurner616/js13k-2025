// src/engine/scenes/objects/lights.ts

/**
 * Draws a blinking/pulsing light at (x,y)
 * @param ctx - canvas context
 * @param x,y - position
 * @param color - base color string (CSS)
 * @param size - radius in px
 * @param time - global time (seconds)
 * @param speed - blink speed multiplier
 * @param duty - portion of cycle light is ON (0–1)
 */
export function drawBlinkingLight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size: number,
  time: number,
  speed = 1,
  duty = 0.5
) {
  // Cycle goes 0..1
  const phase = (time * speed) % 1;
  const on = phase < duty;
  const alpha = on ? 1 - phase / duty * 0.2 : 0.1; // fade a bit while on
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
