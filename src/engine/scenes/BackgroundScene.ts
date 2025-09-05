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

// src/engine/scenes/BackgroundScene.ts

const TILE=16, FINISH=3, SPIKE=4;

// keep original feel exactly: camera ease normalized against 60Hz
const CAM_EASE = .14;
const CAM_DT   = 1/60;

// background smoothing (simple EMA)
const BG_EASE  = .18;

let LIDX=0, ctx:CanvasRenderingContext2D|null=null;
let env=new Environment(), portals=new PortalSystem(), player:Player|null=null;
let cam:Cam={x:0,y:0};
let bgX=0, bgXPrev=0;
let winT=0, toGameOver=false;

const stopMusic=()=>{ try{ const g:any=globalThis; g.__sceneMusic?.stop?.(0); g.__sceneMusic=undefined; dispatchEvent(new CustomEvent("scene:stop-music")); }catch{} };
const drawFinish=(c:CanvasRenderingContext2D,x:number,y:number,s:number)=>{ const h=s>>1; c.fillStyle="#fff"; c.fillRect(x,y,h,h); c.fillStyle="#000"; c.fillRect(x+h,y,h,h); c.fillRect(x,y+h,h,h); c.fillStyle="#fff"; c.fillRect(x+h,y+h,h,h); };

function go(d=0){
  LIDX=Math.max(0,Math.min(LC-1,LIDX+d));
  L(LIDX); env.start(); winT=0; toGameOver=false;
  const m=getCurrentMap();
  if(ctx&&player&&m){
    (player as any)._winT=0; player.respawn();
    player.setLevelBounds(m.width,m.height,ctx.canvas.height,TILE);
    player.setSpawn(64,24); player.body.pos={x:64,y:24};
  }
  portals.reset?.() ?? portals.clear();
  // snap bg to player's x on level switch
  const target = player ? player.body.pos.x : 0;
  bgX = bgXPrev = target;
  dispatchEvent(new CustomEvent("scene:start-music",{detail:{level:LIDX}}));
}

export const BackgroundScene={
  setCanvas(c:CanvasRenderingContext2D){ ctx=c; },
  start(){
    if(!ctx) return;
    const k=ctx.canvas; cam.x=k.width*.5; cam.y=k.height*.5;
    env.start(); L(0);
    createAnimator(a=>{
      player=createPlayer(a);
      if(ctx) player.body.pos={x:64,y:24};
      portals.setAnimator(a); portals.setPlayer(player);
      const m=getCurrentMap(); if(m&&ctx) player.setLevelBounds(m.width,m.height,ctx.canvas.height,TILE);
      const target = player ? player.body.pos.x : 0;
      bgX = bgXPrev = target;
    });
    addEventListener("resize",()=>{ if(!ctx||!player) return; const m=getCurrentMap(); if(m) player.setLevelBounds(m.width,m.height,ctx.canvas.height,TILE); });
    portals.attachInput(k,cam);

    // DEV: console level jumper (comment out for prod) — usage: lvl.n(3)
    (globalThis as any).lvl={n:(i:number)=>{LIDX=Math.max(0,Math.min(LC-1,(i|0)-1));go(0)}};
  },

  update(){
    if(!ctx) return;
    const c=ctx, inp=getInputState();

    if(inp.reset){
      player?.reset(); portals.reset?.() ?? portals.clear(); winT=0; toGameOver=false;
      const target = player ? player.body.pos.x : 0;
      bgX = bgXPrev = target;
    }

    if(winT>0){
      if(--winT===0){ toGameOver?setScene(GameOverScene):go(1); }
    }else{
      player?.update(inp,c); portals.tick();

      if(player){
        const m=getCurrentMap(); if(m){
          const b=player.body,H=getHB(b),Y0=c.canvas.height-m.height*TILE,
          Lx=(b.pos.x+H.x)|0,Rx=(b.pos.x+H.x+H.w-1)|0,Ty=(b.pos.y+H.y)|0,By=(Ty+H.h-1)|0;
          let x0=(Lx/TILE)|0,x1=(Rx/TILE)|0,y0=((Ty-Y0)/TILE)|0,y1=((By-Y0)/TILE)|0;
          if(x0<0)x0=0; if(y0<0)y0=0; if(x1>=m.width)x1=m.width-1; if(y1>=m.height)y1=m.height-1;
          outer: for(let ty=y0;ty<=y1;ty++){
            const row=ty*m.width, sy=Y0+ty*TILE;
            for(let tx=x0;tx<=x1;tx++){
              const id=m.tiles[row+tx];
              if(id===FINISH){
                toGameOver=(LIDX===LC-1);
                stopMusic();
                try{ playWinTune(); }catch{}
                player.celebrateWin?.(66);
                winT=66; portals.reset?.() ?? portals.clear();
                break outer;
              }
              if(id===SPIKE){
                const sx=tx*TILE,s=TILE,cx=sx+s/2,l=Lx>sx?Lx:sx,r=Rx<sx+s?Rx:sx+s;
                if(l<r){ const x=l>cx?l:r<cx?r:cx, yth=(sy+(Math.abs(x-cx)*2|0))|0; if(By>yth && Ty<sy+s){ player.spike?.(); break outer; } }
              }
            }
          }
        }
      }
    }

    // --- Camera: original feel (no extra interpolation), dt fixed at 1/60 like before ---
    const m=getCurrentMap(), ww=m?m.width*TILE:1e4, wh=m?m.height*TILE:1e4;
    const px = player ? player.body.pos.x : cam.x;
    const py = player ? player.body.pos.y : cam.y;
    const cap = c.canvas.height*.7;
    updateSmoothCamera(cam,px,py,c.canvas.width,cap,ww,wh,CAM_EASE,CAM_DT,true);

    // --- Background: follow PLAYER x with light smoothing ---
    bgXPrev = bgX;
    bgX += (px - bgX) * BG_EASE;
  },

  draw(t:number, alpha:number){
    if(!ctx) return;
    const c=ctx,k=c.canvas,w=k.width,h=k.height,time=t/1000;

    // Interpolate only the background for ultra-smooth parallax
    const bgIx = bgXPrev + (bgX - bgXPrev) * (alpha||0);
    env.draw(c,time,bgIx);

    // World: integer-snapped camera (no interpolation) to keep the player crisp
    c.save();
    c.translate((w*.5 - cam.x)|0, (h*.5 - cam.y)|0);

    const m=getCurrentMap();
    if(m){
      drawMapAndColliders(c,m,TILE);
      const Y0=c.canvas.height-m.height*TILE;
      for(let ty=0;ty<m.height;ty++){
        const row=ty*m.width, y=(Y0+ty*TILE)|0;
        for(let tx=0;tx<m.width;tx++) if(m.tiles[row+tx]===FINISH) drawFinish(c,(tx*TILE)|0,y,TILE);
      }
    }
    player?.draw(c,t); portals.draw(c,t);
    c.restore();
  }
};
