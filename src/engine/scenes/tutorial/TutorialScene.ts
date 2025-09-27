// src/engine/scenes/tutorial/TutorialScene.ts
//
// Tutorial scene (core). No help/skip feature.
// (…header comments unchanged…)

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
import { BackgroundScene, setPendingStartLevelZeroBased } from "./../BackgroundScene";
import { playWinTune } from "../../../sfx/winTune";

// NEW: play death SFX on spike hit in tutorial
import { zzfx } from "../../audio/SoundEngine";
import { die as dieSfx } from "../../../sfx/die";

import * as UI from "./../tutorial/TutorialUI";
// 8-bit pointer system
import * as P8 from "../../ui/Pointer8";

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
// Where to go after tutorial completes (0-based here)
const NEXT_LEVEL_INDEX = 1; // BackgroundScene expects lvl.n 1-based; we use 0-based setter

// BackgroundScene-compatible win sequence timing (ticks, ~60fps)
const WIN_TICKS = 66;

// Pointer visuals
const PTR_GREY = "#9aa0a6";

// 🆕 Pointer tuning
const POINTER_Y_OFFSET_W       = 10; // ↓ WEST-facing arrow sprite down a bit
const POINTER_Y_OFFSET_E       = 16; // ↓ EAST-facing arrow slightly more than WEST
const POINTER_TOAST_Y_OFFSET   = 10; // ↓ move the toast “bubble” down (world space)
const POINTER_TOAST_DUR        = 3.2; // keep toast a bit longer

// 🆕 Relaxed pointer "bubble" hitbox radius (used for both pop + near checks)
const PTR_HIT_R  = TILE * 1.75;
const PTR_HIT_R2 = PTR_HIT_R * PTR_HIT_R;

// ──────────────────────────────────────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────────────────────────────────────

let ctx: CanvasRenderingContext2D | null = null;

let env = new Environment();
let portals = new PortalSystem();
let player: Player | null = null;
let cam: Cam = { x: 0, y: 0 };
let bgX = 0, bgXPrev = 0;

let winT = 0;
let prevReset = false;

// NEW: track jump hint timing
let prevJumpHeld = false;
let jumpReleaseTimer = 0; // seconds remaining to suppress hints after release

// target positions (world) for left/right “black” placements
let leftTarget:  { wx: number; wy: number } | null = null;
let rightTarget: { wx: number; wy: number } | null = null;

// END GOAL (FINISH) centers and topmost Y (world)
let finishTarget: { wx: number; wy: number } | null = null;
let finishTopY: number | null = null;

// pointer ids so we can replace/remove cleanly
let leftPtrId: string | null = null;
let rightPtrId: string | null = null;

// ✨ NEW: clear Pointer8 AND forget our local handles (fixes reset-desync)
function clearAllPointersLocal() {
  leftPtrId = null;
  rightPtrId = null;
  P8.clear();
}

// ───────────────────────────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────────────────────────

function drawFinish(c:CanvasRenderingContext2D, x:number, y:number, s:number){
  const h = s>>1;
  c.fillStyle="#fff"; c.fillRect(x,y,h,h);
  c.fillStyle="#000"; c.fillRect(x+h,y,h,h); c.fillRect(x,y+h,h,h);
  c.fillStyle="#fff"; c.fillRect(x+h,y+h,h,h);
}

function zeroBodyMotion(b: any){
  if (!b) return;
  if (b.vel) { b.vel.x = 0; b.vel.y = 0; }
  if ("vx" in b) b.vx = 0;
  if ("vy" in b) b.vy = 0;
  if ("ax" in b) b.ax = 0;
  if ("ay" in b) b.ay = 0;
  if ("fx" in b) b.fx = 0;
  if ("fy" in b) b.fy = 0;
  if ("momX" in b) b.momX = 0;
  if ("momY" in b) b.momY = 0;
  if ("impulseX" in b) b.impulseX = 0;
  if ("impulseY" in b) b.impulseY = 0;
}

function isBlackTileId(id:number){
  return id > 0 && id !== GREY_TILE_ID && id !== FINISH_ID && id !== SPIKE_ID;
}

