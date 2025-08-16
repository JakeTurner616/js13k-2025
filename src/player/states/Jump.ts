// src/player/states/Jump.ts
import type { State } from "./types";

export const Jump: State = {
  enter(p){
    // legacy jump (kept for now)
    p.setAnimation("jump");
    p.grounded = false;
    p.vel.y = -p.jumpSpeed;
  },
  update(p,i){
    // legacy mid-air control (optional until removed)
    const s = p.moveSpeed;
    if (i.left) p.vel.x = -s; else if (i.right) p.vel.x = s;

    if (p.vel.y > 0 && p.anim.getCurrent() !== "fall") p.setAnimation("fall");

    // manual cling: if on wall & holding Space → cling
    if ((p.body.touchL || p.body.touchR) && i.jump) { p.setState("cling"); return; }

    if (p.grounded) p.setState(i.left || i.right ? "run" : "idle");
  }
};
