import type { Cam } from "../../camera/Camera";
import type { Ori } from "../../objects/portals/PortalPlacement";

// screen → world
export const s2w = (x:number,y:number,c:HTMLCanvasElement,cam:Cam)=>{
  const r = c.getBoundingClientRect();
  const sx = (x - r.left) * (c.width / r.width);
  const sy = (y - r.top)  * (c.height / r.height);
  return { wx: sx + (cam.x - c.width * .5), wy: sy + (cam.y - c.height * .5) };
};

// world ↔ portal frames
export const tb = (vx:number,vy:number,o:Ori)=> // world→(n,t)
  o==="R" ? {n:vx,  t:vy} :
  o==="L" ? {n:-vx, t:vy} :
  o==="U" ? {n:-vy, t:vx} : {n:vy, t:vx};

export const fb = (n:number,t:number,o:Ori)=>  // (n,t)→world
  o==="R" ? {vx:n,  vy:t} :
  o==="L" ? {vx:-n, vy:t} :
  o==="U" ? {vx:t,  vy:-n} : {vx:t, vy:n};

export const push = (o:Ori,d:number)=>       // along portal normal
  o==="R"?{dx:d,dy:0}:o==="L"?{dx:-d,dy:0}:o==="U"?{dx:0,dy:-d}:{dx:0,dy:d};

export const pushByHit = (o:Ori,hw:number,hh:number,p=2)=> // half-extent (+pad)
  (o==="R"||o==="L") ? push(o, hw+p) : push(o, hh+p);
