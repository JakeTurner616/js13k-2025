// src/main.ts
// Wire per-level music:
//  • Keep retro1 for level 0, use the new level2Song for level 1.
//  • Publish the BufferSource globally so scenes can stop it.
//  • React to "scene:start-music" to (re)start the right track after a level switch.

import { setupCanvas } from "./engine/renderer/initCanvas";
import { createAnimator } from "./atlas/animationAtlas";
import { setupInput } from "./engine/input/input";
import { MenuScene } from "./engine/scenes/MenuScene";
import { BackgroundScene } from "./engine/scenes/BackgroundScene";
import { setScene, loop } from "./engine/scenes/SceneManager";
//import { attachFPS } from "./engine/debug/FPS";
import { zzfx, zzfxM, playZzfxMSong } from "./engine/audio/SoundEngine";
import { retro1Song } from "./music/retro1";
import { level2Song } from "./music/level2";
import { start1 } from "./sfx/start";

const WORLD = { w: 480, h: 270 };
const { ctx } = setupCanvas(WORLD.w, WORLD.h);
setupInput();

// scenes
MenuScene.setCanvas(ctx);
BackgroundScene.setCanvas(ctx);

// 🎵 Pre-render both songs (tiny + fast reuse)
const [i1, p1, s1, b1 = 125] = retro1Song as unknown as [number[][],number[][][],number[],number];
const [L1, R1] = zzfxM(i1, p1, s1, b1);

const [i2, p2, s2, b2 = 240] = level2Song as unknown as [number[][],number[][][],number[],number];
const [L2, R2] = zzfxM(i2, p2, s2, b2);

// Keep a handle & expose globally so scenes can stop it.
let src: AudioBufferSourceNode | undefined;
addEventListener("scene:stop-music", () => {
  try{ src?.stop(0); }catch{}
  src = undefined;
  (globalThis as any).__sceneMusic = undefined;
});

// Start music for a given level index (0→retro1, 1→level2; default retro1)
addEventListener("scene:start-music", (e:any) => {
  try{ src?.stop(0); }catch{}
  const lvl = e?.detail?.level|0;
  const use2 = lvl===1; // tweak if you add more levels
  const L = use2?L2:L1, R = use2?R2:R1;
  src = playZzfxMSong(L, R);
  (globalThis as any).__sceneMusic = src;
});

createAnimator((animator) => {
  MenuScene.setAnimator(animator);

  addEventListener("pointerdown", () => {
    zzfx();                 // unlock audio
    setScene(BackgroundScene);
    // Start level 0 music right away (same as dispatching scene:start-music for level 0)
    src = playZzfxMSong(L1, R1);
    (globalThis as any).__sceneMusic = src;
  }, { once: true });

  addEventListener("click", () => { zzfx(...start1); }, { once: true });

  setScene(MenuScene);
  requestAnimationFrame(loop);
});
