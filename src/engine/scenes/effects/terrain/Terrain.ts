// src/engine/scenes/effects/terrain/Terrain.ts
import type { Draw } from "../../u";
import {  addM, ridge,  gradL,  min, max } from "../../u";

const mountain=(seed:number, par:number, base:number, amp:number, top:number, bot:number):Draw =>
(c,w,h,_t,camX)=>{
  const off=camX*par, y0=(h*base)|0;
  c.beginPath(); c.moveTo(0,h);
  for(let x=0;x<=w;x+=2){
    const r=ridge(x+off,seed);
    const y=min(h-1, max(h*.22, y0+(r-.5)*amp));
    c.lineTo(x,y);
  }
  c.lineTo(w,h); c.closePath();
  c.fillStyle = gradL(c,0,0,0,h, [[0,top],[1,bot]]);
  c.fill();
  c.strokeStyle="rgba(255,255,255,.05)"; c.lineWidth=1; c.stroke();
};


addM(mountain(11,.18,.70,28, 8, 9)); // far mountains (top/bot 8/9)
addM(mountain(23,.28,.76,20, 10,11)); // mid mountains (top/bot 10/11)
