import { createAnimator } from "./atlas/animationAtlas";
import { loadLevel1, getCurrentMap } from "./engine/level-loader.ts";
import { drawTile, isTileAtlasReady } from "./tileset/tilemap.ts";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = 320;
canvas.height = 240;
canvas.style.border = "2px solid lime";

const ctx = canvas.getContext("2d")!;
const tileSize = 32;

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

  ctx.save();
  ctx.scale(0.25, 0.25); // Zoom out to reveal more of the map

  const map = getCurrentMap();
  if (map) {
    let drawn = 0;

    for (let row = 0; row < map.height; row++) {
      for (let col = 0; col < map.width; col++) {
        const index = row * map.width + col;
        const tile = map.tiles[index];
        if (tile === 0) continue;

        if (drawn < 10) {
          console.log(
            `Tile[${index}] = ${tile}, drawing at (${col * tileSize}, ${row * tileSize})`
          );
          drawn++;
        }

        drawTile(ctx, tile - 1, col * tileSize, row * tileSize);
      }
    }

    if (drawn === 0) {
      console.log("⚠ No tiles were drawn (all zeros?)");
    }
  } else {
    console.log("⚠ No map loaded");
  }

  ctx.restore();

  animator.drawAll(ctx, time);
  requestAnimationFrame(loop);
}