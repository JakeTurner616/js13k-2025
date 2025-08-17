// src/main.ts

import { setupCanvas } from "./engine/renderer/initCanvas";
import { createAnimator } from "./atlas/animationAtlas";
import { setupInput } from "./engine/input/input";
// ❌ no GameScene (stays removed)
import { MenuScene } from "./engine/scenes/MenuScene";
import { BackgroundScene } from "./engine/scenes/BackgroundScene";
import { setScene, loop } from "./engine/scenes/SceneManager";
import { zzfx, zzfxM, playZzfxMSong } from "./engine/audio/SoundEngine";
import { retro1Song } from "./music/retro1";
import { start1 } from "./sfx/start";

// Logical render size (your initCanvas can scale to fit the screen)
const WORLD = { w: 480, h: 270 };
const { ctx } = setupCanvas(WORLD.w, WORLD.h);
setupInput();

// Scenes just need the 2D context now
MenuScene.setCanvas(ctx);
BackgroundScene.setCanvas(ctx);

// 🎵 Unpack zzfxm song — cast through `unknown` to strip readonly-ness
const [iRaw, pRaw, sRaw, bRaw = 125] = retro1Song;
const i = iRaw as unknown as number[][];
const p = pRaw as unknown as number[][][];
const s = sRaw as unknown as number[];
const b = bRaw as number;
const [l, r] = zzfxM(i, p, s, b);

let src: AudioBufferSourceNode | undefined;

createAnimator((animator) => {
  // 👉 give MenuScene the animator so it can render the dash strip
  MenuScene.setAnimator(animator);

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
