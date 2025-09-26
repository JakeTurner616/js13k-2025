// src/engine/scenes/BackgroundScene.ts
import { drawMapAndColliders } from "../renderer/render";
import { loadLevel as L, LEVEL_COUNT as LC, getCurrentMap } from "../renderer/level-loader";
import { createAnimator } from "../../atlas/animationAtlas";
import { createPlayer, type Player } from "../../player/Player";
import { updateSmoothCamera, type Cam } from "../camera/Camera";
import { getInputState } from "../input/input";
import { Environment } from "./background/Environment";
import { PortalSystem } from "./background/PortalSystem";
import { playWinTune } from "../../sfx/winTune";
import { hb as getHB } from "../../player/hb";
import { setScene } from "./SceneManager";
import { GameOverScene } from "./MenuScene";
import { drawText as D } from "../font/fontEngine";
import { zzfx } from "../audio/SoundEngine";
import { die as dieSfx } from "../../sfx/die";

const TILE=16, FINISH=3, SPIKE=4;
const CAM_EASE=.14, CAM_DT=1/60, BG_EASE=.18;

let LIDX=0, ctx:CanvasRenderingContext2D|null=null;
let env=new Environment(), portals=new PortalSystem(), player:Player|null=null;
let cam:Cam={x:0,y:0}, bgX=0, bgXPrev=0, winT=0, toGameOver=false;
const G:any=globalThis; // G.D deaths, G.T ms, G._t lastDraw
let prevR=false;

// NEW: allow other scenes to request a specific starting level (0-based)
let PENDING_START_LIDX: number | null = null;
export function setPendingStartLevelZeroBased(i:number){
  PENDING_START_LIDX = Math.max(0, Math.min(LC-1, (i|0)));
}

const drawFinish=(c:CanvasRenderingContext2D,x:number,y:number,s:number)=>{ const h=s>>1; c.fillStyle="#fff"; c.fillRect(x,y,h,h); c.fillStyle="#000"; c.fillRect(x+h,y,h,h); c.fillRect(x,y+h,h,h); c.fillStyle="#fff"; c.fillRect(x+h,y+h,h,h); };

function go(d=0){
  LIDX=Math.max(0,Math.min(LC-1,LIDX+d));
  L(LIDX); env.start(); winT=0; toGameOver=false;
  const mp=getCurrentMap();
  if(ctx&&player&&mp){
    player.respawn();
    player.setLevelBounds(mp.width,mp.height,ctx.canvas.height,TILE);
    player.setSpawn(64,24); player.body.pos={x:64,y:24};
  }
  portals.reset?.() ?? portals.clear();
  const target=player?player.body.pos.x:0; bgX=bgXPrev=target;

  // 🔊 start/refresh music on every level change
  dispatchEvent(new CustomEvent("scene:start-music",{detail:{level:LIDX}}));
}

