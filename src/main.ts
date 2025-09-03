// src/main.ts (updated)
import { setupCanvas } from "./engine/renderer/initCanvas";
import { createAnimator } from "./atlas/animationAtlas";
import { setupInput } from "./engine/input/input";
import { MenuScene } from "./engine/scenes/MenuScene";
import { BackgroundScene } from "./engine/scenes/BackgroundScene";
import { GameOverScene } from "./engine/scenes/MenuScene";
import { setScene, loop } from "./engine/scenes/SceneManager";
import { zzfx, zzfxM, playZzfxMSong } from "./engine/audio/SoundEngine";
import { retro2song } from "./music/retro2";

const { ctx } = setupCanvas(580,272);
setupInput();
[MenuScene, BackgroundScene, GameOverScene].forEach(s => s.setCanvas(ctx));

const mk = (s: any) => { const [i, p, seq, bpm = 125] = s; return zzfxM(i, p, seq, bpm); };
const [L, R] = mk(retro2song);

let src: any; const g: any = globalThis;
const set = (s?: any) => ((src = s), (g.__sceneMusic = s));
const stop = () => { try { src?.stop(0) } catch {} set(); };
const playLvl = (_v: number) => { set(playZzfxMSong(L, R)); };

addEventListener("scene:stop-music", stop);
addEventListener("scene:start-music", (e:any)=>{ stop(); playLvl(e?.detail?.level|0); });

/*
// --- DEV-only ScreenshotScene wiring (hash #shot or F9) ---
const SHOT = location.hash.includes("shot");
let ShotScene: any = null;
const loadShot = async () => {
  if (ShotScene) return ShotScene;
  const m = await import("./engine/scenes/ScreenshotScene");
  ShotScene = m.ScreenshotScene;
  ShotScene.setCanvas(ctx);
  return ShotScene;
};
const switchToShot = async () => {
  const S = await loadShot();
  stop(); // silence current track for clean screenshots
  setScene(S);
};
// expose toggle for console
(g as any).shot = switchToShot;
// hotkey: F9 to enter screenshot scene
addEventListener("keydown", e => { if (e.key === "F9") switchToShot(); });
// -----------------------------------------------------------
*/

createAnimator(a=>{
  MenuScene.setAnimator(a);
  GameOverScene.setAnimator(a);

  // Start game from menu
  MenuScene.onClick = () => { zzfx(); setScene(BackgroundScene); playLvl(0); };

  // DEV-only ScreenshotScene boot logic removed from prod:
  // if (SHOT) {
  //   switchToShot().then(() => requestAnimationFrame(loop));
  // } else {
  //   setScene(MenuScene);
  //   requestAnimationFrame(loop);
  // }

  // Production-safe boot:
  setScene(MenuScene);
  requestAnimationFrame(loop);
});


// debug helpers
//try {
//  (globalThis as any).gover = () => setScene(GameOverScene);
//  (globalThis as any).menu  = () => setScene(MenuScene);
//} catch {}
