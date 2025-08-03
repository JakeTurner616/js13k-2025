// src/main.ts

import { setupCanvasPair } from "./engine/renderer/initCanvas";
import { createAnimator } from "./atlas/animationAtlas";
import { setupInput } from "./engine/input/input";
import { GameScene } from "./engine/scenes/GameScene";
import { MenuScene } from "./engine/scenes/MenuScene";
import { setScene, loop } from "./engine/scenes/SceneManager";
import { zzfx } from "./engine/audio/SoundEngine";

const WORLD = { w: 480, h: 270 };

// 🔊 Audio unlock
addEventListener("pointerdown", () => zzfx(), { once: true });
addEventListener("click", () => {
  zzfx(...[1.6, 0, 254, 0, .16, .12, 0, 1.1, 0, 0, 406, .09, .04, .4, 0, 0, .04, .54, .26, .29]);
}, { once: true });

// 🖼️ Full-size mask for menu scene
const { ctx, glCanvas, mask, maskCtx } = setupCanvasPair(WORLD.w, WORLD.h, WORLD.w, WORLD.h);
setupInput();

MenuScene.setCanvas(ctx, glCanvas, maskCtx, mask);
GameScene.setCanvas(ctx, glCanvas, maskCtx, mask);

createAnimator(anim => {
  GameScene.injectAnimator(anim);

  MenuScene.onClick = () => {
    setScene(GameScene);
  };

  setScene(MenuScene);
  requestAnimationFrame(loop);
});
