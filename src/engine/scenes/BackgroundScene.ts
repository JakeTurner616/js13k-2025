// src/engine/scenes/BackgroundScene.ts
// Tiny, readable, and Terser-friendly scene:
// - FAR/MID building rows unified
// - minimal locals, short keys, compact loops
// - no behavior changes (stars/moon/vapor/clounds/haze/terrain/camera/map/player)

import { drawStars } from "./effects/Stars";
import { drawClouds } from "./effects/Clouds";
import { drawNeonHaze } from "./effects/NeonHaze";
import { drawMoon } from "./effects/Moon";

import { drawBuilding } from "./objects/drawBuilding";
import { getInputState } from "../input/input";
import { generateBuildingVariants } from "./init/initBuildingVariants";
import {
  drawTerrainBehind, drawTerrainFront, createFractalBackdropLayer, type Drawer
} from "./effects/terrain/Terrain";

import { drawMapAndColliders } from "../renderer/render";
import { loadLevel1, getCurrentMap } from "../renderer/level-loader";
import { createAnimator } from "../../atlas/animationAtlas";
import { createPlayer, type Player } from "../../player/Player";
import { updateSmoothCamera, type Cam } from "../camera/Camera";
import type { BuildingVariant } from "./objects/types";

// NEW: portals
import { createPortalManager, type PortalKind, PORTAL_W, PORTAL_H } from "../objects/portals/Portals";
import { createPortalGun } from "../objects/portals/PortalGun";
import type { Ori } from "../objects/portals/PortalPlacement";

const TILE = 16;
let ctx:CanvasRenderingContext2D|null = null;
let vapor:Drawer|null = null;
let player:Player|null = null;
let cam:Cam = { x:0, y:0 };
let bgX = 0;

// NEW: portal systems (world-space)
const portals = createPortalManager(TILE);
const portalGun = createPortalGun(TILE);

// Layer cfg (short keys to help minifiers):
const L = [
  { min:80, max:250, sc:.60, sp:.08, gap:120, lift:30,  bias:.95, M:new Map<number, BuildingVariant>() },
  { min:70, max:200, sc:.82, sp:.15, gap:136, lift:42,  bias:1.05, M:new Map<number, BuildingVariant>() }
] as const;

// --- Helper: screen -> canvas px -> world px (zoom/devicePixelRatio safe) ---
function screenToWorld(clientX:number, clientY:number, c:HTMLCanvasElement, cam:Cam){
  const r = c.getBoundingClientRect();
  const cx = (clientX - r.left) * (c.width  / r.width);
  const cy = (clientY - r.top ) * (c.height / r.height);
  const wx = cx + (cam.x - c.width  * 0.5);
  const wy = cy + (cam.y - c.height * 0.5);
  return { wx, wy };
}

// --- Tiny math helpers for portal frame transforms ---
function toBasis(vx:number, vy:number, o:Ori){
  if (o === "R") return { n:  vx, t:  vy };  // n=+X, t=+Y
  if (o === "L") return { n: -vx, t:  vy };  // n=-X, t=+Y
  if (o === "U") return { n: -vy, t:  vx };  // n=-Y, t=+X
  /* o === "D" */ return { n:  vy, t:  vx }; // n=+Y, t=+X
}
function fromBasis(n:number, t:number, o:Ori){
  if (o === "R") return { vx:  n, vy:  t };
  if (o === "L") return { vx: -n, vy:  t };
  if (o === "U") return { vx:  t, vy: -n };
  /* o === "D" */ return { vx:  t, vy:  n };
}
function pushOutAlong(o:Ori, amount:number){
  if (o === "R") return { dx: amount, dy: 0 };
  if (o === "L") return { dx:-amount, dy: 0 };
  if (o === "U") return { dx: 0, dy:-amount };
  /* o === "D" */ return { dx: 0, dy: amount };
}
// NEW: push out by *hitbox half-extent* along the portal normal (+ small pad)
function pushOutByHitbox(o:Ori, halfW:number, halfH:number, pad=2){
  if (o === "R" || o === "L") return pushOutAlong(o, halfW + pad);
  return pushOutAlong(o, halfH + pad);
}