export const BackgroundScene={
  setCanvas(c:CanvasRenderingContext2D){ ctx=c; },
  start(){
    if(!ctx) return;
    const k=ctx.canvas; cam.x=k.width*.5; cam.y=k.height*.5;

    // Consume any pending start index immediately (prevents one-frame flicker).
    LIDX = (PENDING_START_LIDX!=null) ? PENDING_START_LIDX : 0;
    PENDING_START_LIDX = null;

    env.start();
    L(LIDX);

    createAnimator(a=>{
      // Count deaths at the player's death flow (spikes/OOB/reset) + play die SFX
      player=createPlayer(a,{ 
        onDeath:()=>{ 
          G.D=(G.D|0)+1; 
          try{ (zzfx as any)(...(dieSfx as any)) }catch{} 
        } 
      });
      if(ctx) player.body.pos={x:64,y:24};
      portals.setAnimator(a); portals.setPlayer(player);
      const mp=getCurrentMap(); if(mp&&ctx) player.setLevelBounds(mp.width,mp.height,ctx.canvas.height,TILE);
      const target=player?player.body.pos.x:0; bgX=bgXPrev=target;
    });

    addEventListener("resize",()=>{ if(!ctx||!player) return; const mp=getCurrentMap(); if(mp) player.setLevelBounds(mp.width,mp.height,ctx.canvas.height,TILE); });
    portals.attachInput(k,cam);

    // Expose level changer (1-based external API) for later transitions
    (globalThis as any).lvl={n:(i:number)=>{LIDX=Math.max(0,Math.min(LC-1,(i|0)-1));go(0)}};

    // 🔊 ensure music is started when this scene boots (e.g. after Tutorial)
    // This mirrors what `go()` does for intra-scene level changes.
    dispatchEvent(new CustomEvent("scene:start-music",{detail:{level:LIDX}}));
  },

  update(){
    if(!ctx) return;
    const c=ctx, inp=getInputState();

    // R edge → same death flow (counts once + plays SFX via onDeath)
    // ALSO: clear portals on reset
    if(inp.reset && !prevR){
      player?.reset?.();
      portals.reset?.() ?? portals.clear();
    }
    prevR=!!inp.reset;

    if(winT>0){
      if(--winT===0){ toGameOver?setScene(GameOverScene):go(1); }
    }else{
      player?.update(inp,c); portals.tick();

      if(player){
        const mp=getCurrentMap(); if(mp){
          const b=player.body,H=getHB(b),Y0=c.canvas.height-mp.height*TILE,
          Lx=(b.pos.x+H.x)|0,Rx=(b.pos.x+H.x+H.w-1)|0,Ty=(b.pos.y+H.y)|0,By=(Ty+H.h-1)|0;
          let x0=(Lx/TILE)|0,x1=(Rx/TILE)|0,y0=((Ty-Y0)/TILE)|0,y1=((By-Y0)/TILE)|0;
          if(x0<0)x0=0; if(y0<0)y0=0; if(x1>=mp.width)x1=mp.width-1; if(y1>=mp.height)y1=mp.height-1;
          outer: for(let ty=y0;ty<=y1;ty++){
            const row=ty*mp.width, sy=Y0+ty*TILE;
            for(let tx=x0;tx<=x1;tx++){
              const id=mp.tiles[row+tx];
              if(id===FINISH){
                toGameOver=(LIDX===LC-1);
                try{ (globalThis as any).__sceneMusic?.stop?.(0) }catch{}
                (globalThis as any).__sceneMusic=undefined;
                try{ playWinTune(); }catch{}
                dispatchEvent(new CustomEvent("scene:stop-music"));
                player.celebrateWin?.(66);
                winT=66; portals.reset?.() ?? portals.clear();
                break outer;
              }
              if(id===SPIKE){
                const sx=tx*TILE,s=TILE,cx=sx+s/2,l=Math.max(Lx,sx),r=Math.min(Rx,sx+s);
                if(l<r){ const x=l>cx?l:r<cx?r:cx, yth=sy+((Math.abs(x-cx)*2)|0);
                  if(By>yth && Ty<sy+s){ player.spike?.(); break outer; }
                }
              }
            }
          }
        }
      }
    }

    // camera (fixed dt)
    const mp=getCurrentMap(), ww=mp?mp.width*TILE:1e4, wh=mp?mp.height*TILE:1e4;
    updateSmoothCamera(cam,player?player.body.pos.x:cam.x,player?player.body.pos.y:cam.y,c.canvas.width,c.canvas.height*.7,ww,wh,CAM_EASE,CAM_DT,true);

    // bg follow x
    const px=player?player.body.pos.x:cam.x; bgXPrev=bgX; bgX+=(px-bgX)*BG_EASE;
  },

  draw(t:number, a:number){
    if(!ctx) return;
    const c=ctx,k=c.canvas,w=k.width,h=k.height;

    // run timer
    G.T=(G.T||0)+((t-(G._t||t))|0); G._t=t;

    // bg
    env.draw(c,t/1e3, bgXPrev+(bgX-bgXPrev)*(a||0));

    // world
    c.save(); c.translate((w*.5-cam.x)|0,(h*.5-cam.y)|0);
    const mp=getCurrentMap();
    if(mp){
      drawMapAndColliders(c,mp,TILE);
      const Y0=c.canvas.height-mp.height*TILE;
      for(let ty=0;ty<mp.height;ty++){
        const row=ty*mp.width, y=(Y0+ty*TILE)|0;
        for(let tx=0;tx<mp.width;tx++) if(mp.tiles[row+tx]===FINISH) drawFinish(c,(tx*TILE)|0,y,TILE);
      }
    }
    player?.draw(c,t); portals.draw(c,t);
    c.restore();

    // HUD (top-right): "DEATHS <n>  TIME MM:SS"
    const sec=(G.T/1e3|0), mm=(sec/60|0), ss=(sec%60|0);
    const text="DEATHS "+(G.D|0)+"  TIME "+mm+":"+(ss<10?"0":"")+ss;
    const tw=text.length*6 - 1, x=(w - tw - 6)|0, y=4; // scale=1
    c.fillStyle="#0007"; c.fillRect(x-3,y-2,tw+6,11);
    D(c,text,x+1,y+1,1,"#000"); D(c,text,x,y,1,"#cbd5e1");
  }
};
