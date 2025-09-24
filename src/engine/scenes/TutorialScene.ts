// src/engine/scenes/TutorialScene.ts
//
// Minimal tutorial: single-state intro, no positional triggers.
// CHANGE: “Portals only stick to BLACK…” hint is now **state-based**, not timer-based.
// - Hint shows after a failed/banned portal shot (miss / GREY / SPIKE).
// - Hint hides on any valid BLACK stick, on teleport, or on reset.
// - Holding H still forces the hint to display (no timers), then it hides when H is released
//   unless the state-based condition says it should be shown.
// - Keeps toast system (with de-dupe), pings, tile glints, spike reset, and FINISH overlay.
// NEW: Uses the **same win sequence semantics as BackgroundScene**.
//      On FINISH, stop music, playWinTune, call player.celebrateWin(66), freeze input,
//      and after ~66 ticks hand off to BackgroundScene at level 1 (post-tutorial).

import { drawMapAndColliders } from "../renderer/render";
import { loadLevel as L, getCurrentMap } from "../renderer/level-loader";
import { createAnimator } from "../../atlas/animationAtlas";
import { createPlayer, type Player } from "../../player/Player";
import { updateSmoothCamera, type Cam } from "../camera/Camera";
import { getInputState } from "../input/input";
import { Environment } from "./background/Environment";
import { PortalSystem } from "./background/PortalSystem";
import { drawText as D } from "../font/fontEngine";
import { hb as getHB, hc as getHC } from "../../player/hb";
import { isSolidTileId } from "../../player/Physics";
import { setScene } from "./SceneManager";
import { BackgroundScene } from "./BackgroundScene";
import { playWinTune } from "../../sfx/winTune";

// ───────────────────────────────────────────────────────────────────────────────
// CONFIG
// ───────────────────────────────────────────────────────────────────────────────

const TILE = 16;
const CAM_EASE = 0.14;
const CAM_DT = 1 / 60;
const BG_EASE = 0.18;

const INITIAL_SPAWN = { x: 64, y: 24 }; // match BackgroundScene

// Tile IDs used by renderer/levels
const GREY_TILE_ID  = 2; // non-portal surfaces (rendered grey)
const FINISH_ID     = 3;
const SPIKE_ID      = 4;

// Which level index is the tutorial
const TUTORIAL_LEVEL = 0;
// Where to go after tutorial completes (BackgroundScene expects 1-based `lvl.n`)
const NEXT_LEVEL_INDEX = 1; // 0-based data index → will call lvl.n(NEXT_LEVEL_INDEX+1)

// BackgroundScene-compatible win sequence timing (ticks, ~60fps)
const WIN_TICKS = 66;

// Single Step
const STEP = { INTRO: 0 } as const;
type Step = typeof STEP[keyof typeof STEP];

// ───────────────────────────────────────────────────────────────────────────────
// STATE
// ───────────────────────────────────────────────────────────────────────────────

let ctx: CanvasRenderingContext2D | null = null;
let canvasEl: HTMLCanvasElement | null = null;

let env = new Environment();
let portals = new PortalSystem();
let player: Player | null = null;
let cam: Cam = { x: 0, y: 0 };
let bgX = 0, bgXPrev = 0;

// FSM
let step: Step = STEP.INTRO;

// Input edges (from input system)
let prevReset = false;

// Local help toggle (holding H forces hint to show while held)
let helpDown = false;

// “Portals only stick to BLACK” banner is now state-driven
enum PortalHintState { Off = 0, NeedsPortal = 1 }
let portalHintState: PortalHintState = PortalHintState.Off;

// Tracking (potentially useful later)
let teleportedSinceStep = false;

// World-space toasts & pings
type Token = { text: string; color: string };
type WToast = { wx: number; wy: number; t: number; dur: number; text?: string; tokens?: Token[] };
let wtoasts: WToast[] = [];
type Ping = { wx: number; wy: number; t: number; dur: number; col: string };
let pings: Ping[] = [];

