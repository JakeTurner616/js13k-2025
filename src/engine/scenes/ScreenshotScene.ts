// src/engine/scenes/ScreenshotScene.ts
//
// -------------------------------------------------------------------------------------
// Screenshot Scene ₍^. .^₎⟆
// -------------------------------------------------------------------------------------
// This scene should NOT be bundled as part of the final 13kb build. It exists purely for
// taking screenshots with the player, the environment, and the UI overlays. Features include:
//
//  - Inline self-contained MAP (no external or minified level JSON).
//  - Fixed player spawn point for consistency.
//  - Camera auto-centers on the player.
//  - Portals can be shot with left/right mouse (dev helper).
//  - Title text ("FLYKT") is rendered above the player wherever they move.
//  - Press **F** to freeze / unfreeze time. While frozen:
//      * Physics, portals, camera, animations, environment all pause.
//      * Timestamp is held constant.
//      * A "FROZEN (F)" badge is shown on screen.
//    This makes it easier to line up perfect screenshots for a consistent in-game look.
// -------------------------------------------------------------------------------------
import { drawMapAndColliders } from "../renderer/render";
import { createAnimator } from "../../atlas/animationAtlas";
import { createPlayer, type Player } from "../../player/Player";
import { Environment } from "./background/Environment";
import { PortalSystem } from "./background/PortalSystem";
import { updateSmoothCamera, type Cam } from "../camera/Camera";
import { getInputState } from "../input/input";
import { setSolidTiles } from "../../player/Physics";
import { s2w } from "./background/sceneUtils";
import { drawText as D } from "../font/fontEngine";


const TILE = 16;

let ctx: CanvasRenderingContext2D | null = null;
let cam: Cam = { x: 0, y: 0 };
let bgX = 0;

const env = new Environment();
const portals = new PortalSystem();

let player: Player | null = null;
let detachMouse: (() => void) | null = null;

// --- Freeze state ---
let frozen = false;
let frozenNow = 0;                 // ms timestamp to hold while frozen
let keyHandler: ((e: KeyboardEvent) => void) | null = null;

// === Inline Tiled map === (unchanged; trimmed here)
const MAP = {
  width: 38,
  height: 30,
  tiles: new Uint32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 1, 1, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 2,
            2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 2, 2,
            2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 4, 4, 4, 4, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 2, 2,
            1, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 2, 2, 2,
            1, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 2, 2,
            2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 0, 0, 4, 0, 0, 0, 0, 0, 3, 3, 2, 2, 2, 2, 2, 1, 1, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
};

// Tiles treated as solid (spikes 4 are harmful, not solid)
const SOLIDS = [1, 2];

const mapY0 = () => (ctx ? ctx.canvas.height - MAP.height * TILE : 0);
const tid = (x: number, y: number) =>
  (x >= 0 && y >= 0 && x < MAP.width && y < MAP.height) ? MAP.tiles[y * MAP.width + x] | 0 : 0;
const isSolid = (id: number) => SOLIDS.includes(id);

function findGroundTy(tx: number, startTy = 0): number {
  let lastAir = true;
  for (let ty = startTy; ty < MAP.height; ty++) {
    const s = isSolid(tid(tx, ty));
    if (s && lastAir) return ty;
    lastAir = !s;
  }
  return Math.max(0, MAP.height - 2);
}

function placePlayerOnTile(tx: number, groundTy: number) {
  if (!player) return;
  const b: any = player.body;
  const hb = b.hit || { x: 0, y: 0, w: b.width, h: b.height };
  const px = tx * TILE + (TILE >> 1) - (hb.x + (hb.w >> 1));
  const groundY = mapY0() + groundTy * TILE;
  const py = groundY - (hb.y + hb.h) - 0.01;
  b.pos.x = px | 0;
  b.pos.y = py | 0;
  // keep dev spawn consistent with main game reset
  player.setSpawn(64, 24);
}

async function installMapForEngine() {
  setSolidTiles(SOLIDS);
  try {
    const LL: any = await import("../renderer/level-loader");
    if (LL.setCurrentMap) { LL.setCurrentMap(MAP); return; }
    if (LL.setMap)        { LL.setMap(MAP);        return; }
    if (LL.loadInlineMap) { LL.loadInlineMap(MAP); return; }
    if ("current" in LL)  { LL.current = MAP; }
    if ("__map"   in LL)  { LL.__map  = MAP; }
    if (LL.getCurrentMap) { LL.getCurrentMap = () => MAP; }
  } catch {}
}

