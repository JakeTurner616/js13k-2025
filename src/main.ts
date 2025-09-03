import { setupCanvas } from "./engine/renderer/initCanvas";
import { createAnimator } from "./atlas/animationAtlas";
import { setupInput } from "./engine/input/input";
import { MenuScene } from "./engine/scenes/MenuScene";
import { BackgroundScene } from "./engine/scenes/BackgroundScene";
import { setScene, loop } from "./engine/scenes/SceneManager";
import { zzfx, zzfxM, playZzfxMSong } from "./engine/audio/SoundEngine";
import { retro2song } from "./music/retro2";

const { ctx } = setupCanvas(580,272);
setupInput();
[MenuScene,BackgroundScene].forEach(s=>s.setCanvas(ctx));

const mk = (s: any) => { const [i, p, seq, bpm = 125] = s; return zzfxM(i, p, seq, bpm); };
const [L, R] = mk(retro2song);

let src: any; const g: any = globalThis;
const set = (s?: any) => ((src = s), (g.__sceneMusic = s));
const stop = () => { try { src?.stop(0) } catch {} set(); };
const playLvl = (_v: number) => {
  set(playZzfxMSong(L, R));
};

addEventListener("scene:stop-music",stop);
addEventListener("scene:start-music",(e:any)=>{ stop(); playLvl(e?.detail?.level|0); });

createAnimator(a=>{
  MenuScene.setAnimator(a);
  addEventListener("pointerdown",()=>{ zzfx(); setScene(BackgroundScene); playLvl(0); },{once:true});
  setScene(MenuScene);
  requestAnimationFrame(loop);
});
