// src/player/hb.ts
// Tiny hitbox helpers (dedupe-friendly)

export const hb=(b:any)=>b.hit||{x:0,y:0,w:b.width,h:b.height};

export const hc=(b:any)=>{
  const h=hb(b), cx=b.pos.x+h.x+h.w*.5, cy=b.pos.y+h.y+h.h*.5;
  return {h, cx, cy, hw:h.w*.5, hh:h.h*.5};
};
