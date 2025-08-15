// Tiny smooth camera: continuous Y target + spring; X EMA. Keep floats; snap in draw.
const { max, min, pow } = Math;
export type Cam = { x:number, y:number };

export function updateSmoothCamera(
  cam: Cam,
  tx: number, ty: number,         // target world pos
  sw: number, sh: number,          // screen size
  ww: number, wh: number,          // world size
  smoothX = 0.14,                  // 0..1 (X EMA)
  dt = 1/60,
  upwardBias = true                // faster up than down
){
  const hw = sw * .5, hh = sh * .5;

  // --- X: simple EMA ---
  const kx = 1 - pow(1 - smoothX, dt * 60);
  const cx = cam.x + (tx - cam.x) * kx;

  // --- Y: continuous desired center via smoothstep between safe lines ---
  // screen-space player y (no current transform)
  const sy = (hh - cam.y) + ty;
  const TOP = 56, BOT = sh * 0.62;            // safe lines
  const wantTop = ty - (hh - TOP);
  const wantBot = ty - (hh - BOT);
  // normalize inside [TOP..BOT] and smoothstep
  let a = (sy - TOP) / (BOT - TOP);
  if (a < 0) a = 0; else if (a > 1) a = 1;
  const s = a * a * (3 - 2 * a);              // smoothstep
  const targetCy = wantTop * (1 - s) + wantBot * s;

  // --- Critically-damped spring toward targetCy (fast up, gentle down) ---
  const vyKey = '__vy';
  const rawVy = (cam as any)[vyKey];
  let vy: number = (typeof rawVy === 'number' && isFinite(rawVy)) ? rawVy : 0;

  const up = cam.y > targetCy;                // "up" = smaller y
  const w  = up ? (upwardBias ? 6.0 : 4.5) : (upwardBias ? 3.2 : 4.5); // rad/s
  let cy = cam.y;
  if (w > 0) {
    const err = cy - targetCy;
    const acc = -2*w*vy - (w*w)*err;
    vy += acc * dt;
    // tiny clamp to avoid bursts in small worlds
    const VMAX = 900; if (vy >  VMAX) vy =  VMAX; if (vy < -VMAX) vy = -VMAX;
    cy += vy * dt;
  }

  // --- generous clamps with overscan (lets short maps scroll) ---
  const smallW = ww <= sw, smallH = wh <= sh;
  const clampXMin = smallW ? ww * .5 : hw;
  const clampXMax = smallW ? ww * .5 : (ww - hw);
  const clampYMin = smallH ? wh * .5 : (hh - sh);        // one-screen overscan
  const clampYMax = smallH ? wh * .5 : (wh - hh + sh);

  cam.x = max(clampXMin, min(clampXMax, cx));
  cam.y = max(clampYMin, min(clampYMax, cy));
  (cam as any)[vyKey] = vy;
}