function computeTargets() {
  if (!ctx) return;
  const mp = getCurrentMap(); if (!mp) { leftTarget = rightTarget = finishTarget = null; finishTopY = null; return; }
  const Y0 = ctx.canvas.height - mp.height * TILE;

  // Leftmost black
  let lFound: { tx:number; ty:number } | null = null;
  for (let tx = 0; tx < mp.width && !lFound; tx++) {
    for (let ty = 0; ty < mp.height; ty++) {
      const id = (mp.tiles as any)[ty * mp.width + tx] | 0;
      if (isBlackTileId(id)) { lFound = { tx, ty }; break; }
    }
  }

  // Rightmost black
  let rFound: { tx:number; ty:number } | null = null;
  for (let tx = mp.width - 1; tx >= 0 && !rFound; tx--) {
    for (let ty = 0; ty < mp.height; ty++) {
      const id = (mp.tiles as any)[ty * mp.width + tx] | 0;
      if (isBlackTileId(id)) { rFound = { tx, ty }; break; }
    }
  }

  // FINISH scan → first center + topmost Y
  let fFirst: { tx:number; ty:number } | null = null;
  let minWy: number | null = null;
  for (let ty = 0; ty < mp.height; ty++) {
    for (let tx = 0; tx < mp.width; tx++) {
      if (((mp.tiles as any)[ty * mp.width + tx] | 0) === FINISH_ID) {
        const wx = tx * TILE + (TILE >> 1);
        const wy = Y0 + ty * TILE + (TILE >> 1);
        if (!fFirst) fFirst = { tx, ty };
        if (minWy == null || wy < minWy) minWy = wy; // topmost (smallest Y)
      }
    }
  }

  leftTarget   = lFound  ? { wx: lFound.tx  * TILE + (TILE >> 1), wy: Y0 + lFound.ty * TILE + (TILE >> 1) } : null;
  rightTarget  = rFound  ? { wx: rFound.tx  * TILE + (TILE >> 1), wy: Y0 + rFound.ty * TILE + (TILE >> 1) } : null;
  finishTarget = fFirst  ? { wx: fFirst.tx  * TILE + (TILE >> 1), wy: Y0 + fFirst.ty * TILE + (TILE >> 1) } : null;
  finishTopY   = minWy;
}

function d2(ax:number, ay:number, bx:number, by:number){ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; }

function portalPlacedNear(target: { wx:number; wy:number } | null): boolean {
  if (!target) return false;
  const A = (portals as any).A as { x:number; y:number } | undefined;
  const B = (portals as any).B as { x:number; y:number } | undefined;
  if (A && d2(A.x, A.y, target.wx, target.wy) <= PTR_HIT_R2) return true;
  if (B && d2(B.x, B.y, target.wx, target.wy) <= PTR_HIT_R2) return true;
  return false;
}

function refreshPointers() {
  if (!ctx) return;

  if (!leftTarget && leftPtrId)  { P8.removePointer(leftPtrId);  leftPtrId = null; }
  if (!rightTarget && rightPtrId){ P8.removePointer(rightPtrId); rightPtrId = null; }

  const haveLeft  = portalPlacedNear(leftTarget);
  const haveRight = portalPlacedNear(rightTarget);

  const wantLeft  = !haveLeft;
  const wantRight = !haveRight;

  // LEFT (W)
  if (wantLeft && leftTarget) {
    if (!leftPtrId) {
      const wx = leftTarget.wx + 14;
      const wy = leftTarget.wy + POINTER_Y_OFFSET_W;
      leftPtrId = P8.addPointer({ wx, wy, dir: "W", color: PTR_GREY });
    }
  } else if (leftPtrId) {
    P8.removePointer(leftPtrId); leftPtrId = null;
  }

  // RIGHT (E)
  if (wantRight && rightTarget) {
    if (!rightPtrId) {
      const wx = rightTarget.wx - 14;
      const wy = rightTarget.wy + POINTER_Y_OFFSET_E;
      rightPtrId = P8.addPointer({ wx, wy, dir: "E", color: PTR_GREY });
    }
  } else if (rightPtrId) {
    P8.removePointer(rightPtrId); rightPtrId = null;
  }
}

function hidePointerForImpact(px: number, py: number): "left" | "right" | null {
  let popped: "left" | "right" | null = null;
  if (leftTarget && leftPtrId) {
    if (d2(px, py, leftTarget.wx, leftTarget.wy) <= PTR_HIT_R2) {
      P8.removePointer(leftPtrId); leftPtrId = null;
      popped = "left";
    }
  }
  if (rightTarget && rightPtrId) {
    if (d2(px, py, rightTarget.wx, rightTarget.wy) <= PTR_HIT_R2) {
      P8.removePointer(rightPtrId); rightPtrId = null;
      popped = "right";
    }
  }
  return popped;
}

