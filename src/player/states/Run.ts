// src/player/states/Run.ts
import type { State } from "./types";

export const Run: State = {
  enter(p){ p.setAnimation("dash"); },
  update(p,i){
    // ✅ Only allow aim when grounded
    if (p.grounded && i.jump) { p.aimTick(i); p.vel.x = 0; return; }
    if (p.grounded && !i.jump && p.wasJump && p.aiming) { p.setState("fling"); return; }

    const s = p.moveSpeed;
    p.vel.x = i.left ? -s : i.right ? s : (p.setState("idle"), 0);
  }
};
