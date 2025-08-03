// src/main.ts

import { setupCanvasPair } from "./engine/renderer/initCanvas";
import { createAnimator } from "./atlas/animationAtlas";
import { setupInput } from "./engine/input/input";
import { GameScene } from "./engine/scenes/GameScene";
import { setScene, loop } from "./engine/scenes/SceneManager";
import { zzfx } from "./engine/audio/SoundEngine";

const WORLD = { w: 480, h: 270 };

addEventListener("pointerdown", () => zzfx(), { once: true });
addEventListener("click", () => {
  zzfx(...[1.6, 0, 254, 0, .16, .12, 0, 1.1, 0, 0, 406, .09, .04, .4, 0, 0, .04, .54, .26, .29]);
}, { once: true });

// Setup canvas, input, etc.
const { ctx, glCanvas, mask, maskCtx } = setupCanvasPair(WORLD.w, WORLD.h);
setupInput();

// ✅ Inject canvas references (including WebGL canvas)
GameScene.setCanvas(ctx, glCanvas, maskCtx, mask);

createAnimator(anim => {
  GameScene.injectAnimator(anim);
  setScene(GameScene);
  requestAnimationFrame(loop);
});
