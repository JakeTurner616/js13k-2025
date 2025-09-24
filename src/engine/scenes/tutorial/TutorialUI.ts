// src/engine/scenes/tutorial/TutorialUI.ts
//
// Tutorial UI module: world-space toasts, pings, tile-corner highlights,
// the state-based portal banner, and near-player jump/aim/release hints.
// Now with screen-clamped toasts/hints so boxes don't spill off-canvas,
// and color-coded M1/M2 in the top-of-screen prompt.
//
// No help/skip feature.
//

import { drawText as D } from "../../font/fontEngine";
import { getCurrentMap } from "../../renderer/level-loader";
import { isSolidTileId } from "../../../player/Physics";

const TILE = 16;

// Tile IDs used by renderer/levels
const GREY_TILE_ID  = 2;
const FINISH_ID     = 3;
const SPIKE_ID      = 4;

// ————————————————————————————————————————————————————————————————————————
// Portal hint state (no manual help toggle)
// ————————————————————————————————————————————————————————————————————————

export enum PortalHintState { Off = 0, NeedsPortal = 1 }

let ctx: CanvasRenderingContext2D | null = null;
let portalHintState: PortalHintState = PortalHintState.Off;

// ————————————————————————————————————————————————————————————————————————
// World-space toasts & pings
// ————————————————————————————————————————————————————————————————————————

type Token = { text: string; color: string };
type WToast = { wx: number; wy: number; t: number; dur: number; text?: string; tokens?: Token[] };
let wtoasts: WToast[] = [];

type Ping = { wx: number; wy: number; t: number; dur: number; col: string };
let pings: Ping[] = [];

// ————————————————————————————————————————————————————————————————————————
// Highlight “burst” timers (smooth fade)
// ————————————————————————————————————————————————————————————————————————

let blackBurstT = 0, blackBurstDur = 0;
let greyBurstT  = 0, greyBurstDur  = 0;
let spikeBurstT = 0, spikeBurstDur = 0;

// ————————————————————————————————————————————————————————————————————————
// Internal helpers
// ————————————————————————————————————————————————————————————————————————

const TOAST_MERGE_RADIUS = 14;

function mapY0(c:CanvasRenderingContext2D, map:{height:number}) {
  return c.canvas.height - map.height * TILE;
}

function tileToWorld(tx: number, ty: number) {
  const mp = getCurrentMap(); if (!mp || !ctx) return { x: 0, y: 0 };
  const Y0 = mapY0(ctx, mp);
  return { x: tx * TILE, y: Y0 + ty * TILE };
}

function getTileId(tx: number, ty: number) {
  const mp = getCurrentMap(); if (!mp) return 0;
  if (tx < 0 || ty < 0 || tx >= mp.width || ty >= mp.height) return 0;
  return (mp.tiles as any)[ty * mp.width + tx] as number;
}

function visibleTileBounds(cam:{x:number;y:number}) {
  const mp = getCurrentMap(); if (!mp || !ctx) return { x0:0,x1:-1,y0:0,y1:-1 };
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const x0w = cam.x - w*0.5, y0w = cam.y - h*0.5;
  const x1w = cam.x + w*0.5, y1w = cam.y + h*0.5;
  const tx0 = Math.floor(x0w / TILE);
  const tx1 = Math.ceil (x1w / TILE);
  const ty0 = Math.floor((y0w - mapY0(ctx, mp)) / TILE);
  const ty1 = Math.ceil ((y1w - mapY0(ctx, mp)) / TILE);
  return {
    x0: Math.max(0, tx0-1),
    x1: Math.min(mp.width-1, tx1+1),
    y0: Math.max(0, ty0-1),
    y1: Math.min(mp.height-1, ty1+1),
  };
}

function tokensKey(tokens: Token[]) {
  let s = "";
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i]; s += tk.text + "§" + tk.color + "¦";
  }
  return s;
}

function measureTokens(tokens: Token[]) {
  let w = 0; for (const tk of tokens) w += tk.text.length * 6;
  return w ? (w - 1) : 0;
}

// ————————————————————————————————————————————————————————————————————————
// Screen-space clamping helpers (for world-drawn labels/hints)
// Assumes the world->screen transform is a simple translate (which our scene uses).
// If you later add scaling/rotation, update these to use the full matrix inverse.
// ————————————————————————————————————————————————————————————————————————

