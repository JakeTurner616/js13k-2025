import { setupCanvas } from "./engine/renderer/initCanvas";
import { createAnimator } from "./atlas/animationAtlas";
import { setupInput } from "./engine/input/input";
import { MenuScene } from "./engine/scenes/MenuScene";
import { BackgroundScene } from "./engine/scenes/BackgroundScene";
import { setScene, loop } from "./engine/scenes/SceneManager";
import { zzfx, zzfxM, playZzfxMSong } from "./engine/audio/SoundEngine";
import { retro1Song } from "./music/retro1";
import { level2Song } from "./music/level2";

const { ctx } = setupCanvas(480,270);
setupInput();
[MenuScene,BackgroundScene].forEach(s=>s.setCanvas(ctx));

const mk=(s:any)=>{const [i,p,seq,bpm=125]=s; return zzfxM(i,p,seq,bpm);};
const [L1,R1]=mk(retro1Song), [L2,R2]=mk(level2Song);

let src:any; const g:any=globalThis;
const set=(s?:any)=>((src=s),(g.__sceneMusic=s));
const stop=()=>{try{src?.stop(0)}catch{} set()};
const playLvl=(v:number)=>set(playZzfxMSong(v===1?L2:L1, v===1?R2:R1));

addEventListener("scene:stop-music",stop);
addEventListener("scene:start-music",(e:any)=>{ stop(); playLvl(e?.detail?.level|0); });

createAnimator(a=>{
  MenuScene.setAnimator(a);
  addEventListener("pointerdown",()=>{ zzfx(); setScene(BackgroundScene); playLvl(0); },{once:true});
  setScene(MenuScene);
  requestAnimationFrame(loop);
});
