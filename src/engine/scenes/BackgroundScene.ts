// src/engine/scenes/BackgroundScene.ts
import { drawStars } from "./effects/Stars";
import { drawClouds } from "./effects/Clouds";
import { drawNeonHaze } from "./effects/NeonHaze";
import { drawMoon } from "./effects/Moon";

import { drawBuilding } from "./objects/drawBuilding";
import { getInputState } from "../input/input";
import { generateBuildingVariants } from "./init/initBuildingVariants";
import {
  drawTerrainBehind,
  drawTerrainFront,
  createFractalBackdropLayer,
  type Drawer
} from "./effects/terrain/Terrain";

import { drawMapAndColliders } from "../renderer/render";
import { loadLevel1, getCurrentMap } from "../renderer/level-loader";
import { createAnimator } from "../../atlas/animationAtlas";
import { createPlayer, type Player } from "../../player/Player";
import { updateSmoothCamera, type Cam } from "../camera/Camera";
import type { BuildingVariant } from "./objects/types"; // ✅ bring back full variant type

type LayerCfg = {
  minHeight:number; maxHeight:number; scale:number; scrollSpeed:number;
  spacing:number; lift:number; bias:number;
  buildings: Map<number, BuildingVariant & { groundOffset:number; blinkOffset?:number }>; // ✅ widened
};

const FAR: LayerCfg = {
  minHeight:80, maxHeight:250, scale:0.60, scrollSpeed:0.08,
  spacing:120, lift:30, bias:0.95, buildings:new Map()
};
const MID: LayerCfg = {
  minHeight:70, maxHeight:200, scale:0.82, scrollSpeed:0.15,
  spacing:136, lift:42, bias:1.05, buildings:new Map()
};

const TILE = 16;
let ctx: CanvasRenderingContext2D | null = null;
let vaporMountains: Drawer | null = null;
let player: Player | null = null;
let cam: Cam = { x:0, y:0 };
let bgX = 0;

export const BackgroundScene = {
  setCanvas(c: CanvasRenderingContext2D){ ctx = c; },

  start(){
    FAR.buildings.clear(); MID.buildings.clear();
    if (ctx){ cam.x = ctx.canvas.width * .5; cam.y = ctx.canvas.height * .5; }

    vaporMountains = createFractalBackdropLayer(7, 0.12, 0.62, 90, "#131824", 4);
    loadLevel1();

    createAnimator(a => {
      player = createPlayer(a);
      if (ctx) player.body.pos = { x:64, y:24 };
    });
  },

  stop(){},

  update(){
    if (!ctx) return;
    const c = ctx!;
    const input = getInputState();

    player?.update(input, c);

    const px = player ? player.body.pos.x : bgX + ((+!!input.right) - (+!!input.left)) * 2;
    bgX += (px - bgX) * 0.18;

    const map = getCurrentMap();
    const worldW = map ? map.width * TILE : 10000;
    const worldH = map ? map.height * TILE : 10000;
    const py = player ? player.body.pos.y : cam.y;

    updateSmoothCamera(
      cam, px, py,
      c.canvas.width, c.canvas.height,
      worldW, worldH,
      0.14, 1/60, true
    );
  },

  draw(t:number){
    if (!ctx) return;
    const c = ctx!;
    const w = c.canvas.width, h = c.canvas.height, time = t/1000;

    const g = c.createLinearGradient(0,0,0,h);
    [0,.4,.8,1].forEach((s,i)=>g.addColorStop(s, ["#090016","#250040","#1a1d2f","#0b0c12"][i]));
    c.fillStyle = g; c.fillRect(0,0,w,h);

    drawStars(c, w, h, time, time*0.15);
    drawMoon(c, w, h, time, bgX);
    vaporMountains?.(c, w, h, time, bgX);
    drawClouds(c, w, h, time, bgX + time*0.25);
    drawNeonHaze(c, w, h, time, bgX);

    const row = (cfg: LayerCfg)=>{
      const { minHeight, maxHeight, scale, scrollSpeed, spacing, lift, bias, buildings } = cfg;
      const lx = bgX * scrollSpeed;

      c.save();
      c.scale(scale, scale);

      const sw = w / scale;
      const si = Math.floor((lx - sw) / spacing);
      const ei = Math.ceil ((lx + sw*2) / spacing);
      const heightMult = (1/scale) * bias;

      for (let i = si; i < ei; i++){
        if (!buildings.has(i)){
          buildings.set(i, generateBuildingVariants(1, minHeight, maxHeight, heightMult)[0]); // returns BuildingVariant(+extras)
        }
        const v = buildings.get(i)!;
        const by = (h - v.h - 20 + v.groundOffset + 30 + lift) / scale;
        drawBuilding(c, i*spacing - lx, by, v, time); // v now satisfies BuildingVariant
      }
      c.restore();
    };

    row(FAR);
    drawTerrainBehind(c, w, h, time, bgX);
    row(MID);

    c.save();
    c.translate(Math.round(w*.5 - cam.x), Math.round(h*.5 - cam.y));

    const map = getCurrentMap();
    if (map) drawMapAndColliders(c, map, TILE);

    player?.draw(c, t);

    c.restore();

    drawTerrainFront(c, w, h, time, bgX);
  }
};
