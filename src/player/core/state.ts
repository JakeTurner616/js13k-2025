// src/player/core/state.ts
//
// Tiny 3-mode FSM: Ground (G), Fling (F), Cling (C).
// - NO WALK: L/R never translate. They only steer aim while holding jump.
// - Instant cling: on wall touch in F (and not detached) → snap to C.
// - Detach grace only on real flings (useAim=true) to prevent re-cling flicker.
// - p.noCling > 0 disables all cling behavior (used after portal exits).
// - NEW: Never enter cling (or wall-anchor while aiming) if p.touchPortal is true.

import { clamp, cos, sin, PI } from "./math";
import { A } from "./anim";

export const ST = { G:0, F:1, C:2 } as const;

export type CoreInput = { left:boolean; right:boolean; jump:boolean };

const setAnim = (p:any, n:number, name:"idle"|"dash"|"jump"|"fall"|"ledge")=>{
  p.anim = n;
  p.setAnimation?.(name);
};

/** State enter */
export const S = (p:any, n:number, useAim?:boolean)=>{
  const b=p.body; p.st=n; p.aiming=false;

  if (n===ST.G){
    p.detach=0;
    b.gravity=undefined;
    b.cling=false;
    const dash = Math.abs(b.vel.x)>0.05;
    setAnim(p, dash ? A.dash : A.idle, dash ? "dash" : "idle");
    return;
  }

  if (n===ST.C){
    p.detach=0;
    b.grounded=false;
    b.gravity=0;
    b.cling=true;
    b.vel.x=0; b.vel.y=0;             // freeze momentum on enter
    setAnim(p, A.ledge, "ledge");     // correct cling animation
    p.clingSide = b.touchR? +1 : b.touchL? -1 : (p.clingSide||+1);
    return;
  }

  // ST.F (air)
  p.detach = useAim ? 2 : 0;
  b.grounded=false;
  b.gravity=undefined;
  b.cling=false;

  if (useAim){
    const a=p.aimAngle, v=p.aimPower;
    b.vel.x= cos(a)*v; b.vel.y= -sin(a)*v;
    setAnim(p, A.dash, "dash");
    p.aimPower=p.minPower;
  } else {
    setAnim(p, b.vel.y>0 ? A.fall : A.jump, b.vel.y>0 ? "fall" : "jump");
  }
};

/** Hold jump to aim (keeps you anchored on a wall if touching). */
export const aim = (p:any, i:CoreInput, onWall:boolean)=>{
  const b=p.body;
  // wall anchor disabled during noCling OR while inside a portal footprint
  const canWallAnchor = !p.noCling && !p.touchPortal && (onWall || p.st===ST.C);

  p.aiming=true;
  setAnim(p, canWallAnchor ? A.ledge : A.idle, canWallAnchor ? "ledge" : "idle");
  if (canWallAnchor){ b.gravity=0; b.vel.x=p.clingSide*0.6; b.vel.y=0; }
  else { b.vel.x=0; b.vel.y=0; }

  p.aimAngle = clamp(
    p.aimAngle + (i.left?+p.angleStep:0) - (i.right?+p.angleStep:0),
    0.05, PI-0.05
  );
  p.aimPower = clamp(p.aimPower + p.chargeRate, p.minPower, p.maxPower);
};

/** Pre-physics per-state logic (no walking). */
const g = (p:any,i:CoreInput,onWall:boolean)=>{
  const b=p.body, m=Math.abs;
  (i.jump && (aim(p,i,onWall),1)) ||
  (!i.jump && p.wasJump && p.aiming && (S(p,ST.F,true),1)) ||
  setAnim(p, m(b.vel.x)>0.05 ? A.dash : A.idle, m(b.vel.x)>0.05 ? "dash" : "idle");
};

const c = (p:any,i:CoreInput)=>{
  const b=p.body; b.vel.x=p.clingSide*0.6; b.vel.y=0; b.gravity=0;
  (i.jump && (aim(p,i,true),1)) ||
  (!i.jump && p.wasJump && p.aiming && (S(p,ST.F,true),1)) ||
  (p.aiming=false, setAnim(p, A.ledge, "ledge"), 1);
};

const f = (_p:any,_i:CoreInput)=>{};

export const preUpdate = (p:any,i:CoreInput,onWall:boolean)=>
  (p.st===ST.G? g : p.st===ST.C? c : f)(p,i,onWall);

/** Post-physics transitions with tiny detach grace. */
export const postUpdate = (p:any)=>{
  const b=p.body, onWall=!!(b.touchL||b.touchR);

  // decrement anti-cling window
  if (p.noCling>0) p.noCling--;
  if (p.detach>0) p.detach--;

  if (p.st===ST.F){
    if (b.vel.y>0 && p.anim!==A.fall) setAnim(p, A.fall, "fall");

    // Enter Ground OR (enter Cling only if: we moved INTO a wall this tick,
    // not currently overlapping a portal, and cling is not blocked)
    (b.grounded && (S(p,ST.G),1)) ||
    (onWall && !p.detach && !p.noCling && !p.touchPortal && (b.hitWall|0)!==0 && (S(p,ST.C),1));
    return;
  }
  if (p.st===ST.G){
    if (!b.grounded) S(p,ST.F,false);
    else if (p.anim!==A.idle && Math.abs(b.vel.x)<=0.05) setAnim(p, A.idle, "idle");
    return;
  }
  // ST.C — stay clung while aiming; leave only when contact is truly gone.
  if (!onWall && !p.aiming) S(p,ST.F,false);
};
