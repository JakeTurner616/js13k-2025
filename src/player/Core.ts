// src/player/Core.ts
// One place for tiny math, aim, facing, FSM, numeric anims, and shared consts.

export const G = 0.14;
export const T = 16; // shared tile size
export const { cos, sin, abs, PI } = Math;

// Anim names used only at draw; everything else uses indices.
export const AN = ["idle","dash","jump","fall","ledge","death"] as const;
export const A  = { idle:0, dash:1, jump:2, fall:3, ledge:4, death:5 } as const;

// --- Aim heuristics + preview math helpers ---
export const badAim = (vx:number, vy:number, side:number, onWall:boolean)=>{
  const weak = vy*vy < 8*G && abs(vx*vy) < 6*G;
  return weak || (onWall && vx*side >= 0);
};

// --- Facing resolver (no branches wasted) ---
export const face = (
  prev:1|-1, isCling:boolean, anchored:boolean, aiming:boolean,
  clingSide:number, angle:number, vx:number, L:boolean, R:boolean
):1|-1 =>
  isCling ? (clingSide>=0?1:-1) :
  (aiming && anchored) ? (cos(angle)>=0?1:-1) :
  (L!==R && anchored) ? (R?1:-1) :
  (vx*vx>.0025 ? (vx>=0?1:-1) : prev);

// --- Minimal 3-state FSM: Ground / Fling / Cling ---
export const ST = { G:0, F:1, C:2 } as const;

type CoreInput = { left:boolean; right:boolean; jump:boolean };
const clamp = (n:number,a:number,b:number)=> n<a?a : n>b?b : n;

// Guarded anim setter (prevents timer resets if same)
export const setAnim = (p:any, n:number, name:keyof typeof A)=>{
  if (p._anim === n) return;
  p._anim = n;
  p.setAnimation?.(name);
};

// Enter state
export const enter = (p:any, n:number, useAim?:boolean)=>{
  const b=p.body; p._st=n; p._aim=false;

  if (n===ST.G){
    p._det=0;
    b.gravity=undefined; b.cling=false;
    const dash = Math.abs(b.vel.x)>0.05;
    setAnim(p, dash ? A.dash : A.idle, dash ? "dash" : "idle");
    return;
  }

  if (n===ST.C){
    p._det=0;
    b.grounded=false; b.gravity=0; b.cling=true;
    b.vel.x=0; b.vel.y=0;
    setAnim(p, A.ledge, "ledge");
    p._side = b._touchR? +1 : b._touchL? -1 : (p._side||+1);
    return;
  }

  // ST.F (air)
  p._det = useAim ? 2 : 0;
  b.grounded=false; b.gravity=undefined; b.cling=false;

  if (useAim){
    const a=p._ang, v=p._pow;
    b.vel.x= cos(a)*v; b.vel.y= -sin(a)*v;
    setAnim(p, A.dash, "dash");
    p._pow=p._min;
  } else {
    setAnim(p, b.vel.y>0 ? A.fall : A.jump, b.vel.y>0 ? "fall" : "jump");
  }
};

// Hold jump to aim (wall-anchored if allowed)
export const aim = (p:any, i:CoreInput, onWall:boolean)=>{
  const b=p.body, can = !p._noCling && !p._touchPort && (onWall || p._st===ST.C);
  p._aim=true;
  setAnim(p, can ? A.ledge : A.idle, can ? "ledge" : "idle");
  if (can){ b.gravity=0; b.vel.x=p._side*0.6; b.vel.y=0; } else { b.vel.x=b.vel.y=0; }
  p._ang = clamp(p._ang + (i.left?+p._angStep:0) - (i.right?+p._angStep:0), 0.05, PI-0.05);
  p._pow = clamp(p._pow + p._charge, p._min, p._max);
};

// Pre-physics tick
export const pre = (p:any, i:CoreInput, onWall:boolean)=>{
  const b=p.body, m=Math.abs;
  if (p._st===ST.G){
    (i.jump && (aim(p,i,onWall),1)) ||
    (!i.jump && p._wasJ && p._aim && (enter(p,ST.F,true),1)) ||
    (m(b.vel.x)>0.05 ? setAnim(p, A.dash, "dash") : setAnim(p, A.idle, "idle"));
    return;
  }
  if (p._st===ST.C){
    b.vel.x=p._side*0.6; b.vel.y=0; b.gravity=0;
    (i.jump && (aim(p,i,true),1)) ||
    (!i.jump && p._wasJ && p._aim && (enter(p,ST.F,true),1)) ||
    (p._aim=false, setAnim(p, A.ledge, "ledge"), 1);
    return;
  }
  // ST.F: nothing pre-physics
};

// Post-physics transitions
export const post = (p:any)=>{
  const b=p.body, onWall=!!(b._touchL||b._touchR);

  if (p._noCling>0) p._noCling--;
  if (p._det>0) p._det--;

  if (p._st===ST.F){
    if (b.vel.y>0 && p._anim!==A.fall) setAnim(p, A.fall, "fall");
    (b.grounded && (enter(p,ST.G),1)) ||
    (onWall && !p._det && !p._noCling && !p._touchPort && (b._hitWall|0)!==0 && (enter(p,ST.C),1));
    return;
  }
  if (p._st===ST.G){
    if (!b.grounded) enter(p,ST.F,false);
    else if (p._anim!==A.idle && Math.abs(b.vel.x)<=0.05) setAnim(p, A.idle, "idle");
    return;
  }
  // ST.C
  if (!onWall && !p._aim) enter(p,ST.F,false);
};
