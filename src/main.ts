// src/main.ts

import { setupCanvasPair } from "./engine/renderer/initCanvas";
import { createAnimator } from "./atlas/animationAtlas";
import { setupInput } from "./engine/input/input";
// ❌ removed GameScene import
import { MenuScene } from "./engine/scenes/MenuScene";
import { BackgroundScene } from "./engine/scenes/BackgroundScene";
import { setScene, loop } from "./engine/scenes/SceneManager";
import { zzfx, zzfxM, playZzfxMSong } from "./engine/audio/SoundEngine";
import { retro1Song } from "./music/retro1";
import { start1 } from "./sfx/start";

const WORLD = { w: 480, h: 270 };
const { ctx, glCanvas, mask, maskCtx } = setupCanvasPair(WORLD.w, WORLD.h, WORLD.w, WORLD.h);
setupInput();

MenuScene.setCanvas(ctx, glCanvas, maskCtx, mask);
// ❌ removed GameScene.setCanvas
BackgroundScene.setCanvas(ctx);

// 🎵 Unpack zzfxm song
const [iRaw, pRaw, sRaw, bRaw = 125] = retro1Song;
const i = iRaw as unknown as number[][];
const p = pRaw as unknown as number[][][];
const s = sRaw as unknown as number[];
const b = bRaw as number;
const [l, r] = zzfxM(i, p, s, b);

let src: AudioBufferSourceNode | undefined;

// We still use createAnimator as a boot hook, but don't inject into GameScene.
createAnimator(() => {
  addEventListener(
    "pointerdown",
    () => {
      zzfx();                 // Unlock audio
      setScene(BackgroundScene);
      src = playZzfxMSong(l, r);
    },
    { once: true }
  );

  addEventListener(
    "click",
    () => { zzfx(...start1); },
    { once: true }
  );

  setScene(MenuScene);
  requestAnimationFrame(loop);
});
