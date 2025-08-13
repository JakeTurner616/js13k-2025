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

// 🔧 Player + map/colliders
import { drawMapAndColliders } from "../renderer/render";
import { loadLevel1, getCurrentMap } from "../renderer/level-loader";
import { createAnimator } from "../../atlas/animationAtlas";
import type { AtlasAnimator } from "../../animation/AtlasAnimator";
import { Player } from "../../player/Player";

type FarLayer = {
  minHeight: number;
  maxHeight: number;
  scale: number;
  scrollSpeed: number;
  buildings: Map<number, BuildingVariant & { groundOffset: number; blinkOffset?: number }>;
};

// Single, furthest layer (no array of layers)
const FAR: FarLayer = {
  minHeight: 80,
  maxHeight: 250,
  scale: 0.6,
  scrollSpeed: 0.3,
  buildings: new Map()
};

// Tunables that previously varied per-layer
const APPARENT_BIAS = 0.95;
const LAYER_BASE_LIFT = 30;
const BUILDING_SPACING = 120;

let ctx: CanvasRenderingContext2D | null = null;
let cameraX = 0, starScroll = 0, cloudScroll = 0;

let vaporMountains: Drawer | null = null;

// 👇 Player + animator
let animator: AtlasAnimator | null = null;
let player: Player | null = null;

export const BackgroundScene = {
  setCanvas(c: CanvasRenderingContext2D) { ctx = c; },

  start() {
    cameraX = starScroll = cloudScroll = 0;
    FAR.buildings.clear();

    // Fractal backdrop (behind clouds/buildings)
    vaporMountains = createFractalBackdropLayer(7, 0.12, 0.62, 90, "#131824", 4);

    // Load tile map + solids
    loadLevel1();

    // Build animator and create player when atlas is ready
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
      cameraX = player.pos.x; // camera follows player
    } else {
      cameraX += (+!!input.right - +!!input.left) * 1.5;
    }

    starScroll += 0.15;
    cloudScroll += 0.25;
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

    // Moon (furthest)
    drawMoon(ctx, w, h, time, cameraX);

    // Vapor mountains (in front of Moon)
    if (vaporMountains) vaporMountains(ctx, w, h, time, cameraX);

    // Mid sky overlays
    drawClouds(ctx, w, h, time, cameraX + cloudScroll);
    drawNeonHaze(ctx, w, h, time, cameraX);

    // ---- Single (furthest) building row ----
    const drawFarRow = () => {
      const { minHeight, maxHeight, scale, scrollSpeed, buildings } = FAR;
      const sp = BUILDING_SPACING;
      const lx = cameraX * scrollSpeed;

      ctx!.save();
      ctx!.scale(scale, scale);

      const ss = w / scale;
      const sx = Math.floor((lx - ss) / sp);
      const ex = Math.ceil((lx + ss * 2) / sp);

      for (let i = sx; i < ex; i++) {
        if (!buildings.has(i)) {
          const hm = (1 / scale) * APPARENT_BIAS;
          buildings.set(i, generateBuildingVariants(1, minHeight, maxHeight, hm)[0]);
        }
        const v = buildings.get(i)!;
        const lift = LAYER_BASE_LIFT;
        const by = (h - v.h - 20 + v.groundOffset + 30 + lift) / scale;
        drawBuilding(ctx!, i * sp - lx, by, v, time);
      }

      ctx!.restore();
    };

    drawFarRow();

    // Background terrain layer (drawn after far row, like before)
    drawTerrainBehind(ctx, w, h, time, cameraX);

    // --- Gameplay layer: tile map + player ---
    const map = getCurrentMap();
    if (map) drawMapAndColliders(ctx, map, 16); // 16×16 tiles

    if (player && animator) {
      const animName = player.anim.getCurrent();
      const meta = animator.getMeta(animName);
      if (meta) {
        const frame = Math.floor((t / 1000) * meta.fps) % meta.frameCount;
        player.draw(ctx, t, frame);
      }
    }

    // Foreground terrain overlay
    drawTerrainFront(ctx, w, h, time, cameraX);
  }
};
