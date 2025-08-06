// src/main.ts

import { setupCanvasPair } from "./engine/renderer/initCanvas";
import { createAnimator } from "./atlas/animationAtlas";
import { setupInput } from "./engine/input/input";
import { GameScene } from "./engine/scenes/GameScene";
import { MenuScene } from "./engine/scenes/MenuScene";
import { setScene, loop } from "./engine/scenes/SceneManager";
import { zzfx, zzfxM, playZzfxMSong } from "./engine/audio/SoundEngine";
import { retro1Song } from "./music/retro1";
import { start1 } from "./sfx/start";

const WORLD = { w: 480, h: 270 };
const { ctx, glCanvas, mask, maskCtx } = setupCanvasPair(WORLD.w, WORLD.h, WORLD.w, WORLD.h);
setupInput();

MenuScene.setCanvas(ctx, glCanvas, maskCtx, mask);
GameScene.setCanvas(ctx, glCanvas, maskCtx, mask);

// 🎵 Unpack zzfxm song
const [iRaw, pRaw, sRaw, bRaw = 125] = retro1Song;
const i = iRaw as unknown as number[][];
const p = pRaw as unknown as number[][][];
const s = sRaw as unknown as number[];
const b = bRaw as number;
const [l, r] = zzfxM(i, p, s, b);

let src: AudioBufferSourceNode | undefined;

createAnimator(anim => {
  GameScene.injectAnimator(anim);

  addEventListener("pointerdown", () => {
    zzfx(); // Unlock audio context
    setScene(GameScene);
    src = playZzfxMSong(l, r);
  }, { once: true });

  addEventListener("click", () => {
    zzfx(...start1);
  }, { once: true });

  setScene(MenuScene);
  requestAnimationFrame(loop);
});
