// src/engine/scenes/tutorial/TutorialUI.ts
//
// Tutorial UI module: world-space toasts, pings, tile-corner highlights,
// and the state-based "portals only stick to BLACK" banner.
//
// No help/skip feature: there is **no** H-to-force-help logic exported here.
// The scene tells this module when to show or hide the "needs portal" state,
// and when to trigger burst highlights or toasts based on raycast results.

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

function drawWorldLabelTokens(c:CanvasRenderingContext2D, wx:number, wy:number, tokens:Token[]) {
  const tw = measureTokens(tokens);
  const x0 = (wx - (tw/2))|0, y0 = (wy - 12)|0;
  c.save();
  c.fillStyle = "#000b";
  c.fillRect(x0-3, y0-3, tw+6, 12);
  let x = x0;
  for (const tk of tokens) {
    D(c, tk.text, x+1, y0+1, 1, "#000");
    D(c, tk.text, x,   y0,    1, tk.color);
    x += tk.text.length * 6;
  }
  c.restore();
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

  // Toasts
  for (const wt of wtoasts) {
    const fadeIn  = Math.min(1, wt.t/0.15);
    const fadeOut = Math.min(1, (wt.dur - wt.t)/0.25);
    const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
    const bob = Math.sin((timeSec + wt.t)*6)*1.5;
    c.save(); c.globalAlpha = alpha;
    if (wt.tokens) drawWorldLabelTokens(c, wt.wx, wt.wy + bob, wt.tokens);
    else if (wt.text) {
      const tw = wt.text.length*6 - 1, x = (wt.wx - (tw/2))|0, y = (wt.wy + bob - 12)|0;
      c.fillStyle = "#000b"; c.fillRect(x-3, y-3, tw+6, 12);
      D(c, wt.text, x+1, y+1, 1, "#000");
      D(c, wt.text, x,   y,   1, "#e5e7eb");
    }
    c.restore();
  }
}

// HUD drawing (called in screen space)
export function drawHud(c:CanvasRenderingContext2D, timeSec:number, tutorialPrompt:string) {
  const w = c.canvas.width, h = c.canvas.height;

  // Main tutorial prompt
  const lines = tutorialPrompt.split("\n");
  const padX = 6, padY = 6;
  const tw = Math.max(...lines.map(t => (t.length * 6 - 1)));
  const x = ((w - tw) / 2) | 0;
  const y = 8;
  const boxH = lines.length * 8;

  c.fillStyle = "#0009";
  c.fillRect(x - padX, y - padY, tw + padX * 2, boxH + padY * 2);
  let yy = y;
  for (const line of lines) {
    D(c, line, x + 1, yy + 1, 1, "#000");
    D(c, line, x,     yy,     1, "#e5e7eb");
    yy += 8;
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

// Utility text builders (re-exported for scene)
export function promptForStep(): string {
  return "Hold SPACE to charge jump • Aim A/D (←/→) • Adjust power S/↓ • Release to jump";
}

// Convenience builders for common token sets the scene might want
export function tokensGreyGuidance(): Token[] {
  return [
    { text: "Use ", color: "#e5e7eb" },
    { text: "M1",  color: "#7aa2ff" },
    { text: " ",   color: "#e5e7eb" },
    { text: "&",   color: "#e5e7eb" },
    { text: " ",   color: "#e5e7eb" },
    { text: "M2",  color: "#f7c948" },
    { text: " on ", color: "#e5e7eb" },
    { text: "BLACK", color: "#7aa2ff" },
    { text: " tiles (not ", color: "#e5e7eb" },
    { text: "GREY", color: "#ff4d4d" },
    { text: ")",    color: "#e5e7eb" },
  ];
}
export function tokensGenericMiss(): Token[] {
  return [
    { text: "Use ", color: "#e5e7eb" },
    { text: "M1",  color: "#7aa2ff" },
    { text: " ",   color: "#e5e7eb" },
    { text: "&",   color: "#e5e7eb" },
    { text: " ",   color: "#e5e7eb" },
    { text: "M2",  color: "#f7c948" },
    { text: " on ", color: "#e5e7eb" },
    { text: "BLACK", color: "#7aa2ff" },
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
