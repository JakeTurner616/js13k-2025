// src/engine/scenes/BackgroundScene.ts
//
// Scene = env + map + player + portals + level switcher + finishline styling.
// Goal: **super tiny** (pre-terser) + heavily commented so it’s easy to tweak.
//
// ✨ Behavior
// - Any tile with id==131 is a FINISH square.
// - Touching FINISH instantly switches to the next level (no portals on it).
// - FINISH tiles are rendered as a tiny checkerboard (finish line vibe).
//
// 🧩 Integration notes
// - We keep all logic local (no new files).
// - We assume you have loadLevel1() and loadLevel2() in your level-loader.
//   If you only have one level right now, add a stub loadLevel2() or change LEVELS below.
// - Portals won't attach if 131 is *not* in your `solid` set (recommended).

import { drawMapAndColliders } from "../renderer/render";
// 👇 add loadLevel2 beside loadLevel1 (make a stub if you don’t have it yet)
import { loadLevel1, loadLevel2, getCurrentMap } from "../renderer/level-loader";
import { createAnimator } from "../../atlas/animationAtlas";
import { createPlayer, type Player } from "../../player/Player";
import { updateSmoothCamera, type Cam } from "../camera/Camera";
import { getInputState } from "../input/input";

import { Environment } from "./background/Environment";
import { PortalSystem } from "./background/PortalSystem";

// --- tiny constants (inline-friendly) ---
const TILE=16;          // grid size
const FINISH=131;       // finish square id

// --- tiny “level registry” ---
// Add/remove loaders here; when hitting FINISH we advance to the next.
const LEVELS = [loadLevel1, loadLevel2]; // add more if you have them
let LIDX = 0; // current level index

// --- scene singletons / state ---
let ctx:CanvasRenderingContext2D|null=null;
let env=new Environment();
let portals=new PortalSystem();
let player:Player|null=null;
let cam:Cam={x:0,y:0};
let bgX=0; // parallax anchor

// --- helpers: draw a *tiny* checkered finish square ---
// (2x2 cells inside a 16×16 tile; minimal ops)
function drawFinishTile(c:CanvasRenderingContext2D,x:number,y:number,s:number){
  const h=s>>1; // half (8 if s=16)
  c.fillStyle="#fff"; c.fillRect(x,y,h,h);         // ◼︎ top-left  (white)
  c.fillStyle="#000"; c.fillRect(x+h,y,h,h);       // ◼︎ top-right (black)
  c.fillStyle="#000"; c.fillRect(x,y+h,h,h);       // ◼︎ bottom-left (black)
  c.fillStyle="#fff"; c.fillRect(x+h,y+h,h,h);     // ◼︎ bottom-right (white)
}

// --- tiny loader wrapper: resets camera, player, portals & bounds ---
function loadLevel(idx:number){
  LIDX = (idx+LEVELS.length)%LEVELS.length; // wrap
  LEVELS[LIDX]();                            // load map
  env.start();                               // (re)start env for consistency
  // keep player + portals; re-anchor after atlas is ready
  const m=getCurrentMap();
  if(ctx && player && m){
    player.setLevelBounds(m.width,m.height,ctx.canvas.height,TILE);
    player.body.pos={x:64,y:24};            // spawn point (tiny & predictable)
    portals.reset?.();                       // if your PortalSystem has reset()
  }
  // center camera softly
  bgX = player ? player.body.pos.x : bgX;
}

// --- public scene API ---
export const BackgroundScene={
  setCanvas(c:CanvasRenderingContext2D){ctx=c;},

  start(){
    if(!ctx)return;
    const k=ctx.canvas;
    cam.x=k.width*.5; cam.y=k.height*.5;

    // fresh environment + level 0
    env.start();
    LEVELS[0](); // initial map

    // build animator → then player/portals → then map bounds
    createAnimator(a=>{
      player=createPlayer(a);
      if(ctx) player.body.pos={x:64,y:24}; // small spawn
      portals.setAnimator(a);
      portals.setPlayer(player);

      const m=getCurrentMap();
      if(m&&ctx) player.setLevelBounds(m.width,m.height,ctx.canvas.height,TILE);
    });

    // keep bounds valid on resize (min code, robust result)
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
    player?.update(inp,c);
    portals.tick();

    // --- FINISH collision (player HB → tile scan) ---
    if(player){
      const m=getCurrentMap();
      if(m){
        const b=player.body, hb=b.hit||{x:0,y:0,w:b.width,h:b.height};
        const Y0=c.canvas.height-m.height*TILE; // top of tilemap in canvas
        const L=(b.pos.x+hb.x)|0, R=(b.pos.x+hb.x+hb.w-1)|0;
        const T=(b.pos.y+hb.y)|0, B=(T+hb.h-1)|0;
        let x0=(L/TILE)|0, x1=(R/TILE)|0;
        let y0=((T-Y0)/TILE)|0, y1=((B-Y0)/TILE)|0;
        if(x0<0)x0=0; if(y0<0)y0=0;
        if(x1>=m.width)x1=m.width-1;
        if(y1>=m.height)y1=m.height-1;

        // tiny nested loop + labeled break (fast exit)
        outer: for(let ty=y0;ty<=y1;ty++){
          const row=ty*m.width;
          for(let tx=x0;tx<=x1;tx++){
            if(m.tiles[row+tx]===FINISH){ loadLevel(LIDX+1); break outer; }
          }
        }
      }
    }

    // --- camera follow (unchanged, small) ---
    const px=player?player.body.pos.x:bgX+((+!!inp.right)-(+!!inp.left))*2;
    bgX+=(px-bgX)*.18;
    const m=getCurrentMap(), ww=m?m.width*TILE:1e4, wh=m?m.height*TILE:1e4;
    const py=player?player.body.pos.y:cam.y, cap=c.canvas.height*.7;
    updateSmoothCamera(cam,px,py,c.canvas.width,cap,ww,wh,.14,1/60,true);
  },

  draw(t:number){
    if(!ctx)return;
    const c=ctx,k=c.canvas,w=k.width,h=k.height, time=t/1000;

    // env backdrop
    env.draw(c,time,bgX);

    // world space
    c.save();
    c.translate((w*.5-cam.x)|0,(h*.5-cam.y)|0);

    // map + colliders
    const m=getCurrentMap();
    if(m){
      drawMapAndColliders(c,m,TILE);

      // **Finish styling**: draw a tiny checkerboard over every FINISH tile.
      // Kept local here so render.ts stays generic & tiny.
      const Y0=c.canvas.height-m.height*TILE;
      for(let ty=0;ty<m.height;ty++){
        const row=ty*m.width, y=(Y0+ty*TILE)|0;
        for(let tx=0;tx<m.width;tx++){
          if(m.tiles[row+tx]===FINISH) drawFinishTile(c,(tx*TILE)|0,y,TILE);
        }
      }
    }

    // entities
    player?.draw(c,t);
    portals.draw(c,t);

    c.restore();
  }
};
