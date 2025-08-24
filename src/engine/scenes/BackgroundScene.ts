// src/engine/scenes/BackgroundScene.ts
//
// Scene = env + map + player + portals + level switcher + finishline styling.
// ✨ Finish flow (tile id == 131):
//   1) 🔇 Stop scene BGM immediately so the win sting is fully audible.
//   2) 🎵 Play the win sting.
//   3) 💀 Show a short “death” celebration on the player (freeze controls).
//   4) 🔁 After a short delay, stitch to the next level → FORCE back to IDLE,
//      then 🔊 tell the app to (re)start music for that level.
//
// Small + js13k-friendly (pre-terser).

import { drawMapAndColliders } from "../renderer/render";
import { loadLevel1, loadLevel2, getCurrentMap } from "../renderer/level-loader";
import { createAnimator } from "../../atlas/animationAtlas";
import { createPlayer, type Player } from "../../player/Player";
import { updateSmoothCamera, type Cam } from "../camera/Camera";
import { getInputState } from "../input/input";

import { Environment } from "./background/Environment";
import { PortalSystem } from "./background/PortalSystem";
import { playWinTune } from "../../sfx/winTune";

const TILE=16, FINISH=131;                 // tile size + finish id
const LEVELS=[loadLevel1,loadLevel2]; let LIDX=0;

let ctx:CanvasRenderingContext2D|null=null;
let env=new Environment();
let portals=new PortalSystem();
let player:Player|null=null;
let cam:Cam={x:0,y:0};
let bgX=0;  // parallax anchor
let winT=0; // frames to wait before switching level after sting

// 🔇 Stop BGM (global pointer + optional event hook).
function stopSceneMusic(){
  try{
    const g:any=globalThis;
    g.__sceneMusic?.stop?.(0); g.__sceneMusic=undefined;
    dispatchEvent(new CustomEvent("scene:stop-music"));
  }catch{}
}

// 🏁 tiny checkerboard (2×2) for finish tiles
function drawFinishTile(c:CanvasRenderingContext2D,x:number,y:number,s:number){
  const h=s>>1; c.fillStyle="#fff"; c.fillRect(x,y,h,h);
  c.fillStyle="#000"; c.fillRect(x+h,y,h,h); c.fillRect(x,y+h,h,h);
  c.fillStyle="#fff"; c.fillRect(x+h,y+h,h,h);
}

// 📦 load a level + FORCE back to idle state, then ask app to start BGM
function loadLevel(idx:number){
  LIDX=(idx+LEVELS.length)%LEVELS.length; LEVELS[LIDX](); // load map
  env.start(); winT=0;

  const m=getCurrentMap();
  if(ctx&&player&&m){
    (player as any)._winT=0;  // clear celebration lock
    player.respawn();         // reset to idle/collisions
    player.setLevelBounds(m.width,m.height,ctx.canvas.height,TILE);
    player.setSpawn(64,24); player.body.pos={x:64,y:24};
  }
  portals.reset?.() ?? portals.clear();
  bgX = player ? player.body.pos.x : bgX;

  // 🔊 Tell app which level we’re on so it can (re)start the right song
  dispatchEvent(new CustomEvent("scene:start-music",{detail:{level:LIDX}}));
}

export const BackgroundScene={
  setCanvas(c:CanvasRenderingContext2D){ctx=c;},

  start(){
    if(!ctx)return;
    const k=ctx.canvas;
    cam.x=k.width*.5; cam.y=k.height*.5;

    env.start();
    LEVELS[0]();

    createAnimator(a=>{
      player=createPlayer(a);
      if(ctx) player.body.pos={x:64,y:24};
      portals.setAnimator(a); portals.setPlayer(player);
      const m=getCurrentMap();
      if(m&&ctx) player.setLevelBounds(m.width,m.height,ctx.canvas.height,TILE);
    });

    addEventListener("resize",()=>{
      if(!ctx||!player)return;
      const m=getCurrentMap();
      if(m) player.setLevelBounds(m.width,m.height,ctx.canvas.height,TILE);
    });

    portals.attachInput(k,cam);
  },

  update(){
    if(!ctx)return;
    const c=ctx, inp=getInputState();

    // Wait out the celebration; then stitch.
    if(winT>0){ if(--winT===0) loadLevel(LIDX+1); }
    else{
      player?.update(inp,c);
      portals.tick();

      // FINISH trigger: scan tiles under player HB
      if(player){
        const m=getCurrentMap();
        if(m){
          const b=player.body, hb=b.hit||{x:0,y:0,w:b.width,h:b.height};
          const Y0=c.canvas.height-m.height*TILE;
          const L=(b.pos.x+hb.x)|0, R=(b.pos.x+hb.x+hb.w-1)|0;
          const T=(b.pos.y+hb.y)|0, B=(T+hb.h-1)|0;
          let x0=(L/TILE)|0, x1=(R/TILE)|0, y0=((T-Y0)/TILE)|0, y1=((B-Y0)/TILE)|0;
          if(x0<0)x0=0; if(y0<0)y0=0; if(x1>=m.width)x1=m.width-1; if(y1>=m.height)y1=m.height-1;

          outer: for(let ty=y0;ty<=y1;ty++){
            const row=ty*m.width;
            for(let tx=x0;tx<=x1;tx++){
              if(m.tiles[row+tx]===FINISH){
                // 🔇 stop BGM → 🎵 sting → 💀 celebrate → ⏳ delay → 🔁 stitch
                stopSceneMusic();
                playWinTune();
                player.celebrateWin?.(66);
                winT=66;
                portals.reset?.() ?? portals.clear();
                break outer;
              }
            }
          }
        }
      }
    }

    // camera follow + parallax
    const px=player?player.body.pos.x:bgX+((+!!inp.right)-(+!!inp.left))*2;
    bgX+=(px-bgX)*.18;
    const m=getCurrentMap(), ww=m?m.width*TILE:1e4, wh=m?m.height*TILE:1e4;
    const py=player?player.body.pos.y:cam.y, cap=c.canvas.height*.7;
    updateSmoothCamera(cam,px,py,c.canvas.width,cap,ww,wh,.14,1/60,true);
  },

  draw(t:number){
    if(!ctx)return;
    const c=ctx,k=c.canvas,w=k.width,h=k.height,time=t/1000;

    env.draw(c,time,bgX);

    c.save();
    c.translate((w*.5-cam.x)|0,(h*.5-cam.y)|0);

    const m=getCurrentMap();
    if(m){
      drawMapAndColliders(c,m,TILE);

      // overlay checker on all FINISH tiles
      const Y0=c.canvas.height-m.height*TILE;
      for(let ty=0;ty<m.height;ty++){
        const row=ty*m.width, y=(Y0+ty*TILE)|0;
        for(let tx=0;tx<m.width;tx++){
          if(m.tiles[row+tx]===FINISH) drawFinishTile(c,(tx*TILE)|0,y,TILE);
        }
      }
    }

    player?.draw(c,t);
    portals.draw(c,t);

    c.restore();
  }
};