export const ScreenshotScene = {
  __ctx: null as CanvasRenderingContext2D | null,

  setCanvas(c: CanvasRenderingContext2D) { this.__ctx = c; ctx = c },

  async start() {
    env.start?.();
    await installMapForEngine();

    // Freeze toggle (F)
    keyHandler = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        frozen = !frozen;
        if (frozen) {
          // capture current time once; draw() will stick to it
          frozenNow = performance.now();
        }
      }
    };
    addEventListener("keydown", keyHandler);

    createAnimator((a) => {
      player = createPlayer(a);

      // spawn near mid-left for composition
      const tx = Math.floor(MAP.width * 0.35);
      const groundTy = findGroundTy(tx, 0);
      placePlayerOnTile(tx, groundTy);

      if (player && ctx) {
        const b: any = player.body;
        cam.x = b.pos.x; cam.y = b.pos.y;
        bgX = b.pos.x | 0;
        player.setLevelBounds(MAP.width, MAP.height, ctx.canvas.height, TILE);
      }

      portals.setAnimator(a);
      portals.setPlayer(player!);

      if (ctx) {
        const cv = ctx.canvas;
        const onMouse = (e: MouseEvent) => {
          e.preventDefault();
          const { wx, wy } = s2w(e.clientX, e.clientY, cv, cam);
          const b: any = player?.body;
          const sx = b ? (b.pos.x + (b.width >> 1)) : wx;
          const sy = b ? (b.pos.y + (b.height >> 1)) : wy;
          const which = e.button === 2 ? "B" : "A";
          (portals as any).spawn(which, sx, sy, wx - sx, wy - sy, MAP, cv.height);
        };
        cv.oncontextmenu = (ev) => { ev.preventDefault(); return false; };
        cv.addEventListener("mousedown", onMouse);
        detachMouse = () => { cv.removeEventListener("mousedown", onMouse); cv.oncontextmenu = null; };
      }
    });
  },

  stop() {
    detachMouse?.(); detachMouse = null;
    if (keyHandler) removeEventListener("keydown", keyHandler), keyHandler = null;
    frozen = false;
  },

  update() {
    if (!ctx) return;

    // If frozen: skip ALL world updates (player physics, portals, camera)
    if (frozen) return;

    const c = ctx, inp = getInputState();

    if (inp.reset && player) {
      const tx = Math.floor(MAP.width * 0.35);
      const groundTy = findGroundTy(tx, 0);
      placePlayerOnTile(tx, groundTy);
      portals.reset?.() ?? portals.clear();
      const b: any = player.body; bgX = b.pos.x;
    }

    portals.tick();
    player?.update?.(inp, c);

    const sw = c.canvas.width, cap = c.canvas.height * .7;
    const ww = MAP.width * TILE, wh = MAP.height * TILE;
    const b: any = player?.body;
    const px = b ? b.pos.x : bgX;
    const py = b ? b.pos.y : cam.y;

    bgX += (px - bgX) * .18;
    updateSmoothCamera(cam, px, py, sw, cap, ww, wh, .14, 1 / 60, true);
  },

  draw(now: number, _alpha: number) {
    if (!ctx) return;
    const c = ctx, { width: w, height: h } = c.canvas;

    // Use a stuck timestamp while frozen (freezes env + anims)
    const nowMs = frozen ? frozenNow : now;
    const t = nowMs / 1000;

    env.draw(c, t, bgX);

    // --- world-space ---
    c.save();
    c.translate((w * .5 - cam.x) | 0, (h * .5 - cam.y) | 0);

    drawMapAndColliders(c, MAP, TILE);

    // player / portals
    (player as any)?.draw?.(c, nowMs);
    portals.draw(c, nowMs);

    // --- title above player (follows player) ---
    if (player) {
      const b: any = player.body;
      const hb = b.hit || { x: 0, y: 0, w: b.width, h: b.height };

      const title = "FLYKT";
      const scale = 2;
      const tw = title.length * 6 * scale - scale;
      const cx = b.pos.x + hb.x + (hb.w * 0.5);
      const yTop = b.pos.y + hb.y - 30;
      const x = (cx - tw * 0.5) | 0;
      const y = (yTop - 10) | 0;

      D(c, title, x + 1, y + 1, scale, "#000");
      D(c, title, x,     y,     scale, "#7aa2ff");
    }

    c.restore();

    // Screen-space badge so you know it's frozen
    if (frozen) {
      const label = "FROZEN (F)";
      const sc = 1;
      const tw = label.length * 6 * sc - sc;
      const x = ((w - tw) >> 1);
      const y = 6;
      c.globalAlpha = 0.9;
      D(c, label, x + 1, y + 1, sc, "#000");
      D(c, label, x,     y,     sc, "#e5e7eb");
      c.globalAlpha = 1;
    }
  }
};