function getScreenFromWorld(wx: number, wy: number) {
  const m = ctx!.getTransform();
  const sx = m.a * wx + m.c * wy + m.e;
  const sy = m.b * wx + m.d * wy + m.f;
  return { sx, sy };
}

function nudgeWorldForRect(
  wx: number,
  wy: number,
  rectLeft: number,
  rectTop: number,
  rectW: number,
  rectH: number
) {
  if (!ctx) return { wx, wy };
  const w = ctx.canvas.width, h = ctx.canvas.height;

  let dx = 0, dy = 0;
  const right = rectLeft + rectW;
  const bottom = rectTop + rectH;

  if (rectLeft < 0)      dx = -rectLeft;
  else if (right > w)    dx = w - right;

  if (rectTop < 0)       dy = -rectTop;
  else if (bottom > h)   dy = h - bottom;

  // Our transform is translation-only, so world nudge equals screen nudge.
  // If scaling is added later, divide by scale here.
  return { wx: wx + dx, wy: wy + dy };
}

// ————————————————————————————————————————————————————————————————————————
// Label drawing with clamping
// ————————————————————————————————————————————————————————————————————————

function drawWorldLabelTokens(c:CanvasRenderingContext2D, wx:number, wy:number, tokens:Token[]) {
  const tw = measureTokens(tokens);
  const pad = 3;
  const boxW = tw + pad * 2;
  const boxH = 12; // fixed height for token strip

  // Compute would-be screen rect
  const { sx, sy } = getScreenFromWorld(wx, wy);
  const rectLeft = (sx - (tw / 2)) - pad;
  const rectTop  = (sy - 12) - pad;

  // Nudge in world to keep on-screen
  const nudged = nudgeWorldForRect(wx, wy, rectLeft, rectTop, boxW, boxH);
  wx = nudged.wx; wy = nudged.wy;

  // Recompute top-left (world) after nudge
  const x0 = (wx - (tw/2))|0, y0 = (wy - 12)|0;

  c.save();
  c.fillStyle = "#000b";
  c.fillRect(x0 - pad, y0 - pad, boxW, boxH);
  let x = x0;
  for (const tk of tokens) {
    D(c, tk.text, x+1, y0+1, 1, "#000");
    D(c, tk.text, x,   y0,    1, tk.color);
    x += tk.text.length * 6;
  }
  c.restore();
}

function drawWorldLabelText(c:CanvasRenderingContext2D, wx:number, wy:number, text:string) {
  const tw = text.length*6 - 1;
  const pad = 3;
  const boxW = tw + pad * 2;
  const boxH = 12;

  const { sx, sy } = getScreenFromWorld(wx, wy);
  const rectLeft = (sx - (tw / 2)) - pad;
  const rectTop  = (sy - 12) - pad;

  const nudged = nudgeWorldForRect(wx, wy, rectLeft, rectTop, boxW, boxH);
  wx = nudged.wx; wy = nudged.wy;

  const x = (wx - (tw/2))|0, y = (wy - 12)|0;

  c.fillStyle = "#000b"; c.fillRect(x - pad, y - pad, boxW, boxH);
  D(c, text, x+1, y+1, 1, "#000");
  D(c, text, x,   y,   1, "#e5e7eb");
}

function drawTileCorners(
  c: CanvasRenderingContext2D,
  tx: number, ty: number,
  col = "#7aa2ff",
  t = 0,
  fade = 1
) {
  const { x, y } = tileToWorld(tx, ty);
  const m = 1.5, L = 5.5;
  const pulse = 0.55 + 0.35 * Math.sin(t * 4);
  c.save();
  c.globalAlpha = pulse * Math.max(0, Math.min(1, fade));
  c.strokeStyle = col;
  c.lineWidth = 1;
  c.beginPath();
  // TL
  c.moveTo(x + m,            y + m + L);
  c.lineTo(x + m,            y + m);
  c.lineTo(x + m + L,        y + m);
  // TR
  c.moveTo(x + TILE - m - L, y + m);
  c.lineTo(x + TILE - m,     y + m);
  c.lineTo(x + TILE - m,     y + m + L);
  // BL
  c.moveTo(x + m,            y + TILE - m - L);
  c.lineTo(x + m,            y + TILE - m);
  c.lineTo(x + m + L,        y + TILE - m);
  // BR
  c.moveTo(x + TILE - m - L, y + TILE - m);
  c.lineTo(x + TILE - m,     y + TILE - m);
  c.lineTo(x + TILE - m,     y + TILE - m - L);
  c.stroke();
  c.restore();
}

