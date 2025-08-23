// src/engine/scenes/BackgroundScene.ts
// + call player.setLevelBounds(...) once after level load and on resize

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

let env = new Environment();
let portals = new PortalSystem();

let player:Player|null = null;
let cam:Cam = { x:0, y:0 };
let bgX = 0;

export const BackgroundScene = {
  setCanvas(c:CanvasRenderingContext2D){ ctx = c; },

  start(){
    if (!ctx) return;
    const k = ctx.canvas;
    cam.x = k.width*.5; 
    cam.y = k.height*.5;

    env.start();
    loadLevel1();

    createAnimator(a=>{
      player = createPlayer(a);
      if (ctx) player.body.pos = { x:64, y:24 };
      portals.setAnimator(a);
      portals.setPlayer(player);


    });

    portals.attachInput(k, cam);
  },



  update(){
    if (!ctx) return;
    const c = ctx, inp = getInputState();
    player?.update(inp, c);

    portals.tick();

    const px = player ? player.body.pos.x 
                      : bgX + ((+!!inp.right) - (+!!inp.left)) * 2;
    bgX += (px - bgX) * .18;

    const mp = getCurrentMap(), 
          ww = mp ? mp.width*TILE : 1e4, 
          wh = mp ? mp.height*TILE : 1e4;
    const py = player ? player.body.pos.y : cam.y;

    // Increase the min height cap to move camera up
    const minHeightCap = c.canvas.height * 0.7; // was likely 1.0, now 0.7 to move up
    updateSmoothCamera(cam, px, py, c.canvas.width, minHeightCap, ww, wh, .14, 1/60, true);
  },

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
