// src/engine/scenes/BackgroundScene.ts
import { drawMapAndColliders } from "../renderer/render";
import { loadLevel1, loadLevel2, getCurrentMap } from "../renderer/level-loader";
import { createAnimator } from "../../atlas/animationAtlas";
import { createPlayer, type Player } from "../../player/Player";
import { updateSmoothCamera, type Cam } from "../camera/Camera";
import { getInputState } from "../input/input";
import { Environment } from "./background/Environment";
import { PortalSystem } from "./background/PortalSystem";
import { playWinTune } from "../../sfx/winTune";
import { hb as getHB } from "../../player/hb"; // shared hitbox helper

const TILE=16, FINISH=3, SPIKE=4, LEVELS=[loadLevel1,loadLevel2];
let LIDX=0, ctx:CanvasRenderingContext2D|null=null;
let env=new Environment(), portals=new PortalSystem(), player:Player|null=null;
let cam:Cam={x:0,y:0}, bgX=0, winT=0;

function stopSceneMusic(){
  try{
    const g:any=globalThis; g.__sceneMusic?.stop?.(0); g.__sceneMusic=undefined;
    dispatchEvent(new CustomEvent("scene:stop-music"));
  }catch{}
}
function drawFinishTile(c:CanvasRenderingContext2D,x:number,y:number,s:number){
  const h=s>>1; c.fillStyle="#fff"; c.fillRect(x,y,h,h);
  c.fillStyle="#000"; c.fillRect(x+h,y,h,h); c.fillRect(x,y+h,h,h);
  c.fillStyle="#fff"; c.fillRect(x+h,y+h,h,h);
}
function loadLevel(idx:number){
  LIDX=(idx+LEVELS.length)%LEVELS.length; LEVELS[LIDX]();
  env.start(); winT=0;
  const m=getCurrentMap();
  if(ctx&&player&&m){
    (player as any)._winT=0; player.respawn();
    player.setLevelBounds(m.width,m.height,ctx.canvas.height,TILE);
    player.setSpawn(64,24); player.body.pos={x:64,y:24};
  }
  portals.reset?.() ?? portals.clear();
  bgX=player?player.body.pos.x:bgX;
  dispatchEvent(new CustomEvent("scene:start-music",{detail:{level:LIDX}}));
}

//probably should remember to remove for prod; This is all just debug stuff so we can step through and reload levels.
try{
  (globalThis as any).lvl = {
    n: () => loadLevel(LIDX+1),      // next
    p: () => loadLevel(LIDX-1),      // prev
    g: (i:number) => loadLevel(i|0), // goto (wraps via modulo in loadLevel)
    r: () => loadLevel(LIDX)         // reload current
  };
}catch{}

export const BackgroundScene={
  setCanvas(c:CanvasRenderingContext2D){ ctx=c; },

  start(){
    if(!ctx) return;
    const k=ctx.canvas; cam.x=k.width*.5; cam.y=k.height*.5;
    env.start(); LEVELS[0]();
    createAnimator(a=>{
      player=createPlayer(a);
      if(ctx) player.body.pos={x:64,y:24};
      portals.setAnimator(a); portals.setPlayer(player);
      const m=getCurrentMap(); if(m&&ctx) player.setLevelBounds(m.width,m.height,ctx.canvas.height,TILE);
    });
    addEventListener("resize",()=>{
      if(!ctx||!player) return;
      const m=getCurrentMap(); if(m) player.setLevelBounds(m.width,m.height,ctx.canvas.height,TILE);
    });
    portals.attachInput(k,cam);
  },

  update(){
    if(!ctx) return;
    const c=ctx, inp=getInputState();
    if(winT>0){ if(--winT===0) loadLevel(LIDX+1); }
    else{
      player?.update(inp,c); portals.tick();
      if(player){
        const m=getCurrentMap();
        if(m){
          const b=player.body, H=getHB(b);
          const Y0=c.canvas.height-m.height*TILE;
          const L=(b.pos.x+H.x)|0, R=(b.pos.x+H.x+H.w-1)|0;
          const T=(b.pos.y+H.y)|0, B=(T+H.h-1)|0;
          let x0=(L/TILE)|0, x1=(R/TILE)|0, y0=((T-Y0)/TILE)|0, y1=((B-Y0)/TILE)|0;
          if(x0<0)x0=0; if(y0<0)y0=0; if(x1>=m.width)x1=m.width-1; if(y1>=m.height)y1=m.height-1;
          outer: for(let ty=y0;ty<=y1;ty++){
            const row=ty*m.width, sy=Y0+ty*TILE;
            for(let tx=x0;tx<=x1;tx++){
              const id=m.tiles[row+tx];
              if(id===FINISH){
                stopSceneMusic(); playWinTune(); player.celebrateWin?.(66);
                winT=66; portals.reset?.() ?? portals.clear(); break outer;
              }
              if(id===SPIKE){
                // Triangular surface: y = sy + 2*|x - cx|
                const sx=tx*TILE, s=TILE, cx=sx+s/2;
                const l=L>sx?L:sx, r=R<sx+s?R:sx+s; // overlap
                if(l<r){
                  const x = l>cx ? l : r<cx ? r : cx;
                  const yth = (sy + ((Math.abs(x-cx)*2)|0))|0; // V surface
                  if(B>yth && T<sy+s){ player.spike?.(); break outer; } // ✅ no portal reset on spikes
                }
              }
            }
          }
        }
      }
    }
    const px=player?player.body.pos.x:bgX+((+!!inp.right)-(+!!inp.left))*2;
    bgX+=(px-bgX)*.18;
    const m=getCurrentMap(), ww=m?m.width*TILE:1e4, wh=m?m.height*TILE:1e4;
    const py=player?player.body.pos.y:cam.y, cap=c.canvas.height*.7;
    updateSmoothCamera(cam,px,py,c.canvas.width,cap,ww,wh,.14,1/60,true);
  },

  draw(t:number){
    if(!ctx) return;
    const c=ctx, k=c.canvas, w=k.width, h=k.height, time=t/1000;
    env.draw(c,time,bgX);
    c.save(); c.translate((w*.5-cam.x)|0,(h*.5-cam.y)|0);
    const m=getCurrentMap();
    if(m){
      drawMapAndColliders(c,m,TILE);
      const Y0=c.canvas.height-m.height*TILE;
      for(let ty=0;ty<m.height;ty++){
        const row=ty*m.width, y=(Y0+ty*TILE)|0;
        for(let tx=0;tx<m.width;tx++) if(m.tiles[row+tx]===FINISH)
          drawFinishTile(c,(tx*TILE)|0,y,TILE);
      }
    }
    player?.draw(c,t); portals.draw(c,t);
    c.restore();
  }
};