function burstAlpha(remaining: number, total: number) {
  if (total <= 0) return 0;
  const k = Math.max(0, Math.min(1, remaining / total));
  return k * k * (3 - 2 * k);
}

// ————————————————————————————————————————————————————————————————————————
// Public API
// ————————————————————————————————————————————————————————————————————————

export function setCanvas(c: CanvasRenderingContext2D) { ctx = c; }
export function resetAll() {
  wtoasts.length = 0; pings.length = 0;
  blackBurstT = blackBurstDur = 0;
  greyBurstT  = greyBurstDur  = 0;
  spikeBurstT = spikeBurstDur = 0;
  portalHintState = PortalHintState.Off;
}

export function tick(dt:number) {
  for (const t of wtoasts) t.t += dt;
  for (const p of pings)   p.t += dt;
  const z = (x:WToast) => x.t < x.dur;
  wtoasts = wtoasts.filter(z);
  pings   = pings.filter(p => p.t < p.dur);
  if (blackBurstT > 0) blackBurstT -= dt;
  if (greyBurstT  > 0) greyBurstT  -= dt;
  if (spikeBurstT > 0) spikeBurstT -= dt;
}

// Hint state controls
export function requirePortalHint() { portalHintState = PortalHintState.NeedsPortal; }
export function clearPortalHint()    { portalHintState = PortalHintState.Off; }

// Pings
export function pushPing(wx:number, wy:number, col="#ff4d4d", dur=0.35) {
  pings.push({ wx, wy, col, dur, t: 0 });
  if (pings.length > 10) pings.shift();
}

// Toasts
export function pushWorldToastTokens(tokens: Token[], wx: number, wy: number, dur = 2.0) {
  const key = tokensKey(tokens);
  for (let i = wtoasts.length - 1; i >= 0; i--) {
    const wt = wtoasts[i];
    if (wt.tokens && !wt.text && tokensKey(wt.tokens) === key) {
      const dx = wt.wx - wx, dy = wt.wy - wy;
      if (dx*dx + dy*dy <= TOAST_MERGE_RADIUS * TOAST_MERGE_RADIUS) {
        wt.wx = wx; wt.wy = wy; wt.t = 0; wt.dur = dur;
        return;
      }
    }
  }
  wtoasts.push({ tokens, wx, wy, t: 0, dur });
  if (wtoasts.length > 6) wtoasts.shift();
}

export function pushWorldToastText(text: string, wx: number, wy: number, dur = 2.0) {
  for (let i = wtoasts.length - 1; i >= 0; i--) {
    const wt = wtoasts[i];
    if (wt.text === text) {
      const dx = wt.wx - wx, dy = wt.wy - wy;
      if (dx*dx + dy*dy <= TOAST_MERGE_RADIUS * TOAST_MERGE_RADIUS) {
        wt.wx = wx; wt.wy = wy; wt.t = 0; wt.dur = dur;
        return;
      }
    }
  }
  wtoasts.push({ text, wx, wy, t: 0, dur });
  if (wtoasts.length > 6) wtoasts.shift();
}

// Bursts
export function burstBlack(dur=2.0){ blackBurstT = blackBurstDur = Math.max(blackBurstDur, dur); }
export function burstGrey (dur=2.2){ greyBurstT  = greyBurstDur  = Math.max(greyBurstDur,  dur); }
export function burstSpike(dur=2.3){ spikeBurstT = spikeBurstDur = Math.max(spikeBurstDur, dur); }

