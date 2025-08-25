import { setupCanvas } from "./engine/renderer/initCanvas";
import { createAnimator } from "./atlas/animationAtlas";
import { setupInput } from "./engine/input/input";
import { MenuScene } from "./engine/scenes/MenuScene";
import { BackgroundScene } from "./engine/scenes/BackgroundScene";
import { setScene, loop } from "./engine/scenes/SceneManager";
import { zzfx, zzfxM, playZzfxMSong } from "./engine/audio/SoundEngine";
import { retro1Song } from "./music/retro1";
import { level2Song } from "./music/level2";
import { start1 } from "./sfx/start";

const { ctx } = setupCanvas(480, 270);
setupInput();
MenuScene.setCanvas(ctx);
BackgroundScene.setCanvas(ctx);

const prep=(s:any)=>{const [i,p,seq,bpm=125]=s as any;return zzfxM(i,p,seq,bpm);};
const [L1,R1]=prep(retro1Song), [L2,R2]=prep(level2Song);

let src:AudioBufferSourceNode|undefined;
const setSrc=(s?:AudioBufferSourceNode)=>((src=s),(globalThis as any).__sceneMusic=s);

addEventListener("scene:stop-music",()=>{try{src?.stop(0)}catch{} setSrc()});
addEventListener("scene:start-music",(e:any)=>{
  try{src?.stop(0)}catch{}
  const v=e?.detail?.level|0, use2=v===1, s=playZzfxMSong(use2?L2:L1,use2?R2:R1);
  setSrc(s);
});

createAnimator(a=>{
  MenuScene.setAnimator(a);
  addEventListener("pointerdown",()=>{
    zzfx();
    setScene(BackgroundScene);
    setSrc(playZzfxMSong(L1,R1));
  },{once:true});
  addEventListener("click",()=>{ zzfx(...start1) },{once:true});
  setScene(MenuScene);
  requestAnimationFrame(loop);
});
