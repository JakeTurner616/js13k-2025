// src/engine/scenes/BackgroundScene.ts
// Compact, human-friendly scene with portals.

import { drawStars } from "./effects/Stars";
import { drawClouds } from "./effects/Clouds";
import { drawNeonHaze } from "./effects/NeonHaze";
import { drawMoon } from "./effects/Moon";

import { drawBuilding } from "./objects/drawBuilding";
import { getInputState } from "../input/input";
import { generateBuildingVariants } from "./init/initBuildingVariants";
import { drawTerrainBehind, drawTerrainFront, createFractalBackdropLayer, type Drawer } from "./effects/terrain/Terrain";

import { drawMapAndColliders } from "../renderer/render";
import { loadLevel1, getCurrentMap } from "../renderer/level-loader";
import { createAnimator } from "../../atlas/animationAtlas";
import { createPlayer, type Player } from "../../player/Player";
import { updateSmoothCamera, type Cam } from "../camera/Camera";
import type { BuildingVariant } from "./objects/types";

// portals
import { createPortalManager, type PortalKind, PORTAL_W, PORTAL_H } from "../objects/portals/Portals";
import { createPortalGun } from "../objects/portals/PortalGun";
import type { Ori } from "../objects/portals/PortalPlacement";

// SFX
import { port } from "../../sfx/port";
import { zzfx } from "../audio/SoundEngine"; // ✅ import actual zzfx

const TILE = 16;
let ctx:CanvasRenderingContext2D|null = null;
let vapor:Drawer|null = null;
let player:Player|null = null;
let cam:Cam = { x:0, y:0 };
let bgX = 0;

const portals = createPortalManager(TILE);
const portalGun = createPortalGun(TILE);

// layer config (names kept tiny for terser)
const L = [
  { min:80, max:250, sc:.60, sp:.08, gap:120, lift:30,  bias:.95, M:new Map<number, BuildingVariant>() },
  { min:70, max:200, sc:.82, sp:.15, gap:136, lift:42,  bias:1.05, M:new Map<number, BuildingVariant>() }
] as const;

// --- tiny helpers ---
const s2w = (x:number,y:number,c:HTMLCanvasElement,cam:Cam)=>{
  const r = c.getBoundingClientRect(), sx = (x - r.left) * (c.width  / r.width), sy = (y - r.top) * (c.height / r.height);
  return { wx: sx + (cam.x - c.width * .5), wy: sy + (cam.y - c.height * .5) };
};
const tb = (vx:number,vy:number,o:Ori)=> // world→(n,t)
  o==="R" ? {n:vx,  t:vy} :
  o==="L" ? {n:-vx, t:vy} :
  o==="U" ? {n:-vy, t:vx} : {n:vy, t:vx};
const fb = (n:number,t:number,o:Ori)=>    // (n,t)→world
  o==="R" ? {vx:n,  vy:t} :
  o==="L" ? {vx:-n, vy:t} :
  o==="U" ? {vx:t,  vy:-n} : {vx:t, vy:n};
const push = (o:Ori,d:number)=>           // push along portal normal
  o==="R"?{dx:d,dy:0}:o==="L"?{dx:-d,dy:0}:o==="U"?{dx:0,dy:-d}:{dx:0,dy:d};
const pushByHit = (o:Ori,hw:number,hh:number,p=2)=> // push by hitbox half extent (+pad)
  (o==="R"||o==="L") ? push(o, hw+p) : push(o, hh+p);

