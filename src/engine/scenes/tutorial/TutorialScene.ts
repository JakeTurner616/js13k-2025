// src/engine/scenes/tutorial/TutorialScene.ts
//
// Tutorial scene (core). No help/skip feature.
// The UI layer (toasts/pings/highlights/banner) lives in tutorial/TutorialUI.ts.
// CHANGE: Spawn point shifted slightly left via SPAWN_SHIFT_X. Use CURRENT_SPAWN
//         everywhere instead of the hard-coded INITIAL_SPAWN when referencing
//         spawn-relative UI (e.g., spike warning toast).

import { drawMapAndColliders } from "../../renderer/render";
import { loadLevel as L, getCurrentMap } from "../../renderer/level-loader";
import { createAnimator } from "../../../atlas/animationAtlas";
import { createPlayer, type Player } from "../../../player/Player";
import { updateSmoothCamera, type Cam } from "../../camera/Camera";
import { getInputState } from "../../input/input";
import { Environment } from "./../background/Environment";
import { PortalSystem } from "./../background/PortalSystem";
import { hb as getHB } from "../../../player/hb";

import { setScene } from "./../SceneManager";
import { BackgroundScene } from "./../BackgroundScene";
import { playWinTune } from "../../../sfx/winTune";

import * as UI from "./../tutorial/TutorialUI";

// ───────────────────────────────────────────────────────────────────────────────
// CONFIG / CONSTANTS
// ───────────────────────────────────────────────────────────────────────────────

const TILE = 16;
const CAM_EASE = 0.14;
const CAM_DT = 1 / 60;
const BG_EASE = 0.18;

// Original anchor (kept for reference)
const INITIAL_SPAWN = { x: 64, y: 24 }; // match BackgroundScene

// Move spawn a bit to the left (negative = left, positive = right)
const SPAWN_SHIFT_X = -16; // one tile left; try -8 for half-tile
let CURRENT_SPAWN = { x: INITIAL_SPAWN.x + SPAWN_SHIFT_X, y: INITIAL_SPAWN.y };

// Tile IDs used by renderer/levels
const GREY_TILE_ID  = 2;
const FINISH_ID     = 3;
const SPIKE_ID      = 4;

// Which level index is the tutorial
const TUTORIAL_LEVEL = 0;
// Where to go after tutorial completes
const NEXT_LEVEL_INDEX = 1; // BackgroundScene expects lvl.n(1-based)

// BackgroundScene-compatible win sequence timing (ticks, ~60fps)
const WIN_TICKS = 66;

// ───────────────────────────────────────────────────────────────────────────────
// STATE
// ───────────────────────────────────────────────────────────────────────────────

let ctx: CanvasRenderingContext2D | null = null;

let env = new Environment();
let portals = new PortalSystem();
let player: Player | null = null;
let cam: Cam = { x: 0, y: 0 };
let bgX = 0, bgXPrev = 0;

let winT = 0;
let prevReset = false;

// ───────────────────────────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────────────────────────

function drawFinish(c:CanvasRenderingContext2D, x:number, y:number, s:number){
  const h = s>>1;
  c.fillStyle="#fff"; c.fillRect(x,y,h,h);
  c.fillStyle="#000"; c.fillRect(x+h,y,h,h); c.fillRect(x,y+h,h,h);
  c.fillStyle="#fff"; c.fillRect(x+h,y+h,h,h);
}

// ───────────────────────────────────────────────────────────────────────────────
// LIFECYCLE
// ───────────────────────────────────────────────────────────────────────────────

