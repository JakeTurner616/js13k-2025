// src/main.ts

import { createAnimator } from "./atlas/animationAtlas";
import { loadLevel1 } from "./engine/level-loader.ts";
import { getCurrentMap } from "./engine/MapContext.ts";
import { drawTile, isTileAtlasReady } from "./tileset/tilemap.ts";
import { setupInput, getInputState } from "./engine/input.ts";
import { Player } from "./player/Player.ts";
import { drawTileColliders } from "./player/Physics.ts";
import { ShaderLayer } from "./engine/ShaderLayer";

// === Shader: pulse color for visible pixels only ===
const demoFrag = `
precision mediump float;
uniform float t;
uniform vec2 r;
uniform vec2 u_offset;
uniform sampler2D sprite;

void main() {
  vec2 local = (gl_FragCoord.xy - u_offset) / vec2(48.0, 48.0);
  local.y = 1.0 - local.y; // Flip vertically to match Canvas2D

  vec4 tex = texture2D(sprite, local);
  if (tex.a < 0.01) discard;

  float pulse = 0.5 + 0.5 * sin(t * 4.0 + local.y * 20.0);
  gl_FragColor = vec4(tex.rgb * pulse, tex.a);
}
`;

// === Constants ===
const WORLD_WIDTH = 480;
const WORLD_HEIGHT = 270;
const TILE_SIZE = 32;

// === Base canvas ===
const canvas = document.createElement("canvas");
canvas.width = WORLD_WIDTH;
canvas.height = WORLD_HEIGHT;
canvas.style.position = "absolute";
canvas.style.zIndex = "0";
canvas.style.imageRendering = "pixelated";
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d")!;

// === Shader canvas (WebGL overlay) ===
const glCanvas = document.createElement("canvas");
glCanvas.width = WORLD_WIDTH;
glCanvas.height = WORLD_HEIGHT;
glCanvas.style.position = "absolute";
glCanvas.style.zIndex = "1";
glCanvas.style.pointerEvents = "none";
document.body.appendChild(glCanvas);

// === Mask buffer (offscreen 48x48) ===
const maskCanvas = document.createElement("canvas");
maskCanvas.width = 48;
maskCanvas.height = 48;
const maskCtx = maskCanvas.getContext("2d")!;

// === Resize both canvases ===
function resizeCanvas() {
  const scale = Math.floor(Math.min(
    window.innerWidth / WORLD_WIDTH,
    window.innerHeight / WORLD_HEIGHT
  ));
  const w = WORLD_WIDTH * scale + "px";
  const h = WORLD_HEIGHT * scale + "px";
  canvas.style.width = w;
  canvas.style.height = h;
  glCanvas.style.width = w;
  glCanvas.style.height = h;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// === Game state ===
setupInput();
const camera = { x: 0, y: 0 };
let player: Player;
let animator: any;
let animationReady = false;
let shader: ShaderLayer;

// === Init ===
createAnimator((loadedAnimator) => {
  animator = loadedAnimator;
  animationReady = true;
  player = new Player(animator);
  loadLevel1();
  shader = new ShaderLayer(glCanvas, demoFrag);
  requestAnimationFrame(loop);
});

// === Game loop ===
function loop(time: number) {
  if (!animationReady || !isTileAtlasReady()) {
    requestAnimationFrame(loop);
    return;
  }

  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Draw map
  const map = getCurrentMap();
  if (map) {
    const totalMapHeight = map.height * TILE_SIZE;
    for (let row = 0; row < map.height; row++) {
      for (let col = 0; col < map.width; col++) {
        const i = row * map.width + col;
        const tile = map.tiles[i];
        if (tile === 0) continue;
        const drawX = col * TILE_SIZE - camera.x;
        const drawY = WORLD_HEIGHT - totalMapHeight + row * TILE_SIZE - camera.y;
        const tileKey = `Tile_${String(tile).padStart(2, "0")}`;
        drawTile(ctx, tileKey as any, drawX, drawY);
      }
    }
    drawTileColliders(ctx);
  }

  // Update and draw player to mask buffer (for shader)
  maskCtx.clearRect(0, 0, 48, 48);
  const animName = player.anim.getCurrent();
  const meta = animator.getMeta(animName);
  const fps = meta?.fps ?? 6;
  const frameCount = meta?.frameCount ?? 1;
  const frameIndex = Math.floor((time / 1000) * fps) % frameCount;
  animator.drawFrame(maskCtx, animName, frameIndex, 0, 0);

  // Draw normal player
  player.update(getInputState(), ctx);
  player.draw(ctx, time);

  // Apply shader ONLY over player area
  const px = Math.floor(player.pos.x);
  const py = Math.floor(player.pos.y);
  shader.drawMasked(time / 1000, maskCanvas, [px, py, 48, 48]);

  requestAnimationFrame(loop);
}
