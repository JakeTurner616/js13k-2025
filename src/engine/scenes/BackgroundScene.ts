// src/engine/scenes/BackgroundScene.ts
import { drawStars } from "./effects/Stars";
import { drawClouds } from "./effects/Clouds";
import { drawNeonHaze } from "./effects/NeonHaze";
import { drawMoon } from "./effects/Moon";

import { drawBuilding } from "./objects/drawBuilding";
import { getInputState } from "../input/input";
import { generateBuildingVariants } from "./init/initBuildingVariants";
import { drawTerrainBehind, drawTerrainFront } from "./effects/terrain/Terrain";
import type { BuildingVariant } from "./objects/types";

type Layer = {
  minHeight: number;
  maxHeight: number;
  scale: number;
  scrollSpeed: number;
  buildings: Map<number, BuildingVariant & { groundOffset: number; blinkOffset?: number }>;
};

const layers: Layer[] = [
  { minHeight: 80, maxHeight: 250, scale: 0.6,  scrollSpeed: 0.3, buildings: new Map() },
  { minHeight: 60, maxHeight: 180, scale: 0.75, scrollSpeed: 0.6, buildings: new Map() },
  { minHeight: 50, maxHeight: 96,  scale: 1.0,  scrollSpeed: 1.0, buildings: new Map() }
];

const apparentBias = [0.95, 1.0, 1.08];
const layerBaseLiftApp = [30, 44, 30];

let ctx: CanvasRenderingContext2D | null = null;
let cameraX = 0, starScroll = 0, cloudScroll = 0;

export const BackgroundScene = {
  setCanvas(c: CanvasRenderingContext2D) { ctx = c; },
  start() {
    cameraX = starScroll = cloudScroll = 0;
    for (const l of layers) l.buildings.clear();
  },
  stop() {},
  update() {
    const inpt = getInputState();
    cameraX += (+!!inpt.right - +!!inpt.left) * 1.5;
    starScroll += 0.15; cloudScroll += 0.25;
  },
  draw(t: number) {
    if (!ctx) return;
    const w = ctx.canvas.width, h = ctx.canvas.height, time = t / 1e3;

    // BG gradient
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#090016");
    g.addColorStop(0.4, "#250040");
    g.addColorStop(0.8, "#1a1d2f");
    g.addColorStop(1, "#0b0c12");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Far space
    drawStars(ctx, w, h, time, starScroll);

    // Moon (behind clouds/haze)
    drawMoon(ctx, w, h, time, cameraX);

    // Mid sky overlays
    drawClouds(ctx, w, h, time, cameraX + cloudScroll);
    drawNeonHaze(ctx, w, h, time, cameraX);



    const drawRow = (li: number) => {
      const L = layers[li], { minHeight, maxHeight, scale, scrollSpeed, buildings } = L;
      const sp = 120, lx = cameraX * scrollSpeed;
      ctx!.save(); ctx!.scale(scale, scale);
      const ss = w / scale, sx = Math.floor((lx - ss) / sp), ex = Math.ceil((lx + ss * 2) / sp);
      for (let i = sx; i < ex; i++) {
        if (!buildings.has(i)) {
          const hm = (1 / scale) * (apparentBias[li] ?? 1);
          buildings.set(i, generateBuildingVariants(1, minHeight, maxHeight, hm)[0]);
        }
        const v = buildings.get(i)!;
        const lift = layerBaseLiftApp[li] ?? 0;
        const by = (h - v.h - 20 + v.groundOffset + 30 + lift) / scale;
        drawBuilding(ctx!, i * sp - lx, by, v, time);
      }
      ctx!.restore();
    };

    // Far row
    drawRow(0);

    // Terrain between rows
    drawTerrainBehind(ctx, w, h, time, cameraX);

    // Mid & near rows
    drawRow(1); drawRow(2);

    // Optional front overlay
    drawTerrainFront(ctx, w, h, time, cameraX);
  }
};
