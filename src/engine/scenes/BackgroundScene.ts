// src/engine/scenes/BackgroundScene.ts
//
// Core game scene = environment + map + player + portals.
// Handles canvas attach, level load, camera follow, update, draw.
// NOTE: we MUST call player.setLevelBounds(...) after loading the level
// (and again on resize) so Player's OOB/death check is enabled.

import { drawMapAndColliders } from "../renderer/render";
import { loadLevel1, getCurrentMap } from "../renderer/level-loader";
import { createAnimator } from "../../atlas/animationAtlas";
import { createPlayer, type Player } from "../../player/Player";
import { updateSmoothCamera, type Cam } from "../camera/Camera";
import { getInputState } from "../input/input";

import { Environment } from "./background/Environment";
import { PortalSystem } from "./background/PortalSystem";

const TILE = 16;
let ctx:CanvasRenderingContext2D|null = null;

// scene modules
let env = new Environment();
let portals = new PortalSystem();

// runtime state
let player:Player|null = null;
let cam:Cam = { x:0, y:0 };
let bgX = 0;

export const BackgroundScene = {
  // inject canvas context
  setCanvas(c:CanvasRenderingContext2D){ ctx = c; },

  // init: set cam center, start env, load level, create animator/player/portals
  start(){
    if (!ctx) return;
    const k = ctx.canvas;
    cam.x = k.width*.5; 
    cam.y = k.height*.5;

    env.start();
    loadLevel1();

    createAnimator(a=>{
      player = createPlayer(a);
      if (ctx) player.body.pos = { x:64, y:24 }; // spawn point
      portals.setAnimator(a);
      portals.setPlayer(player);

      // 🔑 enable player OOB/death by setting level bounds now that map is loaded
      const map = getCurrentMap();
      if (map && ctx) player.setLevelBounds(map.width, map.height, ctx.canvas.height, TILE);
    });

    // keep bounds correct if the canvas size changes
    window.addEventListener("resize", ()=>{
      if (!ctx || !player) return;
      const map = getCurrentMap();
      if (map) player.setLevelBounds(map.width, map.height, ctx.canvas.height, TILE);
    });

    portals.attachInput(k, cam);
  },

  // per-frame logic: update player + portals + smooth camera follow
  update(){
    if (!ctx) return;
    const c = ctx, inp = getInputState();
    player?.update(inp, c);
    portals.tick();

    // background parallax anchor: follow player x or scroll with input
    const px = player ? player.body.pos.x 
                      : bgX + ((+!!inp.right) - (+!!inp.left)) * 2;
    bgX += (px - bgX) * .18;

    // clamp cam to map bounds
    const mp = getCurrentMap(), 
          ww = mp ? mp.width*TILE : 1e4, 
          wh = mp ? mp.height*TILE : 1e4;
    const py = player ? player.body.pos.y : cam.y;

    // cam vertical bias: lower cap so camera sits higher
    const minHeightCap = c.canvas.height * 0.7;
    updateSmoothCamera(cam, px, py, c.canvas.width, minHeightCap, ww, wh, .14, 1/60, true);
  },

  // render env → map → player → portals
  draw(t:number){
    if (!ctx) return;
    const c = ctx, k = c.canvas, w = k.width, h = k.height, time = t/1000;

    env.draw(c, time, bgX);

    c.save();
    c.translate((w*.5 - cam.x)|0, (h*.5 - cam.y)|0);
    const map = getCurrentMap();
    if (map) drawMapAndColliders(c, map, TILE);
    player?.draw(c, t);
    portals.draw(c, t);
    c.restore();
  }
};
