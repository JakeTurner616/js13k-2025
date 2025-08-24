// src/engine/scenes/background/sceneUtils.ts
// screen↔world + portal basis ops (branchless via lookup tables)

import type { Cam } from "../../camera/Camera";
export type Ori="R"|"L"|"U"|"D";

// basis map: [nx,ny, tx,ty]
const B:{[k in Ori]:[number,number,number,number]}={
  R:[ 1, 0, 0, 1],
  L:[-1, 0, 0, 1],
  U:[ 0,-1, 1, 0],
  D:[ 0, 1, 1, 0]
};

/** Screen(client) → world; honors CSS scale + camera center. */
export const s2w=(x:number,y:number,c:HTMLCanvasElement,cam:Cam)=>{
  const r=c.getBoundingClientRect(), W=c.width, H=c.height;
  const sx=(x-r.left)*W/(r.width||1), sy=(y-r.top)*H/(r.height||1);
  return {wx:sx+(cam.x-W*0.5), wy:sy+(cam.y-H*0.5)};
};

// world (vx,vy) → portal basis {n,t}
export const tb=(vx:number,vy:number,o:Ori)=>{
  const [nx,ny,tx,ty]=B[o];
  return {n:vx*nx+vy*ny, t:vx*tx+vy*ty};
};

// portal basis {n,t} → world (vx,vy)  (inverse = transpose for orthonormal basis)
export const fb=(n:number,t:number,o:Ori)=>{
  const [nx,ny,tx,ty]=B[o];
  return {vx:n*nx+t*tx, vy:n*ny+t*ty};
};

// push along portal normal by d
export const push=(o:Ori,d:number)=>{
  const [nx,ny]=B[o];
  return {dx:nx*d, dy:ny*d};
};

// push so a half-extent clears plane (+ optional pad)
export const pushByHit=(o:Ori,hw:number,hh:number,p=2)=>{
  const d=(o==="R"||o==="L"?hw:hh)+p;
  return push(o,d);
};