export const BackgroundScene = {
  setCanvas(c:CanvasRenderingContext2D){ ctx = c; },

  start(){
    L[0].M.clear(); L[1].M.clear();
    if (ctx){ const k=ctx.canvas; cam.x = k.width*.5; cam.y = k.height*.5; }
    vapor = createFractalBackdropLayer(7, .12, .62, 90, "#131824", 4);
    loadLevel1();
    createAnimator(a=>{
      player = createPlayer(a);
      if (ctx) player.body.pos = { x:64, y:24 };
      portals.setAnimator(a);
    });

    if (ctx){
      const c = ctx.canvas;
      c.oncontextmenu = e => (e.preventDefault(), false);
      c.addEventListener("mousedown", e=>{
        const map = getCurrentMap(); if (!map) return;
        const { wx, wy } = s2w(e.clientX, e.clientY, c, cam);
        const px = player ? player.body.pos.x + player.body.width*.5  : wx;
        const py = player ? player.body.pos.y + player.body.height*.5 : wy;
        const kind:PortalKind = (e.button===2) ? "B" : "A";
        portalGun.spawn(kind, px, py, wx-px, wy-py, map, c.height);
      });
    }
  },

  stop(){},

  update(){
    if (!ctx) return;
    const c = ctx, inp = getInputState();
    player?.update(inp, c);

    // advance portal shots & place portals
    portalGun.update(1/60, (kind, x, y, angle, o)=> portals.replaceWorld(kind, x, y, angle, o));

    // --- teleport (A/B pair, no colliders) ---
    if (player){
      const P = portals.getSlots();
      if (P.A && P.B){
        const b:any = player.body, cx = b.pos.x + b.width*.5, cy = b.pos.y + b.height*.5, oldMask = b.pMask|0;
        const hw = (b.hit?.w ?? b.width)  * .5, hh = (b.hit?.h ?? b.height) * .5;

        const insideBit = (p:{x:number;y:number;angle:number;o:Ori}, bit:number)=>{
          const dx = cx - p.x, dy = cy - p.y, ca = Math.cos(-p.angle), sa = Math.sin(-p.angle);
          const lx = dx*ca - dy*sa, ly = dx*sa + dy*ca;
          const rx = PORTAL_W*.40, ry = PORTAL_H*.46;
          return (p.o==="R"||p.o==="L")
            ? (Math.abs(lx) <= rx+hw && Math.abs(ly) <= ry ? bit : 0)
            : (Math.abs(lx) <= rx    && Math.abs(ly) <= ry+hh ? bit : 0);
        };

        const inA = insideBit(P.A,1), inB = insideBit(P.B,2), newMask = inA|inB;
        const enterA = inA && !(oldMask&1), enterB = inB && !(oldMask&2);

        if (enterA || enterB){
          const enter = enterA ? P.A! : P.B!, exit = enterA ? P.B! : P.A!;
          // map velocity; flip normal so momentum points out of exit
          const lv = tb(b.vel.x, b.vel.y, enter.o), re = fb(-lv.n, lv.t, exit.o);

          // move beyond exit by hitbox half extent (+pad) to avoid clipping
          const k = pushByHit(exit.o, hw, hh, 2);
          const px = exit.x + k.dx, py = exit.y + k.dy;
          b.pos.x += px - (b.pos.x + b.width*.5);
          b.pos.y += py - (b.pos.y + b.height*.5);

          // apply velocity (no boost, no loss) and clear contacts
          b.vel.x = re.vx; b.vel.y = re.vy;
          b.grounded = false; b.touchL = false; b.touchR = false; b.hitWall = 0;

          // 🔊 play SFX on portal enter
          zzfx?.(...(port as unknown as number[]));

          // suppress immediate re-trigger + mark overlap briefly
          b.pMask = 3;
          (player as any).setTouchingPortal?.(true, 3);
        } else {
          b.pMask = newMask;
          (player as any).setTouchingPortal?.(newMask!==0, 2);
        }
      } else {
        (player as any).setTouchingPortal?.(false);
        (player!.body as any).pMask = 0;
      }
    }

    // bg pan target = player x (or simple LR drift if no player)
    const px = player ? player.body.pos.x : bgX + ((+!!inp.right) - (+!!inp.left)) * 2;
    bgX += (px - bgX) * .18;

    const mp = getCurrentMap(), ww = mp ? mp.width*TILE : 1e4, wh = mp ? mp.height*TILE : 1e4;
    const py = player ? player.body.pos.y : cam.y;
    updateSmoothCamera(cam, px, py, c.canvas.width, c.canvas.height, ww, wh, .14, 1/60, true);
  },

  draw(t:number){
    if (!ctx) return;
    const c = ctx, k = c.canvas, w = k.width, h = k.height, time = t/1000;

    // sky
    const g = c.createLinearGradient(0,0,0,h);
    [0,.4,.8,1].forEach((s,i)=>g.addColorStop(s, ["#090016","#250040","#1a1d2f","#0b0c12"][i]));
    c.fillStyle = g; c.fillRect(0,0,w,h);

    // backdrops
    drawStars(c, w, h, time, time*.15);
    drawMoon(c, w, h, time, bgX);
    vapor?.(c, w, h, time, bgX);
    drawClouds(c, w, h, time, bgX + time*.25);
    drawNeonHaze(c, w, h, time, bgX);

    // FAR/MID rows
    const row = (r:typeof L[number])=>{
      const { min,max, sc, sp, gap, lift, bias, M } = r;
      const lx = bgX*sp, sw = w/sc, si = Math.floor((lx - sw)/gap), ei = Math.ceil((lx + sw*2)/gap), hmul = (1/sc)*bias;
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

    // world
    c.save();
    c.translate((w*.5 - cam.x)|0, (h*.5 - cam.y)|0);
    const map = getCurrentMap();
    if (map) drawMapAndColliders(c, map, TILE);
    player?.draw(c, t);
    portalGun.draw(c, t); // raycast viz
    portals.draw(c, t);
    c.restore();

    drawTerrainFront(c, w, h, time, bgX);
  }
};
