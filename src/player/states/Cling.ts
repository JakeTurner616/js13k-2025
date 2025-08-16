// src/player/states/Cling.ts
import type { State } from "./types";

// Cling: only launches on Space release if we were aiming; keeps you anchored.
export const Cling: State = {
  enter(p){
    p.setAnimation("ledge");
    p.aiming = false;
    p.grounded = false;                 // not “grounded” while on wall
    p.clingSide = p.body.touchR ? +1 : p.body.touchL ? -1 : (p.clingSide || +1);
    p.body.gravity = 0;                 // freeze vertical
    p.vel.x = 0; p.vel.y = 0;
  },
  update(p,i){
    const onWall = p.body.touchL || p.body.touchR;

    // Maintain contact with a tiny horizontal push into the wall
    p.vel.x = (onWall ? p.clingSide : p.clingSide) * 0.6;
    p.vel.y = 0;

    // Hold Space → aim (arc drawn by Player.draw); Release edge → FLING
    if (i.jump) { p.aimTick(i); return; }
    if (!i.jump && p.wasJump && p.aiming) { p.setState("fling"); return; }

    // Not aiming this frame; keep clung but don’t render arc
    p.aiming = false;
  },
  exit(p){
    p.body.gravity = undefined; // restore gravity
    p.vel.x = 0;
    p.aiming = false;           // ensure arc hides
  }
};
