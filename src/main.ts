// src/main.ts

import { setupCanvasPair } from "./engine/renderer/initCanvas";
import { createAnimator } from "./atlas/animationAtlas";
import { loadLevel1, getCurrentMap } from "./engine/renderer/level-loader";
import { setupInput, getInputState } from "./engine/input/input";
import { drawMapAndColliders } from "./engine/renderer/render";
import { createShaderLayer } from "./engine/shaders/ShaderLayer";
import { Player } from "./player/Player";
import { demoFrag } from "./shaders/demoPulse.glsl";
import { zzfx } from "./engine/audio/SoundEngine";
import { drawText } from "./engine/font/fontEngine"; // 👈 include font engine

// === CONFIG ===
const WORLD = { w: 480, h: 270 };
const TILE_SIZE = 32;

// Unlock audio on gesture
addEventListener("pointerdown", () => zzfx(), { once: true });

// Play demo sound
addEventListener("click", () => {
  console.log("Playing sound");
  zzfx(...[1.6, 0, 254, 0, .16, .12, 0, 1.1, 0, 0, 406, .09, .04, .4, 0, 0, .04, .54, .26, .29]); // Powerup
}, { once: true });

// === INIT ===
const { ctx, glCanvas, mask, maskCtx } = setupCanvasPair(WORLD.w, WORLD.h);
setupInput();

let drawMasked: (t: number, m: HTMLCanvasElement, r: [number, number, number, number]) => void;
let player: Player;
let animator: any;

createAnimator((a) => {
  animator = a;
  player = new Player(animator);
  loadLevel1();
  drawMasked = createShaderLayer(glCanvas.getContext("webgl")!, glCanvas, demoFrag);
  requestAnimationFrame(loop);
});

// === GAME LOOP ===
let lastJump = false;

function loop(t: number) {
  const map = getCurrentMap();
  if (!map) return requestAnimationFrame(loop);

  const input = getInputState();
  const nowJump = input.jump;

  if (nowJump && !lastJump) {
    // Reserved for future: play jump sound here
  }
  lastJump = nowJump;

  ctx.clearRect(0, 0, WORLD.w, WORLD.h);
  drawMapAndColliders(ctx, map, TILE_SIZE);

  // === Draw player mask sprite ===
  maskCtx.clearRect(0, 0, 48, 48);
  const anim = player.anim.getCurrent();
  const meta = animator.getMeta(anim);
  const frame = Math.floor((t / 1000) * (meta?.fps ?? 6)) % (meta?.frameCount ?? 1);
  animator.drawFrame(maskCtx, anim, frame, 0, 0);

  // === Update and draw player ===
  player.update(input, ctx);
  player.draw(ctx, t);

  // === Apply shader ===
  drawMasked(t / 1000, mask, [player.pos.x | 0, player.pos.y | 0, 48, 48]);

  // === Draw static text ===
  drawText(ctx, "HELLO WORLD", 16, 16, 3, "#0ff"); // 💬 Demo text

  requestAnimationFrame(loop);
}
