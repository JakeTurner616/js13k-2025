// src/engine/scenes/effects/terrain/Terrain.ts
import type { Draw } from "../../u";
import { addB, addM, ridge, fbm, gradL, col, min, max } from "../../u";

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

const vapor=(seed:number, par:number, base:number, amp:number, ci:number, step=4):Draw =>
(c,w,h,_t,camX)=>{
  const y0=(h*base)|0, off=camX*par, S0=seed*.7, sc=.9, half=h>>1;
  c.fillStyle=col(ci);
  for(let px=0;px<w;px+=step){
    const wx=(px+off)*sc;
    for(let py=0;py<half;py+=step){
      const wy=py*sc;
      const x=wx+fbm(wx*.5,wy*.5,seed)*60;
      const y=wy+fbm(wx*.5+100,wy*.5+100,seed)*40;
      let r=1-Math.abs(2*fbm(x,y,S0)-1); r*=r*r; if(r<.002) continue;
      c.fillRect(px,(y0+py-amp*r+.5)|0,step,step+.5);
    }
  }
};

// order: vapor behind everything; mountains between rows
addB(vapor(4,.22,.45,90, 6));       // backdrop dots colored with palette index 6
addM(mountain(11,.18,.70,28, 8, 9)); // far mountains (top/bot 8/9)
addM(mountain(23,.28,.76,20, 10,11)); // mid mountains (top/bot 10/11)
