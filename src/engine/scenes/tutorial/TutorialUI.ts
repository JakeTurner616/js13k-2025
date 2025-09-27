// src/engine/scenes/tutorial/TutorialUI.ts
//
// Tutorial UI module…
// (header comments unchanged)

import { drawText as D } from "../../font/fontEngine";
import { getCurrentMap } from "../../renderer/level-loader";
import { isSolidTileId } from "../../../player/Physics";

const TILE = 16;

// Tile IDs used by renderer/levels
const GREY_TILE_ID  = 2;
const FINISH_ID     = 3;
const SPIKE_ID      = 4;

// ————————————————————————————————————————————————————————————————————————
// Control-mode awareness (mouse/keyboard vs gamepad)
// ————————————————————————————————————————————————————————————————————————
type ControlMode = "kbd" | "gp";
let controlMode: ControlMode = "kbd";

/** Scene calls this each frame with latest input source. */
export function setControlMode(mode: ControlMode, _gamepadConnected: boolean) {
  // We ignore mere connection; language switches only when last input was gamepad.
  controlMode = mode;
}

// ————————————————————————————————————————————————————————————————————————
// Portal hint state (no manual help toggle)
// ————————————————————————————————————————————————————————————————————————

export enum PortalHintState { Off = 0, NeedsPortal = 1 }

let ctx: CanvasRenderingContext2D | null = null;
let portalHintState: PortalHintState = PortalHintState.Off;

// ————————————————————————————————————————————————————————————————————————
// World-space toasts & pings
// ————————————————————————————————————————————————————————————————————————

export type Token = { text: string; color: string };
type WToast = { wx: number; wy: number; t: number; dur: number; text?: string; tokens?: Token[] };
let wtoasts: WToast[] = [];

type Ping = { wx: number; wy: number; t: number; dur: number; col: string };
let pings: Ping[] = [];

// Win suppression timer
type WinSuppress = { t: number; dur: number } | null;
let winSuppress: WinSuppress = null;

// ————————————————————————————————————————————————————————————————————————
// Highlight “burst” timers (smooth fade)
// ————————————————————————————————————————————————————————————————————————

let blackBurstT = 0, blackBurstDur = 0;
let greyBurstT  = 0, greyBurstDur  = 0;
let spikeBurstT = 0, spikeBurstDur = 0;

// ————————————————————————————————————————————————————————————————————————
// Internal helpers (…unchanged…)
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
  const mp = getCurrentMap(); if (!mp || !ctx) return { x0:0,x1:-1,y0:0, y1:-1 };
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
// Screen-space clamping helpers & label drawing (…unchanged…)
// ————————————————————————————————————————————————————————————————————————

function getScreenFromWorld(wx: number, wy: number) {
  const m = ctx!.getTransform();
  const sx = m.a * wx + m.c * wy + m.e;
  const sy = m.b * wx + m.d * wy + m.f;
  return { sx, sy };
}

function nudgeWorldForRect(wx:number, wy:number, rectLeft:number, rectTop:number, rectW:number, rectH:number) {
  if (!ctx) return { wx, wy };
  const w = ctx.canvas.width, h = ctx.canvas.height;

  let dx = 0, dy = 0;
  const right = rectLeft + rectW;
  const bottom = rectTop + rectH;

  if (rectLeft < 0)      dx = -rectLeft;
  else if (right > w)    dx = w - right;

  if (rectTop < 0)       dy = -rectTop;
  else if (bottom > h)   dy = h - bottom;

  return { wx: wx + dx, wy: wy + dy };
}

