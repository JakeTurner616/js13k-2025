// src/engine/scenes/BackgroundScene.ts
import { drawStars } from "./effects/Stars";
import { drawClouds } from "./effects/Clouds";
import { drawNeonHaze } from "./effects/NeonHaze";
import { drawMoon } from "./effects/Moon";

import { drawBuilding } from "./objects/drawBuilding";
import { getInputState } from "../input/input";
import { generateBuildingVariants } from "./init/initBuildingVariants";
import { drawTerrainBehind, drawTerrainFront } from "./effects/terrain/Terrain";
import { createFractalBackdropLayer } from "./effects/terrain/Terrain";
import type { BuildingVariant } from "./objects/types";
import type { Drawer } from "./effects/terrain/Terrain";

import { drawMapAndColliders } from "../renderer/render";
import { loadLevel1, getCurrentMap } from "../renderer/level-loader";
import { createAnimator } from "../../atlas/animationAtlas";
import type { AtlasAnimator } from "../../animation/AtlasAnimator";
import { Player } from "../../player/Player";

import { updateSmoothCamera, type Cam } from "../camera/Camera";

type LayerCfg = {
  minHeight:number; maxHeight:number; scale:number; scrollSpeed:number;
  spacing:number; lift:number; bias:number;
  buildings: Map<number, BuildingVariant & { groundOffset:number; blinkOffset?:number }>;
};

const FAR: LayerCfg = {
  minHeight:80, maxHeight:250, scale:0.60, scrollSpeed:0.08,
  spacing:120, lift:30, bias:0.95, buildings:new Map()
};

const MID: LayerCfg = {
  minHeight:70, maxHeight:200, scale:0.82, scrollSpeed:0.15,
  spacing:136, lift:42, bias:1.05, buildings:new Map()
};

let ctx: CanvasRenderingContext2D | null = null;
let starScroll=0, cloudScroll=0;

let vaporMountains: Drawer | null = null;

let animator: AtlasAnimator | null = null;
let player: Player | null = null;

let bgX = 0;                 
let cam: Cam = { x:0, y:0 }; 

export const BackgroundScene = {
  setCanvas(c: CanvasRenderingContext2D) { ctx = c; },

  start() {
    starScroll = cloudScroll = 0;
    FAR.buildings.clear();
    MID.buildings.clear();

    if (ctx) { cam.x = ctx.canvas.width * .5; cam.y = ctx.canvas.height * .5; }

    vaporMountains = createFractalBackdropLayer(7, 0.12, 0.62, 90, "#131824", 4);
    loadLevel1();

    createAnimator(a => {
      animator = a;
      player = new Player(a);
      if (ctx && player) player.pos = { x: 64, y: 24 };
    });
  },

  stop() {},

  update() {
    if (!ctx) return;
    const input = getInputState();

    if (player) {
      player.update(input, ctx);
    }

    const px = player ? player.pos.x : bgX + (+!!input.right - +!!input.left) * 2;
    bgX += (px - bgX) * 0.18;

    const map = getCurrentMap(), tile=16;
    const worldW = map ? map.width * tile : 10000;
    const worldH = map ? map.height * tile : 10000;
    const py = player ? player.pos.y : cam.y;

    updateSmoothCamera(
      cam,
      px, py,
      ctx.canvas.width, ctx.canvas.height,
      worldW, worldH,
      0.14,
      1/60,
      true
    );

    starScroll += 0.15;
    cloudScroll += 0.25;
  },

  draw(t: number) {
    if (!ctx) return;
    const w = ctx.canvas.width, h = ctx.canvas.height, time = t / 1e3;

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#090016");
    g.addColorStop(0.4, "#250040");
    g.addColorStop(0.8, "#1a1d2f");
    g.addColorStop(1, "#0b0c12");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    drawStars(ctx, w, h, time, starScroll);
    drawMoon(ctx, w, h, time, bgX);
    if (vaporMountains) vaporMountains(ctx, w, h, time, bgX);
    drawClouds(ctx, w, h, time, bgX + cloudScroll);
    drawNeonHaze(ctx, w, h, time, bgX);

    const drawRow = (cfg: LayerCfg) => {
      if (!ctx) return;
      const { minHeight, maxHeight, scale, scrollSpeed, spacing, lift, bias, buildings } = cfg;
      const lx = bgX * scrollSpeed;

      ctx.save();
      ctx.scale(scale, scale);

      const sw = w / scale;
      const si = Math.floor((lx - sw) / spacing);
      const ei = Math.ceil ((lx + sw * 2) / spacing);

      for (let i = si; i < ei; i++) {
        if (!buildings.has(i)) {
          const hm = (1 / scale) * bias;
          buildings.set(i, generateBuildingVariants(1, minHeight, maxHeight, hm)[0]);
        }
        const v = buildings.get(i)!;
        const by = (h - v.h - 20 + v.groundOffset + 30 + lift) / scale;
        drawBuilding(ctx, i * spacing - lx, by, v, time);
      }

      ctx.restore();
    };

    drawRow(FAR);
    drawTerrainBehind(ctx, w, h, time, bgX);
    drawRow(MID);

    ctx.save();
    ctx.translate(Math.round(w * .5 - cam.x), Math.round(h * .5 - cam.y));

    const map = getCurrentMap();
    if (map) drawMapAndColliders(ctx, map, 16);

    if (player && animator) {
      const animName = player.anim.getCurrent();
      const meta = animator.getMeta(animName);
      if (meta) {
        const frame = Math.floor((t / 1000) * meta.fps) % meta.frameCount;
        player.draw(ctx, t, frame);
      }
    }

    ctx.restore();
    drawTerrainFront(ctx, w, h, time, bgX);
  }
};
