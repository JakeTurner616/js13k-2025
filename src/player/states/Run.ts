import type { State } from "./types";

export const Run: State = {
  enter(p) { p.setAnimation("run"); },
  update(p, i) {
    const s = p.moveSpeed;
    p.vel.x = i.left ? -s : i.right ? s : (p.setState("idle"), 0);
    if (i.jump) p.vel.y = -p.jumpSpeed, p.setState("jump");
  }
};
