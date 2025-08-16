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

const TILE = 16;
let ctx:CanvasRenderingContext2D|null = null;
let vapor:Drawer|null = null;
let player:Player|null = null;
let cam:Cam = { x:0, y:0 };
let bgX = 0;

// Layer cfg (short keys to help minifiers):
// min/max: building height range, sc: scale, sp: parallax speed,
// gap: spacing, lift: base lift, bias: height bias, M: cache map
const L = [
  { min:80, max:250, sc:.60, sp:.08, gap:120, lift:30,  bias:.95, M:new Map<number, BuildingVariant>() },
  { min:70, max:200, sc:.82, sp:.15, gap:136, lift:42,  bias:1.05, M:new Map<number, BuildingVariant>() }
] as const;

export const BackgroundScene = {
  setCanvas(c:CanvasRenderingContext2D){ ctx = c; },

  start(){
    L[0].M.clear(); L[1].M.clear();
    if (ctx){ const k=ctx.canvas; cam.x = k.width*.5; cam.y = k.height*.5; }
    vapor = createFractalBackdropLayer(7, 0.12, 0.62, 90, "#131824", 4);
    loadLevel1();
    createAnimator(a => { player = createPlayer(a); if (ctx) player.body.pos = { x:64, y:24 }; });
  },

  stop(){},

  update(){
    if (!ctx) return;
    const c = ctx;
    const inp = getInputState();
    player?.update(inp, c);

    const px = player ? player.body.pos.x : bgX + ((+!!inp.right) - (+!!inp.left)) * 2;
    bgX += (px - bgX) * 0.18;

    const map = getCurrentMap();
    const ww = map ? map.width  * TILE : 1e4;
    const wh = map ? map.height * TILE : 1e4;
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
        const by = (h - v.h - 20 + (v as any).groundOffset + 30 + lift) / sc; // groundOffset added by generator
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
    c.restore();

    drawTerrainFront(c, w, h, time, bgX);
  }
};
