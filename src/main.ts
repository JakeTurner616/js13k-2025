// src/main.ts
import { setupCanvas } from "./engine/renderer/initCanvas";
import { createAnimator } from "./atlas/animationAtlas";
import { setupInput } from "./engine/input/input";
import { MenuScene } from "./engine/scenes/MenuScene";
import { BackgroundScene } from "./engine/scenes/BackgroundScene";
import { setScene, loop, setDrawHz } from "./engine/scenes/SceneManager";
import { attachFPS } from "./engine/debug/FPS";
import { zzfx, zzfxM, playZzfxMSong } from "./engine/audio/SoundEngine";
import { retro1Song } from "./music/retro1";
import { start1 } from "./sfx/start";

const WORLD = { w: 480, h: 270 };
const { ctx } = setupCanvas(WORLD.w, WORLD.h);
setupInput();

// Debug overlay + force 60 draw fps (setDrawHz(0) to remove cap)
attachFPS(ctx);
setDrawHz(60);

// scenes
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
  MenuScene.setAnimator(animator);

  addEventListener("pointerdown", () => {
    zzfx();                 // unlock audio
    setScene(BackgroundScene);
    src = playZzfxMSong(l, r);
  }, { once: true });

  addEventListener("click", () => { zzfx(...start1); }, { once: true });

  setScene(MenuScene);
  requestAnimationFrame(loop);
});