function toastRemainingPointer(whichKey: "A" | "B") {
  if (leftPtrId && leftTarget) {
    UI.pushWorldToastTokens(
      UI.tokensForRemainingKey(whichKey),
      leftTarget.wx,
      leftTarget.wy + POINTER_TOAST_Y_OFFSET,
      POINTER_TOAST_DUR
    );
  } else if (rightPtrId && rightTarget) {
    UI.pushWorldToastTokens(
      UI.tokensForRemainingKey(whichKey),
      rightTarget.wx,
      rightTarget.wy + POINTER_TOAST_Y_OFFSET,
      POINTER_TOAST_DUR
    );
  }
}

function computeJumpSuggestTarget(playerX: number, playerYTop: number): "A" | "B" | "GOAL" | null {
  const A = (portals as any).A as { x:number; y:number } | undefined;
  const B = (portals as any).B as { x:number; y:number } | undefined;
  const both = !!A && !!B;
  if (!both) return null;

  if (finishTopY != null && playerYTop > finishTopY) {
    return "GOAL";
  }

  const dA = A ? d2(playerX, playerYTop, A.x, A.y) : Number.POSITIVE_INFINITY;
  const dB = B ? d2(playerX, playerYTop, B.x, B.y) : Number.POSITIVE_INFINITY;
  if (!isFinite(dA) && !isFinite(dB)) return null;
  return dA <= dB ? "A" : "B";
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

    UI.resetAll();
    clearAllPointersLocal(); // ⬅️ ensure IDs + array cleared together
    jumpReleaseTimer = 0;
    prevJumpHeld = false;

    createAnimator(a => {
      player = createPlayer(a);
      portals.setAnimator(a);
      portals.setPlayer(player);

      // Tutorial-only: require portals to be spaced out (≥ 3 tiles)
      portals.setMinSeparation(TILE * 3);

      // Shifted spawn
      player.setSpawn(CURRENT_SPAWN.x, CURRENT_SPAWN.y);
      player.respawn();

      const origTele = player.onTeleported;
      player.onTeleported = (dir: "R" | "L" | "U" | "D") => {
        UI.clearPortalHint();
        origTele?.(dir);
      };

      const mp = getCurrentMap();
      if (mp && ctx) player.setLevelBounds(mp.width, mp.height, ctx.canvas.height, TILE);

      const target = player ? player.body.pos.x : 0;
      bgX = bgXPrev = target;

      computeTargets();
      refreshPointers();
    });

    // Input → portal system
    portals.attachInput(ctx.canvas, cam);

    // Raycast outcome → UI feedback + pointer updates
    (portals as any).onShot = (ev: any) => {
      const px = (ev.impactX ?? ev.ax) | 0;
      const py = (ev.impactY ?? ev.ay) | 0;

      if (ev.hitBlack) {
        UI.clearPortalHint();
        UI.pushPing(px, py, "#7aa2ff", 0.45);

        const popped = hidePointerForImpact(px, py);
        if (popped) {
          const remainingKey: "A" | "B" = (ev.k === "A") ? "B" : "A";
          toastRemainingPointer(remainingKey);
        }
      } else {
        UI.requirePortalHint();
        UI.pushPing(px, py, "#ff4d4d", 0.55);

        if (ev.tooClose) {
          UI.pushWorldToastText("PORTALS TOO CLOSE - PLACE ON OPPOSITE WALL", px, py - 4, 2.2);
        } else {
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
      }

      refreshPointers();
    };

    // Resize → recompute bounds and targets
    addEventListener("resize", () => {
      if (!ctx || !player) return;
      const mp = getCurrentMap();
      if (mp) {
        player.setLevelBounds(mp.width, mp.height, ctx.canvas.height, TILE);
        computeTargets();
        refreshPointers();
      }
    });
  },

  stop() {
    // No key listeners (help/skip removed)
  },

  update() {
    if (!ctx) return;

    const inp = getInputState();

    // 🆕 Tell UI which control mode to speak (mouse/keyboard vs gamepad)
    UI.setControlMode(inp.source === "gp" ? "gp" : "kbd", !!inp.gamepadConnected);

    // ── Feed right-stick + triggers into PortalSystem
    if ("rx" in inp && "ry" in inp) {
      portals.updateGamepad(
        { rx: inp.rx, ry: inp.ry, shootA: inp.shootA, shootB: inp.shootB },
        cam,
        ctx.canvas.height
      );
    }

    // Win countdown
    const inWin = winT > 0;
    if (inWin) {
      if (--winT === 0) {
        try { setPendingStartLevelZeroBased(NEXT_LEVEL_INDEX); } catch {}
        setScene(BackgroundScene);
      }
    }

    // RESET
    if (inp.reset && !prevReset) {
      UI.resetAll();
      clearAllPointersLocal(); // ⬅️ keep pointers + IDs in sync
      player?.reset?.();
      (portals as any).reset?.() ?? portals.clear?.();
      jumpReleaseTimer = 0;

      computeTargets();
      refreshPointers();
    }
    prevReset = !!inp.reset;

    if (!inWin) {
      // Jump hint suppression window
      const jumpHeld = !!(inp.jump);
      if (prevJumpHeld && !jumpHeld) {
        jumpReleaseTimer = 0.4;
      }
      prevJumpHeld = jumpHeld;
      if (jumpReleaseTimer > 0) jumpReleaseTimer -= 1/60;

      // Sim
      player?.update(inp, ctx);
      portals.tick();

      // Keep pointer state in sync with actually placed portals
      refreshPointers();

      // Spike/finish checks (+ SFX on spike)
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
                    UI.pushWorldToastText(
                      "AVOID SPIKES USING PRECISE MOVEMENT!",
                      CURRENT_SPAWN.x,
                      CURRENT_SPAWN.y - 12,
                      3.3
                    );
                    try { (zzfx as any)(...(dieSfx as any)); } catch {}
                    player.reset?.();
                    UI.clearPortalHint();
                    refreshPointers();
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

            const centerX = (player.body.pos.x + H.x + (H.w >> 1)) | 0;
            const topY    = (player.body.pos.y + H.y) | 0;
            UI.showGoodJobNearPlayer(centerX, topY, 3.0);

            const pb: any = player.body;
            zeroBodyMotion(pb);
            if (pb.pos) {
              pb.pos.x = Math.round(pb.pos.x);
              pb.pos.y = Math.round(pb.pos.y);
            }
            if ("grounded" in pb) pb.grounded = true;

            player?.celebrateWin?.(WIN_TICKS);
            winT = WIN_TICKS;
            (portals as any).reset?.() ?? portals.clear?.();
            clearAllPointersLocal(); // ⬅️ was P8.clear()

            const target = player.body.pos.x;
            bgX = bgXPrev = target;
          }
        }
      }
    } // end !inWin

    // UI/pointers/camera/bg
    UI.tick(1 / 50);
    P8.tick(1 / 60);

    const mp = getCurrentMap();
    const ww = mp ? mp.width * TILE : 1e4;
    const wh = mp ? mp.height * TILE : 1e4;
    const px = player ? player.body.pos.x : cam.x;
    const py = player ? player.body.pos.y : cam.y;

    updateSmoothCamera(
      cam, px, py, ctx.canvas.width, ctx.canvas.height * 0.7, ww, wh, CAM_EASE, CAM_DT, true
    );

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

      const Y0 = c.canvas.height - mp.height*TILE;
      for (let ty=0; ty<mp.height; ty++) {
        const row = ty*mp.width, y = (Y0 + ty*TILE)|0;
        for (let tx=0; tx<mp.width; tx++) {
          if ((mp.tiles as any)[row+tx] === FINISH_ID) {
            drawFinish(c, (tx*TILE)|0, y, TILE);
          }
        }
      }

      player?.draw(c, tMs);
      portals.draw(c, tMs);

        // WORLD UI above portals
        P8.drawWorld(c, t);      // pointers first (underlays)
        UI.drawWorld(c, t, cam); // toasts last (overlays)

      // Near-player hints
      if (player) {
        const b = player.body;
        const H = getHB(b);
        const wx = (b.pos.x + H.x + (H.w >> 1)) | 0;
        const wy = (b.pos.y + H.y) | 0;

        const inp = getInputState();
        const hasA = !!(portals as any).A;
        const hasB = !!(portals as any).B;

        const suggestTo = (hasA && hasB) ? computeJumpSuggestTarget(wx, wy) : null;

        UI.drawPlayerHints(c, wx, wy, {
          grounded: !!b.grounded,
          jumpHeld: !!inp.jump,
          recentlyReleased: false,
          aimLeft: !!inp.left,
          aimRight: !!inp.right,
          powerDown: !!inp.down,
          bothPortalsPlaced: hasA && hasB,
          suggestTo,
        } as any);
      }
    }

    c.restore();

    // HUD
    const hasA = !!(portals as any).A;
    const hasB = !!(portals as any).B;
    UI.drawHud(c, t, UI.promptForStepTokensSmart(hasA, hasB));
  }
};
