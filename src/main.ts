// src/main.ts

import { setupCanvasPair } from "./engine/renderer/initCanvas";
import { createAnimator } from "./atlas/animationAtlas";
import { setupInput } from "./engine/input/input";
import { GameScene } from "./engine/scenes/GameScene";
import { MenuScene } from "./engine/scenes/MenuScene";
import { setScene, loop } from "./engine/scenes/SceneManager";
import { zzfx } from "./engine/audio/SoundEngine";


const WORLD = { w: 480, h: 270 };

// 🖼️ Full-size mask for menu scene
const { ctx, glCanvas, mask, maskCtx } = setupCanvasPair(WORLD.w, WORLD.h, WORLD.w, WORLD.h);
setupInput();

MenuScene.setCanvas(ctx, glCanvas, maskCtx, mask);
GameScene.setCanvas(ctx, glCanvas, maskCtx, mask);

createAnimator(anim => {
  GameScene.injectAnimator(anim);

  // 🎵 Audio unlock and music start
  addEventListener("pointerdown", () => {
    zzfx(); // Unlock using a small sound
setScene(GameScene);
    // Setup scene switch + music start
MenuScene.onClick = () => {
  // @ts-ignore
  
};
  }, { once: true });

  // 🔊 Optional: play a one-shot sound on click for test
  addEventListener("click", () => {
    zzfx(...[1.6, 0, 254, 0, .16, .12, 0, 1.1, 0, 0, 406, .09, .04, .4, 0, 0, .04, .54, .26, .29]);
  }, { once: true });

  setScene(MenuScene);
  requestAnimationFrame(loop);
});
