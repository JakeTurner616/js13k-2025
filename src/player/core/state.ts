// src/player/core/state.ts
//
// Tiny 3-mode FSM: Ground (G), Fling (F), Cling (C).
// - NO WALK: L/R never translate. They only steer aim while holding jump.
// - Instant cling: on wall touch in F (and not detached) → snap to C.
// - Detach grace only on real flings (useAim=true) to prevent re-cling flicker.

import { clamp, cos, sin, PI } from "./math";
import { A } from "./anim";

export const ST = { G:0, F:1, C:2 } as const;

export type CoreInput = { left:boolean; right:boolean; jump:boolean };

/** State enter */
export const S = (p:any, n:number, useAim?:boolean)=>{
  const b=p.body; p.st=n; p.aiming=false;

  if (n===ST.G){
    p.detach=0; b.gravity=undefined;
    p.anim = Math.abs(b.vel.x)>0.05 ? A.dash : A.idle; // dash only if sliding from physics
    return;
  }

  if (n===ST.C){
    p.detach=0; b.grounded=false; b.gravity=0; b.vel.x=0; b.vel.y=0;
    p.anim=A.ledge;
    p.clingSide = b.touchR? +1 : b.touchL? -1 : (p.clingSide||+1);
    return;
  }

  // ST.F (air)
  p.detach = useAim ? 2 : 0;
  b.grounded=false; b.gravity=undefined;

  if (useAim){
    const a=p.aimAngle, v=p.aimPower;
    b.vel.x= cos(a)*v; b.vel.y= -sin(a)*v;
    p.anim=A.dash; p.aimPower=p.minPower;
  } else {
    p.anim = b.vel.y>0 ? A.fall : A.jump;
  }
};

/** Hold jump to aim (keeps you anchored on a wall if touching). */
export const aim = (p:any, i:CoreInput, onWall:boolean)=>{
  const b=p.body, wall=onWall||p.st===ST.C;
  p.aiming=true; p.anim = wall ? A.ledge : A.idle;
  if (wall){ b.gravity=0; b.vel.x=p.clingSide*0.6; b.vel.y=0; } // tiny push into wall to stay latched
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
  (p.anim = m(b.vel.x)>0.05 ? A.dash : A.idle); // animation follows residual slide only
};

const c = (p:any,i:CoreInput)=>{
  const b=p.body; b.vel.x=p.clingSide*0.6; b.vel.y=0; b.gravity=0;
  (i.jump && (aim(p,i,true),1)) ||
  (!i.jump && p.wasJump && p.aiming && (S(p,ST.F,true),1)) ||
  (p.aiming=false,1);
};

const f = (_p:any,_i:CoreInput)=>{};

export const preUpdate = (p:any,i:CoreInput,onWall:boolean)=>
  (p.st===ST.G? g : p.st===ST.C? c : f)(p,i,onWall);

/** Post-physics transitions with tiny detach grace. */
export const postUpdate = (p:any)=>{
  const b=p.body, onWall=!!(b.touchL||b.touchR);
  if (p.detach>0) p.detach--;

  if (p.st===ST.F){
    if (b.vel.y>0 && p.anim!==A.fall) p.anim=A.fall; // only if staying in F
    (b.grounded && (S(p,ST.G),1)) || (onWall && !p.detach && (S(p,ST.C),1));
    return;
  }
  if (p.st===ST.G){
    if (!b.grounded) S(p,ST.F,false);
    return;
  }
  // ST.C — stay clung while aiming; leave only when contact is truly gone.
  if (!onWall && !p.aiming) S(p,ST.F,false);
};
