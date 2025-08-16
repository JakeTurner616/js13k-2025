// src/player/core/aim.ts
// Byte-lean aim heuristics + dot preview.
//
// Math trick (no divides):
//  apex = vy^2/(2G) < 4     ⇒ vy^2 < 8G
//  range = |vx|*2|vy|/G < 12⇒ |vx||vy| < 6G
// So “weak shot” ⇔ (vy^2 < 8G) && (|vx*vy| < 6G)

import { WORLD_G as G, abs } from "./math";

export const isBadAim = (
  vx:number, vy:number, side:number, onWall:boolean
)=>{
  const weak = vy*vy < 8*G && abs(vx*vy) < 6*G;
  return weak || (onWall && vx*side >= 0);
};

export const drawAimDots = (
  ctx:CanvasRenderingContext2D,
  px:number, py:number,
  vx:number, vy:number,
  bad:boolean
)=>{
  ctx.save();
  ctx.globalAlpha = .92;
  ctx.fillStyle = bad ? "#f55" : "#fff";
  // count-down loop is a hair shorter than k<27
  for (let k=27; k--; ){
    const x = px + vx*k, y = py + vy*k + .5*G*k*k;
    ctx.fillRect(x|0, y|0, 1, 1);
  }
  ctx.restore();
};