// WORLD drawing (called inside world transform)
export function drawWorld(c:CanvasRenderingContext2D, timeSec:number, cam:{x:number;y:number}) {
  // Tile highlights
  const mp = getCurrentMap();
  if (mp) {
    const vb = visibleTileBounds(cam);
    const fadeG = burstAlpha(greyBurstT,  greyBurstDur);
    const fadeB = burstAlpha(blackBurstT, blackBurstDur);
    const fadeS = burstAlpha(spikeBurstT, spikeBurstDur);

    const isBlack = (id:number) =>
      isSolidTileId(id) && id !== GREY_TILE_ID && id !== FINISH_ID && id !== SPIKE_ID;

    if (greyBurstT > 0 && fadeG > 0) {
      for (let ty = vb.y0; ty <= vb.y1; ty++) {
        for (let tx = vb.x0; tx <= vb.x1; tx++) {
          if (getTileId(tx, ty) === GREY_TILE_ID) {
            drawTileCorners(c, tx, ty, "#ff4d4d", timeSec, fadeG);
          }
        }
      }
    }
    if (blackBurstT > 0 && fadeB > 0) {
      for (let ty = vb.y0; ty <= vb.y1; ty++) {
        for (let tx = vb.x0; tx <= vb.x1; tx++) {
          if (isBlack(getTileId(tx, ty))) {
            drawTileCorners(c, tx, ty, "#7aa2ff", timeSec, fadeB);
          }
        }
      }
    }
    if (spikeBurstT > 0 && fadeS > 0) {
      for (let ty = vb.y0; ty <= vb.y1; ty++) {
        for (let tx = vb.x0; tx <= vb.x1; tx++) {
          if (getTileId(tx, ty) === SPIKE_ID) {
            drawTileCorners(c, tx, ty, "#ff4d4d", timeSec, fadeS);
          }
        }
      }
    }
  }

  // Pings
  for (const p of pings) {
    const k = p.t / p.dur;
    const a = Math.max(0, 1 - k);
    const r = 3 + k*10;
    c.save();
    c.globalAlpha = 0.4 * a;
    c.strokeStyle = p.col;
    c.lineWidth = 1;
    c.beginPath();
    c.arc(p.wx|0, p.wy|0, r, 0, Math.PI*2);
    c.stroke();
    c.restore();
  }

  // Toasts (with screen-space clamping via draw helpers)
  for (const wt of wtoasts) {
    const fadeIn  = Math.min(1, wt.t/0.15);
    const fadeOut = Math.min(1, (wt.dur - wt.t)/0.25);
    const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
    const bob = Math.sin((timeSec + wt.t)*6)*1.5;
    c.save(); c.globalAlpha = alpha;
    if (wt.tokens) drawWorldLabelTokens(c, wt.wx, wt.wy + bob, wt.tokens);
    else if (wt.text) {
      drawWorldLabelText(c, wt.wx, wt.wy + bob, wt.text);
    }
    c.restore();
  }
}

// ————————————————————————————————————————————————————————————————————————
// HUD drawing (accepts either a string or color tokens)
// ————————————————————————————————————————————————————————————————————————
export function drawHud(
  c: CanvasRenderingContext2D,
  timeSec: number,
  tutorial: string | Token[]
) {
  const w = c.canvas.width, h = c.canvas.height;

  // Compute width & draw box
  let tw = 0;
  const padX = 6, padY = 6;
  const y = 8;

  if (typeof tutorial === "string") {
    tw = tutorial.length * 6 - 1;
  } else {
    tw = measureTokens(tutorial);
  }

  const x = ((w - tw) / 2) | 0;
  const boxH = 12;

  c.fillStyle = "#0009";
  c.fillRect(x - padX, y - padY, tw + padX * 2, boxH + padY * 2);

  // Text
  if (typeof tutorial === "string") {
    D(c, tutorial, x + 1, y + 1, 1, "#000");
    D(c, tutorial, x,     y,     1, "#e5e7eb");
  } else {
    let xx = x;
    for (const tk of tutorial) {
      D(c, tk.text, xx + 1, y + 1, 1, "#000");
      D(c, tk.text, xx,     y,     1, tk.color);
      xx += tk.text.length * 6;
    }
  }

  // State-based “Portals only stick to BLACK…” banner (no manual help key)
  if (portalHintState === PortalHintState.NeedsPortal) {
    const hint = "ADJUST AIM WITH MOUSE CURSOR, THEN SHOOT WITH MOUSE 1/2.";
    const padX2 = 6, padY2 = 6;
    const tw2 = hint.length * 6 - 1;
    const hy = (h * 0.70) | 0;
    const x2 = ((w - tw2) / 2) | 0;

    c.save();
    const breath = 0.85 + 0.15 * Math.sin(timeSec * 2.5);
    c.globalAlpha = breath;
    c.fillStyle = "#0009";
    c.fillRect(x2 - padX2, hy - padY2, tw2 + padX2 * 2, 8 + padY2 * 2);
    D(c, hint, x2 + 1, hy + 1, 1, "#000");
    D(c, hint, x2,     hy,     1, "#e5e7eb");
    c.restore();
  }
}

// ————————————————————————————————————————————————————————————————————————
// Top-of-screen prompt builders
// ————————————————————————————————————————————————————————————————————————

// Back-compat: plain string (will render without colors if passed to drawHud)