function drawWorldLabelTokens(c:CanvasRenderingContext2D, wx:number, wy:number, tokens:Token[]) {
  const tw = measureTokens(tokens);
  const pad = 3;
  const boxW = tw + pad * 2;
  const boxH = 12;

  const { sx, sy } = getScreenFromWorld(wx, wy);
  const rectLeft = (sx - (tw / 2)) - pad;
  const rectTop  = (sy - 12) - pad;

  const nudged = nudgeWorldForRect(wx, wy, rectLeft, rectTop, boxW, boxH);
  wx = nudged.wx; wy = nudged.wy;

  const x0 = (wx - (tw/2))|0, y0 = (wy - 12)|0;

  c.save();
  c.fillStyle = "#000b";
  c.fillRect(x0 - pad, y0 - pad, boxW, boxH);
  let x = x0;
  for (const tk of tokens) {
    D(c, tk.text, x+1, y0+1, 1, "#000");
    D(c, tk.text, x,   y0,   1, tk.color);
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
  timeSec = 0,
  fade = 1
) {
  const { x, y } = tileToWorld(tx, ty);
  const m = 1.5, L = 5.5;
  const pulse = 0.55 + 0.35 * Math.sin(timeSec * 4);
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
  winSuppress = null;
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

  if (winSuppress) {
    winSuppress.t += dt;
    if (winSuppress.t >= winSuppress.dur) winSuppress = null;
  }
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

function startWinSuppress(dur = 3.0) {
  winSuppress = { t: 0, dur };
}

export function showGoodJobNearPlayer(wx: number, wyTop: number, dur = 3.0) {
  const jumpMenuOffsetY = 48;
  pushWorldToastText("Good job :)", wx, wyTop + jumpMenuOffsetY, dur);
  startWinSuppress(dur);
}

// Bursts
export function burstBlack(dur=2.0){ blackBurstT = blackBurstDur = Math.max(blackBurstDur, dur); }
export function burstGrey (dur=2.2){ greyBurstT  = greyBurstDur  = Math.max(greyBurstDur,  dur); }
export function burstSpike(dur=2.3){ spikeBurstT = spikeBurstDur = Math.max(spikeBurstDur, dur); }

// WORLD drawing (unchanged except using existing helpers)
export function drawWorld(c:CanvasRenderingContext2D, timeSec:number, cam:{x:number;y:number}) {
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

  for (const wt of wtoasts) {
    const fadeIn  = Math.min(1, wt.t/0.15);
    const fadeOut = Math.min(1, (wt.dur - wt.t)/0.25);
    const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
    const bob = Math.sin((timeSec + wt.t)*6)*1.5;
    c.save(); c.globalAlpha = alpha;
    if (wt.tokens) drawWorldLabelTokens(c, wt.wx, wt.wy + bob, wt.tokens);
    else if (wt.text) drawWorldLabelText(c, wt.wx, wt.wy + bob, wt.text);
    c.restore();
  }
}

// ————————————————————————————————————————————————————————————————————————
// HUD drawing
// ————————————————————————————————————————————————————————————————————————
export function drawHud(
  c: CanvasRenderingContext2D,
  timeSec: number,
  tutorial: string | Token[]
) {
  const w = c.canvas.width;

  const suppressTutorialPanel = !!winSuppress;

  if (!suppressTutorialPanel) {
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

    // Top-of-screen banner when no portals yet & needing help
    let nonePlaced = true;
    if (Array.isArray(tutorial)) {
      const concat = tutorial.map(t => t.text).join("");
      if (concat.includes("shoot the other portal") || concat.includes("Both portals placed")) {
        nonePlaced = false;
      }
    }
    if (portalHintState === PortalHintState.NeedsPortal && nonePlaced) {
      const hint =
        controlMode === "gp"
          ? "Aim with RIGHT STICK, shoot HIGHLIGHTED TILES"
          : "AIM WITH MOUSE, THEN SHOOT HIGHLIGHTED TILES";
      const padX2 = 6, padY2 = 6;
      const tw2 = hint.length * 6 - 1;
      const hy = (c.canvas.height * 0.70) | 0;
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
}

// ————————————————————————————————————————————————————————————————————————
// Top-of-screen prompt builders (state-aware + controller-aware)
// ————————————————————————————————————————————————————————————————————————

export type TokenBuilder = Token[];

// Back-compat
export function promptForStepTokens(): Token[] {
  return tokensBoth();
}

export function promptForStepTokensSmart(hasA: boolean, hasB: boolean): Token[] {
  if (hasA && !hasB) return tokensNeedB(); // (A placed → need B)
  if (hasB && !hasA) return tokensNeedA();
  if (!hasA && !hasB) return tokensBoth();
  return tokensBothPlaced();
}

export function tokensGreyGuidance(): Token[] {
  return controlMode === "gp"
    ? [
        { text: "Use ", color: "#e5e7eb" },
        { text: "RT",  color: "#28f" },
        { text: " ",   color: "#e5e7eb" },
        { text: "&",   color: "#e5e7eb" },
        { text: " ",   color: "#e5e7eb" },
        { text: "LT",  color: "#f80" },
        { text: " on ", color: "#e5e7eb" },
        { text: "BLACK", color: "#e5e7eb" },
        { text: " tiles (", color: "#e5e7eb" },
        { text: "not GREY", color: "#ff4d4d" },
        { text: ")",    color: "#e5e7eb" },
      ]
    : [
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
  return controlMode === "gp"
    ? [
        { text: "Use ", color: "#e5e7eb" },
        { text: "RT",  color: "#28f" },
        { text: " ",   color: "#e5e7eb" },
        { text: "&",   color: "#e5e7eb" },
        { text: " ",   color: "#e5e7eb" },
        { text: "LT",  color: "#f80" },
        { text: " on ", color: "#e5e7eb" },
        { text: "BLACK", color: "#e5e7eb" },
        { text: " tiles", color: "#e5e7eb" },
        { text: ".", color: "#e5e7eb" },
      ]
    : [
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

export function tokensForRemainingKey(which: "A" | "B" | "ANY"): Token[] {
  if (which === "A") return tokensNeedA();
  if (which === "B") return tokensNeedB();
  return tokensBoth();
}

function tokensBoth(): Token[] {
  const useGp = controlMode === "gp";
  return useGp
    ? [
        { text: "Aim with ", color: "#e5e7eb" },
        { text: "RIGHT STICK", color: "#e5e7eb" },
        { text: ", shoot with ", color: "#e5e7eb" },
        { text: "RT", color: "#28f" },
        { text: " or ", color: "#e5e7eb" },
        { text: "LT", color: "#f80" },
        { text: ".", color: "#e5e7eb" },
      ]
    : [
        { text: "Aim with mouse cursor, shoot portals with ", color: "#e5e7eb" },
        { text: "M1", color: "#28f" },
        { text: " or ", color: "#e5e7eb" },
        { text: "M2", color: "#f80" },
        { text: ".", color: "#e5e7eb" },
      ];
}

function tokensNeedA(): Token[] {
  const useGp = controlMode === "gp";
  return useGp
    ? [
        { text: "Aim with RIGHT STICK, shoot the other portal with ", color: "#e5e7eb" },
        { text: "RT", color: "#28f" },
        { text: ".", color: "#e5e7eb" },
      ]
    : [
        { text: "Aim with mouse cursor, shoot the other portal with ", color: "#e5e7eb" },
        { text: "M1", color: "#28f" },
        { text: ".", color: "#e5e7eb" },
      ];
}

function tokensNeedB(): Token[] {
  const useGp = controlMode === "gp";
  return useGp
    ? [
        { text: "Aim with RIGHT STICK, shoot the other portal with ", color: "#e5e7eb" },
        { text: "LT", color: "#f80" },
        { text: ".", color: "#e5e7eb" },
      ]
    : [
        { text: "Aim with mouse cursor, shoot the other portal with ", color: "#e5e7eb" },
        { text: "M2", color: "#f80" },
        { text: ".", color: "#e5e7eb" },
      ];
}

function tokensBothPlaced(): Token[] {
  return [
    { text: "Both portals placed - Use them to traverse!", color: "#e5e7eb" },
  ];
}

// ————————————————————————————————————————————————————————————————————————
// Near-player contextual hints (controller-aware wording)
// ————————————————————————————————————————————————————————————————————————

export type JumpHintState = {
  grounded: boolean;
  jumpHeld: boolean;
  recentlyReleased: boolean;
  aimLeft: boolean;
  aimRight: boolean;
  powerDown: boolean;
  bothPortalsPlaced?: boolean;
  suggestTo?: "A" | "B" | "GOAL" | null;
};

let groundedSinceMs = -1;

export function drawPlayerHints(
  c: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  s: JumpHintState
) {
  if (!s.bothPortalsPlaced) { groundedSinceMs = -1; return; }
  if (s.recentlyReleased)   { groundedSinceMs = -1; return; }

  const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
  if (!s.grounded) { groundedSinceMs = -1; return; }
  if (groundedSinceMs < 0) groundedSinceMs = now;
  if (now - groundedSinceMs < 500) return;

  const padX = 4, padY = 4, lh = 8;
  const y = wy + 24;

  const useGp = controlMode === "gp";

  let lines: string[] = [];
  let lineTokens: (Token[] | null)[] = [];

  if (s.jumpHeld) {
    if (useGp) {
      lines.push("• Aim with Left Stick");
      lineTokens.push(null);
      lines.push("• Adjust power with LS↓ or ↓");
      lineTokens.push(null);
    } else {
      lines.push("• Aim A/D or ←/→");
      lineTokens.push(null);
      lines.push("• Adjust power S/↓");
      lineTokens.push(null);
    }

    if (s.suggestTo === "A") {
      lines.push("• Aim toward the BLUE portal");
      lineTokens.push([
        { text: "• Aim toward the ", color: "#e5e7eb" },
        { text: "BLUE",              color: "#28f"    },
        { text: " portal",           color: "#e5e7eb" },
      ]);
    } else if (s.suggestTo === "B") {
      lines.push("• Aim toward the ORANGE portal");
      lineTokens.push([
        { text: "• Aim toward the ", color: "#e5e7eb" },
        { text: "ORANGE",            color: "#f80"    },
        { text: " portal",           color: "#e5e7eb" },
      ]);
    } else if (s.suggestTo === "GOAL") {
      lines.push("• Aim toward the END GOAL");
      lineTokens.push(null);
    }

    lines.push(useGp ? "• Release A (Cross) to jump" : "• Release to jump");
    lineTokens.push(null);
  } else {
    lines = [useGp ? "• Hold A (Cross)" : "• Hold SPACE"];
    lineTokens = [null];
  }

  const widths = lines.map((ln, i) =>
    lineTokens[i] ? measureTokens(lineTokens[i] as Token[]) : (ln.length * 6 - 1)
  );
  const tw = Math.max(...widths);
  const boxW = tw + padX * 2;
  const boxH = lines.length * lh + padY * 2;

  const { sx, sy } = getScreenFromWorld(wx, y);
  const rectLeft = (sx - (tw / 2)) - padX;
  const rectTop  = sy - padY;

  const nudged = nudgeWorldForRect(wx, y, rectLeft, rectTop, boxW, boxH);
  const nx = nudged.wx, ny = nudged.wy;

  const x0 = (nx - (tw / 2)) | 0;
  let yy = ny;

  c.save();
  c.fillStyle = "#000a";
  c.fillRect(x0 - padX, yy - padY, boxW, boxH);

  for (let i = 0; i < lines.length; i++) {
    const segs = lineTokens[i];
    if (segs) {
      let xx = x0;
      for (const seg of segs) {
        D(c, seg.text, xx + 1, yy + 1, 1, "#000");
        D(c, seg.text, xx,     yy,     1, seg.color);
        xx += seg.text.length * 6;
      }
    } else {
      D(c, lines[i], x0 + 1, yy + 1, 1, "#000");
      D(c, lines[i], x0,     yy,     1, "#e5e7eb");
    }
    yy += lh;
  }
  c.restore();
}