// Burst timers to highlight tiles after a miss
let blackBurstT = 0; // blue corners on portal-eligible (black) tiles
let greyBurstT  = 0; // red corners on GREY tiles
let spikeBurstT = 0; // red corners on SPIKE tiles
// Smooth fade tracking (original durations)
let blackBurstDur = 0;
let greyBurstDur  = 0;
let spikeBurstDur = 0;

// Win sequence (mirrors BackgroundScene semantics)
let winT = 0; // counts down from WIN_TICKS after FINISH

// Stable handlers
const keydownHandler = (e: KeyboardEvent) => onKey(e, true);
const keyupHandler   = (e: KeyboardEvent) => onKey(e, false);

// ───────────────────────────────────────────────────────────────────────────────
// HELPERS (COORDINATE SPACES & TILE TYPES)
// ───────────────────────────────────────────────────────────────────────────────

const mapY0 = (c:CanvasRenderingContext2D, map:{height:number}) =>
  c.canvas.height - map.height * TILE;

function worldToTile(x: number, y: number) {
  const mp = getCurrentMap(); if (!mp || !ctx) return { tx: -1, ty: -1 };
  const Y0 = mapY0(ctx, mp);
  return { tx: Math.floor(x / TILE), ty: Math.floor((y - Y0) / TILE) };
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
function isBlackTileId(id: number) {
  // “Black” means solid portal surface, but not GREY/FINISH/SPIKE
  return isSolidTileId(id) && id !== GREY_TILE_ID && id !== FINISH_ID && id !== SPIKE_ID;
}
function isGreyTileId(id: number) {
  return id === GREY_TILE_ID;
}

// ───────────────────────────────────────────────────────────────────────────────
// WORLD TOASTS (with de-dupe)
// ───────────────────────────────────────────────────────────────────────────────

const TOAST_MERGE_RADIUS = 14; // px (world-space); nearby same-content toasts are merged

function tokensKey(tokens: Token[]) {
  let s = "";
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    s += tk.text + "§" + tk.color + "¦";
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

function pushWorldToastTokens(tokens: Token[], wx: number, wy: number, dur = 2.0) {
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
function pushWorldToastText(text: string, wx: number, wy: number, dur = 2.0) {
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
function drawWorldToasts(c:CanvasRenderingContext2D, t:number) {
  for (const wt of wtoasts) {
    const fadeIn  = Math.min(1, wt.t/0.15);
    const fadeOut = Math.min(1, (wt.dur - wt.t)/0.25);
    const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
    const bob = Math.sin((t + wt.t)*6)*1.5;
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

// ───────────────────────────────────────────────────────────────────────────────
// PINGS
// ───────────────────────────────────────────────────────────────────────────────

function pushPing(wx:number, wy:number, col="#ff4d4d", dur=0.35) {
  pings.push({ wx, wy, col, dur, t: 0 });
  if (pings.length > 10) pings.shift();
}
function drawPings(c:CanvasRenderingContext2D) {
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
}

// Visible tile bounds in current camera view
function visibleTileBounds() {
  const mp = getCurrentMap(); if (!mp || !ctx) return { x0:0,x1:-1,y0:0,y1:-1 };
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const x0w = cam.x - w*0.5, y0w = cam.y - h*0.5;
  const x1w = cam.x + w*0.5, y1w = cam.y + h*0.5;
  const { tx: x0 } = worldToTile(Math.floor(x0w), Math.floor(y0w));
  const { tx: x1 } = worldToTile(Math.ceil(x1w),  Math.floor(y0w));
  const { ty: y0 } = worldToTile(Math.floor(x0w), Math.floor(y0w));
  const { ty: y1 } = worldToTile(Math.floor(x0w), Math.ceil(y1w));
  return {
    x0: Math.max(0, x0-1),
    x1: Math.min(mp.width-1, x1+1),
    y0: Math.max(0, y0-1),
    y1: Math.min(mp.height-1, y1+1),
  };
}

// Finish checkerboard (same look as BackgroundScene)
function drawFinish(c:CanvasRenderingContext2D, x:number, y:number, s:number){
  const h = s>>1;
  c.fillStyle="#fff"; c.fillRect(x,y,h,h);
  c.fillStyle="#000"; c.fillRect(x+h,y,h,h); c.fillRect(x,y+h,h,h);
  c.fillStyle="#fff"; c.fillRect(x+h,y+h,h,h);
}

// Draw thin corner brackets as a non-invasive highlight for a tile (with smooth fade)
function drawTileCorners(
  c: CanvasRenderingContext2D,
  tx: number,
  ty: number,
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

// Smooth fade curve for bursts (0..1 smoothstep)
function burstAlpha(remaining: number, total: number) {
  if (total <= 0) return 0;
  const k = Math.max(0, Math.min(1, remaining / total));
  return k * k * (3 - 2 * k);
}

// ───────────────────────────────────────────────────────────────────────────────
// PROMPTS
// ───────────────────────────────────────────────────────────────────────────────

function promptForStep(_s: Step): string {
  return "Hold SPACE to charge jump • Aim A/D (←/→) • Adjust power S/↓ • Release to jump";
}
function portalHintText(): string {
  return "ADJUST AIM WITH MOUSE CURSOR, THEN SHOOT WITH MOUSE 1/2.";
}
function drawPrompt(c: CanvasRenderingContext2D, s: string, y: number, scale = 1) {
  const lines = s.split("\n");
  const padX = 6, padY = 6;
  const w = c.canvas.width;
  const tw = Math.max(...lines.map(t => (t.length * 6 * scale - scale)));
  const x = ((w - tw) / 2) | 0;
  const h = lines.length * (8 * scale);
  c.fillStyle = "#0009";
  c.fillRect(x - padX, y - padY, tw + padX * 2, h + padY * 2);
  let yy = y;
  for (const line of lines) {
    D(c, line, x + 1, yy + 1, scale, "#000");
    D(c, line, x, yy, scale, "#e5e7eb");
    yy += 8 * scale;
  }
}
function drawLegend(c: CanvasRenderingContext2D) {
  const s = "R: RESET   H: HELP";
  const w = c.canvas.width, h = c.canvas.height;
  const tw = s.length * 6 - 1;
  const x = (w - tw - 6) | 0, y = (h - 14) | 0;
  c.fillStyle = "#0007";
  c.fillRect(x - 3, y - 2, tw + 6, 11);
  D(c, s, x + 1, y + 1, 1, "#000");
  D(c, s, x, y, 1, "#cbd5e1");
}

// ───────────────────────────────────────────────────────────────────────────────
// STATE TICK (no timers for the portal hint)
// ───────────────────────────────────────────────────────────────────────────────

function tickTutorial(dt: number) {
  if (!ctx || !player) return;

  // tick world-space toasts & pings
  for (const t of wtoasts) t.t += dt;
  wtoasts = wtoasts.filter(t => t.t < t.dur);
  for (const p of pings) p.t += dt;
  pings = pings.filter(p => p.t < p.dur);

  if (blackBurstT > 0) blackBurstT -= dt;
  if (greyBurstT  > 0) greyBurstT  -= dt;
  if (spikeBurstT > 0) spikeBurstT -= dt;

  // No positional triggers or hint timers.
  void getHC(player.body);
}

// ───────────────────────────────────────────────────────────────────────────────
// INPUT / LIFECYCLE
// ───────────────────────────────────────────────────────────────────────────────

function onKey(e: KeyboardEvent, down: boolean) {
  if (e.key === "h" || e.key === "H") {
    helpDown = down; // while held, we show the hint regardless of state
  }
}

export const TutorialScene = {
  setCanvas(c: CanvasRenderingContext2D) { ctx = c; canvasEl = c.canvas; },

  start() {
    if (!ctx) return;

    env.start();
    L(TUTORIAL_LEVEL);

    // Camera center
    const k = ctx.canvas;
    cam.x = k.width * 0.5;
    cam.y = k.height * 0.5;

    // Listeners
    window.addEventListener("keydown", keydownHandler);
    window.addEventListener("keyup",   keyupHandler);

    createAnimator(a => {
      player = createPlayer(a);
      portals.setAnimator(a);
      portals.setPlayer(player);

      // Keep spawn fixed at (64,24). Use respawn to avoid top-left glitches.
      player.setSpawn(INITIAL_SPAWN.x, INITIAL_SPAWN.y);
      player.respawn();

      // Detect portal use → hide hint (state success)
      const origTele = player.onTeleported;
      player.onTeleported = (dir: "R" | "L" | "U" | "D") => {
        teleportedSinceStep = true;
        portalHintState = PortalHintState.Off;
        origTele?.(dir);
      };

      // Bounds
      const mp = getCurrentMap();
      if (mp && ctx) player.setLevelBounds(mp.width, mp.height, ctx.canvas.height, TILE);

      // BG follow target
      const target = player ? player.body.pos.x : 0;
      bgX = bgXPrev = target;
    });

    // Input → portal system
    portals.attachInput(ctx.canvas, cam);

    // Raycast outcome → drive hint state (no timers)
    (portals as any).onShot = (ev: any) => {
      // Where to place the toast & ripple
      const px = (ev.impactX ?? ev.ax) | 0;
      const py = (ev.impactY ?? ev.ay) | 0;

      if (ev.hitBlack) {
        // Valid portal stick → blue ripple; clear the hint state
        portalHintState = PortalHintState.Off;
        pushPing(px, py, "#7aa2ff", 0.45);
      } else {
        // Miss or banned surface → red ripple + set hint state
        portalHintState = PortalHintState.NeedsPortal;
        pushPing(px, py, "#ff4d4d", 0.55);

        // Start smooth highlight bursts (record durations for easing)
        blackBurstT = blackBurstDur = 2.0;

        if (ev.hit && ev.banned && ev.tileId === SPIKE_ID) {
          // SPIKE: emphasize danger + valid options
          spikeBurstT = spikeBurstDur = 2.3;
          blackBurstT = blackBurstDur = Math.max(blackBurstDur, 2.0);

          const tokens: Token[] = [
            { text: "NO PORTALS ON ", color: "#e5e7eb" },
            { text: "SPIKES",         color: "#ff4d4d" },
            { text: " - AVOID!",      color: "#e5e7eb" },
          ];
          pushWorldToastTokens(tokens, px, py - 4, 2.2);
        } else if (ev.hit && ev.banned && ev.tileId === GREY_TILE_ID) {
          // GREY: specific guidance
          greyBurstT = greyBurstDur = 2.2;
          blackBurstT = blackBurstDur = 2.2;

          const tokens: Token[] = [
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
            { text: ")", color: "#e5e7eb" },
          ];
          pushWorldToastTokens(tokens, px, py - 4, 2.4);
        } else {
          // Generic miss guidance
          const tokens: Token[] = [
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
          pushWorldToastTokens(tokens, px, py - 4, 2.2);
        }
      }
    };

    // Resize → recompute bounds
    addEventListener("resize", () => {
      if (!ctx || !player) return;
      const mp = getCurrentMap();
      if (mp) player.setLevelBounds(mp.width, mp.height, ctx.canvas.height, TILE);
    });
  },

  stop() {
    window.removeEventListener("keydown", keydownHandler);
    window.removeEventListener("keyup",   keyupHandler);
  },

  update() {
    if (!ctx) return;

    // If we're in win sequence, count down and hand off to BackgroundScene
    if (winT > 0) {
      if (--winT === 0) {
        // Hand-off: switch to BackgroundScene and jump to level 1
        setScene(BackgroundScene);
        // BackgroundScene.start() installs console helper: globalThis.lvl.n(1-based)
        // We yield a tick so BackgroundScene can set that helper.
        setTimeout(() => {
          try { (globalThis as any).lvl?.n?.(NEXT_LEVEL_INDEX + 1); } catch {}
        }, 0);
      }
      return; // freeze tutorial simulation during win sequence
    }

    const inp = getInputState();

    // RESET → normal player reset; clear hint state
    if (inp.reset && !prevReset) {
      wtoasts.length = 0; pings.length = 0;
      blackBurstT = blackBurstDur = 0;
      greyBurstT  = greyBurstDur  = 0;
      spikeBurstT = spikeBurstDur = 0;
      teleportedSinceStep = false;
      portalHintState = PortalHintState.Off;
      player?.reset?.();
    }
    prevReset = !!inp.reset;

    // Sim
    player?.update(inp, ctx);
    portals.tick();

    // Spike collision → normal reset + toast; also clear hint (fresh start)
    if (player && ctx) {
      const mp = getCurrentMap();
      if (mp) {
        const b = player.body, H = getHB(b);
        const Y0 = ctx.canvas.height - mp.height * TILE;
        const Lx = (b.pos.x + H.x) | 0, Rx = (b.pos.x + H.x + H.w - 1) | 0;
        const Ty = (b.pos.y + H.y) | 0, By = (Ty + H.h - 1) | 0;
        let x0 = (Lx / TILE) | 0, x1 = (Rx / TILE) | 0;
        let y0 = ((Ty - Y0) / TILE) | 0, y1 = ((By - Y0) / TILE) | 0;
        if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0;
        if (x1 >= mp.width) x1 = mp.width - 1;
        if (y1 >= mp.height) y1 = mp.height - 1;

        let hitFinish = false;

        outer: for (let ty = y0; ty <= y1; ty++) {
          const row = ty * mp.width, sy = Y0 + ty * TILE;
          for (let tx = x0; tx <= x1; tx++) {
            const id = (mp.tiles as any)[row + tx];

            if (id === FINISH_ID) {
              // Match BackgroundScene win flow
              hitFinish = true;
              break outer;
            }

            if (id === SPIKE_ID) {
              const sx = tx * TILE, s = TILE, cx = sx + s / 2;
              const l = Math.max(Lx, sx), r = Math.min(Rx, sx + s);
              if (l < r) {
                const x = l > cx ? l : (r < cx ? r : cx);
                const yth = sy + ((Math.abs(x - cx) * 2) | 0);
                if (By > yth && Ty < sy + s) {
                  spikeBurstT = spikeBurstDur = Math.max(spikeBurstDur, 1.8);
                  pushWorldToastTokens([{ text: "AVOID SPIKES!", color: "#e5e7eb" }],
                                       INITIAL_SPAWN.x, INITIAL_SPAWN.y - 12, 1.3);
                  player.reset?.();
                  portalHintState = PortalHintState.Off;
                  break outer;
                }
              }
            }
          }
        }

        if (hitFinish) {
          // Stop music (like BackgroundScene), play win jingle, start celebration
          try { (globalThis as any).__sceneMusic?.stop?.(0) } catch {}
          (globalThis as any).__sceneMusic = undefined;
          dispatchEvent(new CustomEvent("scene:stop-music"));
          try { playWinTune(); } catch {}

          player?.celebrateWin?.(WIN_TICKS);
          winT = WIN_TICKS;
          // Disable/clear portals during celebration (matches BackgroundScene style)
          (portals as any).reset?.() ?? portals.clear?.();
        }
      }
    }

    // Tick world
    tickTutorial(1 / 50);

    // Camera
    const mp = getCurrentMap();
    const ww = mp ? mp.width * TILE : 1e4;
    const wh = mp ? mp.height * TILE : 1e4;
    const px = player ? player.body.pos.x : cam.x;
    const py = player ? player.body.pos.y : cam.y;

    updateSmoothCamera(
      cam, px, py, ctx.canvas.width, ctx.canvas.height * 0.7, ww, wh, CAM_EASE, CAM_DT, true
    );

    // BG follow
    bgXPrev = bgX;
    bgX += (px - bgX) * BG_EASE;
  },

  draw(tMs: number, a: number) {
    if (!ctx) return;
    const c = ctx, k = c.canvas, w = k.width, h = k.height, t = tMs/1e3;

    // BG
    env.draw(c, t, bgXPrev + (bgX - bgXPrev) * (a || 0));

    // WORLD
    c.save();
    c.translate((w * 0.5 - cam.x) | 0, (h * 0.5 - cam.y) | 0);

    const mp = getCurrentMap();
    if (mp) {
      drawMapAndColliders(c, mp, TILE);

      // FINISH checkerboard overlay (visual only)
      const Y0 = c.canvas.height - mp.height*TILE;
      for (let ty=0; ty<mp.height; ty++) {
        const row = ty*mp.width, y = (Y0 + ty*TILE)|0;
        for (let tx=0; tx<mp.width; tx++) {
          if ((mp.tiles as any)[row+tx] === FINISH_ID) {
            drawFinish(c, (tx*TILE)|0, y, TILE);
          }
        }
      }

      // Burst highlights with smooth fade-out
      const vb = visibleTileBounds();
      const fadeG = burstAlpha(greyBurstT,  greyBurstDur);
      const fadeB = burstAlpha(blackBurstT, blackBurstDur);
      const fadeS = burstAlpha(spikeBurstT, spikeBurstDur);

      if (greyBurstT > 0 && fadeG > 0) {
        for (let ty = vb.y0; ty <= vb.y1; ty++) {
          for (let tx = vb.x0; tx <= vb.x1; tx++) {
            if (getTileId(tx, ty) === GREY_TILE_ID) {
              drawTileCorners(c, tx, ty, "#ff4d4d", t, fadeG);
            }
          }
        }
      }
      if (blackBurstT > 0 && fadeB > 0) {
        for (let ty = vb.y0; ty <= vb.y1; ty++) {
          for (let tx = vb.x0; tx <= vb.x1; tx++) {
            const id = getTileId(tx, ty);
            if (isBlackTileId(id)) {
              drawTileCorners(c, tx, ty, "#7aa2ff", t, fadeB);
            }
          }
        }
      }
      if (spikeBurstT > 0 && fadeS > 0) {
        for (let ty = vb.y0; ty <= vb.y1; ty++) {
          for (let tx = vb.x0; tx <= vb.x1; tx++) {
            if (getTileId(tx, ty) === SPIKE_ID) {
              drawTileCorners(c, tx, ty, "#ff4d4d", t, fadeS);
            }
          }
        }
      }

      // World-space feedback
      drawPings(c);
      drawWorldToasts(c, t);
    }

    player?.draw(c, tMs);
    portals.draw(c, tMs);
    c.restore();

    // HUD: main tutorial prompt
    drawPrompt(c, promptForStep(step), 8, 1);

    // State-based “Portals only stick to BLACK…” banner.
    // Shows if: state wants it (NeedsPortal) OR H is held.
    if (portalHintState === PortalHintState.NeedsPortal || helpDown) {
      const hint = portalHintText();
      const padX = 6, padY = 6;
      const tw = hint.length * 6 - 1;
      const hy = (h * 0.70) | 0;
      const x = ((w - tw) / 2) | 0;

      c.save();
      // Slight breathing alpha so it feels alive, but no timers
      const breath = 0.85 + 0.15 * Math.sin(t * 2.5);
      c.globalAlpha = breath;
      c.fillStyle = "#0009";
      c.fillRect(x - padX, hy - padY, tw + padX * 2, 8 + padY * 2);
      D(c, hint, x + 1, hy + 1, 1, "#000");
      D(c, hint, x,     hy,     1, "#e5e7eb");
      c.restore();
    }

    // Optional subtle “win” overlay during celebration (kept minimal)
    if (winT > 0) {
      const k = Math.min(1, (WIN_TICKS - winT) / 12);
      c.save();
      c.globalAlpha = 0.15 * k;
      c.fillStyle = "#7aa2ff";
      c.fillRect(0, 0, w, h);
      c.restore();
    }

    drawLegend(c);
  }
};