// Preferred: color-coded tokens for M1/M2
export function promptForStepTokens(): Token[] {
  return [
    { text: "Aim with mouse cursor, shoot portals with ", color: "#e5e7eb" },
    { text: "M1", color: "#28f" },
    { text: " or ", color: "#e5e7eb" },
    { text: "M2", color: "#f80" },
    { text: ".", color: "#e5e7eb" },
  ];
}

// Convenience builders for common token sets the scene might want
export function tokensGreyGuidance(): Token[] {
  return [
    { text: "Use ", color: "#e5e7eb" },
    { text: "M1",  color: "#28f" },
    { text: " ",   color: "#e5e7eb" },
    { text: "&",   color: "#e5e7eb" },
    { text: " ",   color: "#e5e7eb" },
    { text: "M2",  color: "#f80" },
    { text: " on ", color: "#e5e7eb" },
    { text: "BLACK", color: "#e5e7eb" },
    { text: " tiles (", color: "#e5e7eb" },
    { text: "not GREY", color: "#ff4d4d" },
    { text: ")",    color: "#e5e7eb" },
  ];
}
export function tokensGenericMiss(): Token[] {
  return [
    { text: "Use ", color: "#e5e7eb" },
    { text: "M1",  color: "#28f" },
    { text: " ",   color: "#e5e7eb" },
    { text: "&",   color: "#e5e7eb" },
    { text: " ",   color: "#e5e7eb" },
    { text: "M2",  color: "#f80" },
    { text: " on ", color: "#e5e7eb" },
    { text: "BLACK", color: "#e5e7eb" },
    { text: " tiles", color: "#e5e7eb" },
    { text: ".", color: "#e5e7eb" },
  ];
}
export function tokensAvoidSpikes(): Token[] {
  return [
    { text: "NO PORTALS ON ", color: "#e5e7eb" },
    { text: "SPIKES",         color: "#ff4d4d" },
    { text: " - AVOID!",      color: "#e5e7eb" },
  ];
}

// ————————————————————————————————————————————————————————————————————————
// NEW: Near-player contextual hints for jump/aim/release (with clamping)
// ————————————————————————————————————————————————————————————————————————

export type JumpHintState = {
  grounded: boolean;
  jumpHeld: boolean;
  recentlyReleased: boolean; // true for a short window after releasing jump
  aimLeft: boolean;
  aimRight: boolean;
  powerDown: boolean; // S/Down
};

/**
 * Draws lightweight step-by-step hints near the player.
 * Call from inside world transform. (wx, wy) should be near player head.
 */
// Add near other module-level state in src/engine/scenes/tutorial/TutorialUI.ts
let groundedSinceMs = -1;

// Replace drawPlayerHints with this version
export function drawPlayerHints(
  c: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  s: JumpHintState
) {
  // Block hints right after a jump release
  if (s.recentlyReleased) {
    groundedSinceMs = -1;
    return;
  }

  // Track how long we've been grounded
  const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
  if (!s.grounded) {
    groundedSinceMs = -1;
    return; // must be grounded to show
  }
  if (groundedSinceMs < 0) groundedSinceMs = now;

  // Require at least 0.5s grounded before showing the jump menu
  if (now - groundedSinceMs < 500) return;

  const padX = 4, padY = 4, lh = 8;
  const y = wy + 24; // place BELOW the player

  const lines = s.jumpHeld
    ? [
        "• Aim A/D or ←/→",
        "• Adjust power S/↓",
        "• Release to jump",
      ]
    : [
        "• Hold SPACE",
      ];

  const tw = Math.max(...lines.map(t => t.length * 6 - 1));
  const boxW = tw + padX * 2;
  const boxH = lines.length * lh + padY * 2;

  // Compute would-be rect in screen, then nudge world position to keep it on-canvas
  const { sx, sy } = getScreenFromWorld(wx, y);
  const rectLeft = (sx - (tw / 2)) - padX;
  const rectTop  = sy - padY;

  const nudged = nudgeWorldForRect(wx, y, rectLeft, rectTop, boxW, boxH);
  const nx = nudged.wx, ny = nudged.wy;

  // Draw bubble at nudged position
  const x0 = (nx - (tw / 2)) | 0;
  let yy = ny;

  c.save();
  c.fillStyle = "#000a";
  c.fillRect(x0 - padX, yy - padY, boxW, boxH);
  for (const ln of lines) {
    D(c, ln, x0 + 1, yy + 1, 1, "#000");
    D(c, ln, x0,     yy,     1, "#e5e7eb");
    yy += lh;
  }
  c.restore();
}