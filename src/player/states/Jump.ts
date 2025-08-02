import type { State } from "./types";

export const Jump: State = {
  enter(p) {
    p.setAnimation("jump");
    p.grounded = false;
    p.vel.y = -p.jumpSpeed;
  },
  update(p, i) {
    const s = p.moveSpeed;
    if (i.left) p.vel.x = -s;
    else if (i.right) p.vel.x = s;
    if (p.grounded) p.setState(i.left || i.right ? "run" : "idle");
  }
};
