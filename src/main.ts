// src/main.ts

import { createAnimator } from "./atlas/animationAtlas";
import { loadLevel1, getCurrentMap } from "./engine/level-loader.ts";
import { drawTile, isTileAtlasReady } from "./tileset/tilemap.ts";
import { setupInput, getInputState } from "./engine/input.ts";
import { Player } from "./player/Player.ts";
import { drawTileColliders } from "./player/Physics.ts";

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

// Debug outline
canvas.style.border = "1px solid #0f0";

function resizeCanvas() {
  const scaleX = Math.floor(window.innerWidth / WORLD_WIDTH);
  const scaleY = Math.floor(window.innerHeight / WORLD_HEIGHT);
  const scale = Math.max(1, Math.min(scaleX, scaleY));
  canvas.style.width = WORLD_WIDTH * scale + "px";
  canvas.style.height = WORLD_HEIGHT * scale + "px";
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

setupInput();
const camera = { x: 0, y: 0 };

let player: Player;
let animator: any;
let animationReady = false;

createAnimator((loadedAnimator) => {
  animator = loadedAnimator;
  animationReady = true;
  console.log("[Animator] Loaded");

  player = new Player(animator);

  loadLevel1();
  console.log("[Map] Loading initiated");

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
  if (!map) {
    console.warn("[Map] Not yet loaded");
  } else {
    const totalMapHeight = map.height * TILE_SIZE;

    for (let row = 0; row < map.height; row++) {
      for (let col = 0; col < map.width; col++) {
        const index = row * map.width + col;
        const tile = map.tiles[index];
        if (tile === 0) continue;

        const tileKey = `Tile_${String(tile).padStart(2, "0")}`;
        const drawX = col * TILE_SIZE - camera.x;
        const drawY = WORLD_HEIGHT - totalMapHeight + row * TILE_SIZE - camera.y;
        drawTile(ctx, tileKey as any, drawX, drawY);
      }
    }

    drawTileColliders(ctx);
  }

  player.update(getInputState(), ctx);
  player.draw(ctx, time);

  animator.drawAll(ctx, time);
  requestAnimationFrame(loop);
}
