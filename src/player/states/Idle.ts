// src/player/states/Idle.ts
import type { State, InputState } from "./types";

export const Idle: State = {
  enter(p){ p.setAnimation("idle"); p.vel.x = 0; },
  update(p, i:InputState){
    // ground aiming / release-to-fling
    if (i.jump && p.grounded) { p.aimTick(i); return; }
    if (!i.jump && p.wasJump && p.grounded && p.aiming) { p.setState("fling"); return; }

    if (i.left || i.right) p.setState("run");
  }
};
