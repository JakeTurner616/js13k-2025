// src/player/states/Cling.ts
import type { State } from "./types";

const DBG = true;
const log = (...a:any[]) => { if (DBG) console.log("[cling]", ...a); };

// Cling: anchors immediately; Space to aim, release to fling.
export const Cling: State = {
  enter(p){
    p.setAnimation("ledge");
    p.aiming = false;
    p.grounded = false;
    p.clingSide = p.body.touchR ? +1 : p.body.touchL ? -1 : (p.clingSide || +1);
    p.body.gravity = 0;
    p.body.cling = true;
    p.vel.x = 0; p.vel.y = 0;
    log("enter", "side", p.clingSide, "touchL/R", !!p.body.touchL, !!p.body.touchR);
  },
  update(p,i){
    const onWall = p.body.touchL || p.body.touchR;
    p.vel.x = (onWall ? p.clingSide : p.clingSide) * 1.0;
    p.vel.y = 0;

    if (!onWall) log("lost wall contact?", "touchL/R", !!p.body.touchL, !!p.body.touchR);

    if (i.jump) { p.aimTick(i); log("aiming"); return; }
    if (!i.jump && p.wasJump && p.aiming) { log("fling!"); p.setState("fling"); return; }
    p.aiming = false;
  },
  exit(p){
    p.body.gravity = undefined;
    p.body.cling = false;
    p.vel.x = 0;
    p.aiming = false;
    log("exit");
  }
};
