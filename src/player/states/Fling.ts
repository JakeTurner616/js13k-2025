// src/player/states/Fling.ts
import type { State } from "./types";

// Ballistic flight only; exits to ground or wall.
export const Fling: State = {
  enter(p){
    // launch from current aim; gravity ON
    const a = p.aimAngle, v = p.aimPower, b = p.body;
    p.aiming = false;            // ✅ hide arc immediately on launch
    b.gravity = undefined;
    b.grounded = false;
    b.vel.x =  Math.cos(a) * v;
    b.vel.y = -Math.sin(a) * v;
    p.setAnimation("dash");
    p.aimPower = p.minPower;
  },
  update(p){
    // 🚨 PRIORITIZE WALL CLING FIRST (prevents dash→fall→ledge flicker)
    if (p.body.touchL || p.body.touchR) {
      if (p.anim.getCurrent() !== "ledge") p.setAnimation("ledge");
      p.setState("cling");
      return;
    }

    // Then handle landing…
    if (p.grounded) { p.setAnimation("idle"); p.setState("idle"); return; }

    // …and only then switch to fall while airborne
    if (p.vel.y > 0 && p.anim.getCurrent() !== "fall") p.setAnimation("fall");
  }
};
