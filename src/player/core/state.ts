// src/player/core/state.ts
//
// Tiny 3-mode FSM for the player:
//
//   G = Ground   (feet on floor; normal movement)
//   F = Fling    (airborne / ballistic; gravity applies)
//   C = Cling    (latched to a vertical wall; gravity suppressed)
//
// DESIGN GOALS
// 1) “Glue on first touch” — the very first frame you touch a wall in air, you
//    immediately enter Cling (no bounce, no 1-frame “fall” flash).
// 2) Aiming is stable while clung — holding Jump keeps you anchored and charges aim.
// 3) Minimal states and tiny transitions — small, predictable, de-flickered.
//
// KEY FLAGS PROVIDED BY PHYSICS (read every frame here):
// - body.touchL / body.touchR : contact with left/right wall tiles
// - body.grounded             : feet on ground (set by vertical sweep)
// - body.gravity              : when set to 0 we suppress gravity in physics
//
// IMPORTANT ORDERING NOTE (the old flicker bug):
//   Previously we sometimes set the “fall” animation *before* noticing wall contact,
//   so a fast wall hit would show a frame of “fall” and then switch to “ledge”.
//   The fix is to short-circuit in postUpdate(): if we’re in air and see a wall,
//   switch to Cling immediately, BEFORE touching the “fall” animation.

import { clamp, cos, sin, PI } from "./math";
import { A } from "./anim";

// Public state enum (frozen for nice inlining by Terser)
export const ST = { G:0, F:1, C:2 } as const;   // Ground, Fling, Cling

// Horizontal ground move speed (small & readable; tweak to taste)
const MOVE = 1.5;

export type CoreInput = { left:boolean; right:boolean; jump:boolean };

/**
 * Universal state setter.
 * Handles all enter-time side effects (gravity mode, zeroing vels, animation pick).
 *
 * `useAim=true` only when launching a real fling (Space release).
 * We do NOT use any “detach” grace — we want instant re-cling on wall contact.
 */
export const S = (p:any, n:number, useAim?:boolean)=>{
  const b=p.body;         // local alias; terser will shrink keys across files
  p.st=n;                 // commit the new state
  p.aiming=false;         // default: not aiming unless we say so

  if (n===ST.G){
    // Ground: normal gravity; pick idle/dash by horizontal speed.
    // No detach; walking off edges should re-cling instantly on next wall.
    p.detach=0;
    b.gravity=undefined;
    p.anim=Math.abs(b.vel.x)>0.05?A.dash:A.idle;
    return;
  }

  if (n===ST.C){
    // CLING (instant glue):
    // - kill motion so there is zero rebound look
    // - freeze gravity so physics won’t pull us down
    // - face the wall we’re touching
    p.detach=0;
    b.grounded=false;
    b.gravity=0;
    b.vel.x=0;
    b.vel.y=0;
    p.anim=A.ledge;
    p.clingSide = b.touchR ? 1 : b.touchL ? -1 : (p.clingSide || 1);
    return;
  }

  // ST.F — Airborne / Fling
  // No detach grace. Any wall contact should cling this same frame (postUpdate handles it).
  p.detach=0;
  b.grounded=false;
  b.gravity=undefined;

  if (useAim){
    // Launch a proper fling (Space released after charging)
    const a=p.aimAngle, v=p.aimPower;
    b.vel.x= cos(a)*v;
    b.vel.y=-sin(a)*v;
    p.anim=A.dash;
    p.aimPower=p.minPower;    // reset charge for next time
  } else {
    // Became airborne without a fling (walk-off, knock, etc.)
    p.anim=b.vel.y>0?A.fall:A.jump;
  }
};

/**
 * Aim while holding Jump.
 * If we’re on a wall, keep a tiny push into it to preserve tile contact and prevent
 * a “micro-detach” stutter while charging.
 */
export const aim = (p:any, i:CoreInput, onWall:boolean)=>{
  const b=p.body, wall=onWall||p.st===ST.C;
  p.aiming=true;
  p.anim = wall ? A.ledge : A.idle;  // cling pose if anchored to wall
  if (wall){
    b.gravity=0;                     // stay frozen on wall
    b.vel.x=p.clingSide*0.6;         // tiny press into wall keeps collision latched
    b.vel.y=0;
  } else {
    b.vel.x=0; b.vel.y=0;
  }
  p.aimAngle=clamp(p.aimAngle + (i.left?+p.angleStep:0) - (i.right?+p.angleStep:0), 0.05, PI-0.05);
  p.aimPower=clamp(p.aimPower + p.chargeRate, p.minPower, p.maxPower);
};

// --- Per-mode pre-physics logic (tiny, branchless style) --------------------

const g = (p:any,i:CoreInput,onWall:boolean)=>{
  const b=p.body, s=MOVE, m=Math.abs;
  // Hold = aim; Release edge = fling; else ground move
  (i.jump && (aim(p,i,onWall),1))
  || (!i.jump && p.wasJump && p.aiming && (S(p,ST.F,true),1))
  || (b.vel.x=i.left?-s:i.right?s:0, p.anim=m(b.vel.x)>0.05?A.dash:A.idle);
};

const c = (p:any,i:CoreInput)=>{
  const b=p.body;
  // While clung, hold to aim (stays clung); release to fling
  b.vel.x=p.clingSide*0.6; b.vel.y=0; b.gravity=0;
  (i.jump && (aim(p,i,true),1))
  || (!i.jump && p.wasJump && p.aiming && (S(p,ST.F,true),1))
  || (p.aiming=false,1);
};

const f = (_p:any,_i:CoreInput)=>{ /* airborne pre-physics is trivial */ };

/** Call before physics each frame */
export const preUpdate = (p:any,i:CoreInput,onWall:boolean)=>
  (p.st===ST.G? g : p.st===ST.C? c : f)(p,i,onWall as any);

// --- Post-physics transitions (the critical ordering lives here) ------------

/**
 * postUpdate:
 * Run AFTER physics so contact flags (touchL/touchR/grounded) are authoritative.
 *
 * The ordering below is deliberate to prevent the “one-frame fall flicker”:
 *  1) If airborne and touching a wall ⇒ immediately Cling (and pick ledge anim).
 *  2) Else if airborne and grounded    ⇒ Ground.
 *  3) Else if still airborne           ⇒ MAY set fall anim (only now).
 */
export const postUpdate = (p:any)=>{
  const b=p.body;
  const onWall = !!(b.touchL || b.touchR);

  if (p.st===ST.F){
    // 1) CLING WINS — early out to avoid any stale “fall” write this frame
    if (onWall) { S(p,ST.C); return; }

    // 2) Then ground, if any
    if (b.grounded) { S(p,ST.G); return; }

    // 3) Still truly in air — it’s finally safe to show “fall”
    if (b.vel.y>0 && p.anim!==A.fall) p.anim=A.fall;
    return;
  }

  if (p.st===ST.G){
    // Lost ground? You’re flying now (no detach grace)
    if (!b.grounded) S(p,ST.F,false);
    return;
  }

  // ST.C (Cling)
  // If contact genuinely lost and we’re not aiming, drop to air.
  if (!onWall && !p.aiming) S(p,ST.F,false);
};