export const BackgroundScene = {
  setCanvas(c:CanvasRenderingContext2D){ ctx = c; },

  start(){
    L[0].M.clear(); L[1].M.clear();
    if (ctx){ const k=ctx.canvas; cam.x = k.width*.5; cam.y = k.height*.5; }
    vapor = createFractalBackdropLayer(7, 0.12, 0.62, 90, "#131824", 4);
    loadLevel1();
    createAnimator(a => {
      player = createPlayer(a);
      if (ctx) player.body.pos = { x:64, y:24 };
      portals.setAnimator(a);
    });

    // Mouse firing (left=A / right=B), with zoom-safe aim
    if (ctx) {
      const c = ctx.canvas;
      c.oncontextmenu = e => { e.preventDefault(); return false; };
      c.addEventListener("mousedown", (e)=>{
        const map = getCurrentMap(); if (!map) return;

        const { wx, wy } = screenToWorld(e.clientX, e.clientY, c, cam);
        const px = player ? (player.body.pos.x + player.body.width*0.5) : wx;
        const py = player ? (player.body.pos.y + player.body.height*0.5) : wy;
        const dx = wx - px, dy = wy - py;

        const kind: PortalKind = (e.button === 2) ? "B" : "A";
        portalGun.spawn(kind, px, py, dx, dy, map, c.height);
      });
    }
  },

  stop(){},

  update(){
    if (!ctx) return;
    const c = ctx;
    const inp = getInputState();
    player?.update(inp, c);

    // portals: advance projectiles; place portals in world-space when they hit
    const dt = 1/60;
    portalGun.update(dt, (kind: PortalKind, x: number, y: number, angle: number, o: Ori) => {
      portals.replaceWorld(kind, x, y, angle, o);
    });

    // --- Tiny teleport check (no colliders) ---
    if (player) {
      const P = portals.getSlots(); // {A?,B?}
      if (P.A && P.B) {
        // player center
        const cx = player.body.pos.x + (player.body.width  * 0.5);
        const cy = player.body.pos.y + (player.body.height * 0.5);

        // current inside mask (bit0=A, bit1=B)
        const b:any = player.body as any;
        const oldMask = b.pMask | 0;

        // hitbox half extents
        const hw = ((player.body.hit?.w ?? player.body.width)  * 0.5) | 0;
        const hh = ((player.body.hit?.h ?? player.body.height) * 0.5) | 0;

        // local AABB test; extend along portal normal by half extents
        const insideBit = (p:{x:number;y:number;angle:number;o:Ori}, bit:number)=>{
          const dx = cx - p.x, dy = cy - p.y;
          const ca = Math.cos(-p.angle), sa = Math.sin(-p.angle);
          const lx = dx*ca - dy*sa, ly = dx*sa + dy*ca; // portal-local
          const rx = PORTAL_W * 0.40, ry = PORTAL_H * 0.46;

          if (p.o === "R" || p.o === "L") {
            const rxN = rx + hw;
            return (Math.abs(lx) <= rxN && Math.abs(ly) <= ry) ? bit : 0;
          } else {
            const ryN = ry + hh;
            return (Math.abs(lx) <= rx && Math.abs(ly) <= ryN) ? bit : 0;
          }
        };

        const inA = insideBit(P.A as any, 1);
        const inB = insideBit(P.B as any, 2);
        const newMask = inA | inB;

        const enterA = (inA && !(oldMask & 1));
        const enterB = (inB && !(oldMask & 2));

        if (enterA || enterB) {
          const enter = enterA ? P.A! : P.B!;
          const exit  = enterA ? P.B! : P.A!;

          // velocity mapping: flip normal so we come OUT of the exit
          const lv = toBasis(player.body.vel.x, player.body.vel.y, enter.o);
          const re = fromBasis(-lv.n, lv.t, exit.o);

          // move center beyond exit plane by half hitbox (no clipping)
          const kick = pushOutByHitbox(exit.o, hw, hh, /*pad=*/2);
          const px = exit.x + kick.dx, py = exit.y + kick.dy;
          const ddx = px - (player.body.pos.x + player.body.width*0.5);
          const ddy = py - (player.body.pos.y + player.body.height*0.5);
          player.body.pos.x += ddx; player.body.pos.y += ddy;

          // apply velocity (no speed loss / no artificial boost)
          player.body.vel.x = re.vx;
          player.body.vel.y = re.vy;

          // clear contacts so next physics step doesn’t glue or eat speed
          player.body.grounded = false;
          player.body.touchL = false;
          player.body.touchR = false;
          player.body.hitWall = 0;

          // prevent immediate re-trigger on exit this frame
          b.pMask = 3;

          // tell the player it's overlapping a portal for a few frames
          (player as any).setTouchingPortal?.(true, 3);
        } else {
          b.pMask = newMask;
          (player as any).setTouchingPortal?.(newMask !== 0, 2);
        }
      } else {
        (player as any).setTouchingPortal?.(false);
        (player.body as any).pMask = 0;
      }
    }

    const px = player ? player.body.pos.x : bgX + ((+!!inp.right) - (+!!inp.left)) * 2;
    bgX += (px - bgX) * 0.18;

    const mp = getCurrentMap();
    const ww = mp ? mp.width  * TILE : 1e4;
    const wh = mp ? mp.height * TILE : 1e4;
    const py = player ? player.body.pos.y : cam.y;

    updateSmoothCamera(cam, px, py, c.canvas.width, c.canvas.height, ww, wh, 0.14, 1/60, true);
  },

  draw(t:number){
    if (!ctx) return;
    const c = ctx, k = c.canvas, w = k.width, h = k.height, time = t/1000;

    // sky gradient
    const g = c.createLinearGradient(0,0,0,h);
    [0,.4,.8,1].forEach((s,i)=>g.addColorStop(s, ["#090016","#250040","#1a1d2f","#0b0c12"][i]));
    c.fillStyle = g; c.fillRect(0,0,w,h);

    // backdrops
    drawStars(c, w, h, time, time*0.15);
    drawMoon(c, w, h, time, bgX);
    vapor?.(c, w, h, time, bgX);
    drawClouds(c, w, h, time, bgX + time*0.25);
    drawNeonHaze(c, w, h, time, bgX);

    // compact row renderer (shared by FAR/MID)
    const row = (r:typeof L[number])=>{
      const { min,max, sc, sp, gap, lift, bias, M } = r;
      const lx = bgX * sp, sw = w / sc;
      const si = Math.floor((lx - sw) / gap);
      const ei = Math.ceil ((lx + sw*2) / gap);
      const hmul = (1/sc)*bias;

      c.save(); c.scale(sc, sc);
      for (let i=si; i<ei; i++){
        if (!M.has(i)) M.set(i, generateBuildingVariants(1, min, max, hmul)[0]);
        const v = M.get(i)!;
        const by = (h - v.h - 20 + (v as any).groundOffset + 30 + lift) / sc;
        drawBuilding(c, i*gap - lx, by, v, time);
      }
      c.restore();
    };

    row(L[0]);
    drawTerrainBehind(c, w, h, time, bgX);
    row(L[1]);

    // world layer
    c.save();
    c.translate((w*.5 - cam.x)|0, (h*.5 - cam.y)|0);
    const map = getCurrentMap();
    if (map) drawMapAndColliders(c, map, TILE);
    player?.draw(c, t);

    // raycast viz in world-space (aim matches geometry & zoom)
    portalGun.draw(c, t);

    // portals on top
    portals.draw(c, t);
    c.restore();

    drawTerrainFront(c, w, h, time, bgX);
  }
};