export const TutorialScene = {
  setCanvas(c: CanvasRenderingContext2D) { ctx = c; UI.setCanvas(c); },

  start() {
    if (!ctx) return;

    env.start();
    L(TUTORIAL_LEVEL);

    const k = ctx.canvas;
    cam.x = k.width * 0.5;
    cam.y = k.height * 0.5;

    // Prepare UI state
    UI.resetAll();

    createAnimator(a => {
      player = createPlayer(a);
      portals.setAnimator(a);
      portals.setPlayer(player);

      // Use shifted spawn
      player.setSpawn(CURRENT_SPAWN.x, CURRENT_SPAWN.y);
      player.respawn();

      // Teleport → clear portal hint
      const origTele = player.onTeleported;
      player.onTeleported = (dir: "R" | "L" | "U" | "D") => {
        UI.clearPortalHint();
        origTele?.(dir);
      };

      // Level bounds
      const mp = getCurrentMap();
      if (mp && ctx) player.setLevelBounds(mp.width, mp.height, ctx.canvas.height, TILE);

      // BG follower seed
      const target = player ? player.body.pos.x : 0;
      bgX = bgXPrev = target;
    });

    // Input → portal system
    portals.attachInput(ctx.canvas, cam);

    // Raycast outcome → UI feedback (no help key, purely state-driven)
    (portals as any).onShot = (ev: any) => {
      const px = (ev.impactX ?? ev.ax) | 0;
      const py = (ev.impactY ?? ev.ay) | 0;

      if (ev.hitBlack) {
        UI.clearPortalHint();
        UI.pushPing(px, py, "#7aa2ff", 0.45);
      } else {
        UI.requirePortalHint();
        UI.pushPing(px, py, "#ff4d4d", 0.55);

        UI.burstBlack(2.0);

        if (ev.hit && ev.banned && ev.tileId === SPIKE_ID) {
          UI.burstSpike(2.3);
          UI.pushWorldToastTokens(UI.tokensAvoidSpikes(), px, py - 4, 2.2);
        } else if (ev.hit && ev.banned && ev.tileId === GREY_TILE_ID) {
          UI.burstGrey(2.2);
          UI.burstBlack(2.2);
          UI.pushWorldToastTokens(UI.tokensGreyGuidance(), px, py - 4, 2.4);
        } else {
          UI.pushWorldToastTokens(UI.tokensGenericMiss(), px, py - 4, 2.2);
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
    // No key listeners (help/skip removed)
  },

  update() {
    if (!ctx) return;

    // Win sequence handoff
    if (winT > 0) {
      if (--winT === 0) {
        setScene(BackgroundScene);
        setTimeout(() => {
          try { (globalThis as any).lvl?.n?.(NEXT_LEVEL_INDEX + 1); } catch {}
        }, 0);
      }
      return;
    }

    const inp = getInputState();

    // RESET
    if (inp.reset && !prevReset) {
      UI.resetAll();
      player?.reset?.();
    }
    prevReset = !!inp.reset;

    // Sim
    player?.update(inp, ctx);
    portals.tick();

    // Spike collision → reset + toast + clear hint
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

            if (id === FINISH_ID) { hitFinish = true; break outer; }

            if (id === SPIKE_ID) {
              const sx = tx * TILE, s = TILE, cx = sx + s / 2;
              const l = Math.max(Lx, sx), r = Math.min(Rx, sx + s);
              if (l < r) {
                const x = l > cx ? l : (r < cx ? r : cx);
                const yth = sy + ((Math.abs(x - cx) * 2) | 0);
                if (By > yth && Ty < sy + s) {
                  UI.burstSpike(1.8);
                  // Use CURRENT_SPAWN for toast position (reflect shifted spawn)
                  UI.pushWorldToastText("AVOID SPIKES!", CURRENT_SPAWN.x, CURRENT_SPAWN.y - 12, 1.3);
                  player.reset?.();
                  UI.clearPortalHint();
                  break outer;
                }
              }
            }
          }
        }

        if (hitFinish) {
          try { (globalThis as any).__sceneMusic?.stop?.(0) } catch {}
          (globalThis as any).__sceneMusic = undefined;
          dispatchEvent(new CustomEvent("scene:stop-music"));
          try { playWinTune(); } catch {}

          player?.celebrateWin?.(WIN_TICKS);
          winT = WIN_TICKS;
          (portals as any).reset?.() ?? portals.clear?.();
        }
      }
    }

    // Tick UI at a stable small dt
    UI.tick(1 / 50);

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

      // FINISH visual checkerboard
      const Y0 = c.canvas.height - mp.height*TILE;
      for (let ty=0; ty<mp.height; ty++) {
        const row = ty*mp.width, y = (Y0 + ty*TILE)|0;
        for (let tx=0; tx<mp.width; tx++) {
          if ((mp.tiles as any)[row+tx] === FINISH_ID) {
            drawFinish(c, (tx*TILE)|0, y, TILE);
          }
        }
      }

      // UI world-space overlays (highlights, pings, toasts)
      UI.drawWorld(c, t, cam);
    }

    player?.draw(c, tMs);
    portals.draw(c, tMs);
    c.restore();

    // HUD
    UI.drawHud(c, t, UI.promptForStep());
  }
};
