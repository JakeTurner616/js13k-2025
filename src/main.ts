// src/main.ts

import { createAnimator } from "./atlas/animationAtlas";
import { loadLevel1, getCurrentMap } from "./engine/level-loader.ts";
import { drawTile, isTileAtlasReady } from "./tileset/tilemap.ts";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d")!;
const WORLD_WIDTH = 480;
const WORLD_HEIGHT = 270;
const TILE_SIZE = 32;

canvas.width = WORLD_WIDTH;
canvas.height = WORLD_HEIGHT;

canvas.style.imageRendering = "pixelated";
canvas.style.display = "block";
canvas.style.margin = "auto";
canvas.style.background = "#000";

function resizeCanvas() {
  const scaleX = Math.floor(window.innerWidth / WORLD_WIDTH);
  const scaleY = Math.floor(window.innerHeight / WORLD_HEIGHT);
  const scale = Math.max(1, Math.min(scaleX, scaleY));

  canvas.style.width = WORLD_WIDTH * scale + "px";
  canvas.style.height = WORLD_HEIGHT * scale + "px";
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Basic camera stub (add follow logic later)
const camera = { x: 0, y: 0 };

let animator: any;
let lastTime = 0;
let animationReady = false;

createAnimator((loadedAnimator) => {
  animator = loadedAnimator;
  animationReady = true;
  loadLevel1();
  lastTime = performance.now();
  requestAnimationFrame(loop);
});

function loop(time: number) {
  if (!animationReady || !isTileAtlasReady()) {
    requestAnimationFrame(loop);
    return;
  }

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const map = getCurrentMap();
  if (map) {
    const totalMapHeight = map.height * TILE_SIZE;

    for (let row = 0; row < map.height; row++) {
      for (let col = 0; col < map.width; col++) {
        const index = row * map.width + col;
        const tile = map.tiles[index];
        if (tile === 0) continue;

        const tileKey = `Tile_${String(tile).padStart(2, "0")}`;

        // Align bottom row of tiles to bottom of canvas
        const drawX = col * TILE_SIZE - camera.x;
        const drawY = WORLD_HEIGHT - totalMapHeight + row * TILE_SIZE - camera.y;

        drawTile(ctx, tileKey, drawX, drawY);
      }
    }
  }

  animator.drawAll(ctx, time);
  requestAnimationFrame(loop);
}
