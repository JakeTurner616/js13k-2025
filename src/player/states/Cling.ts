// src/player/states/Cling.ts
export const Cling: State = {
  enter(p){
    p.setAnimation("ledge");
    p.aiming = false;
    p.grounded = false;
    p.clingSide = p.body.touchR ? +1 : p.body.touchL ? -1 : (p.clingSide || +1);
    p.body.gravity = 0;
    p.body.cling = true;            // ← mark cling for slide cap logic
    p.vel.x = 0; p.vel.y = 0;
  },
  update(p,i){
    const onWall = p.body.touchL || p.body.touchR;
    // stronger glue so you “snap” on touch
    p.vel.x = (onWall ? p.clingSide : p.clingSide) * 1.0;  // was 0.6
    p.vel.y = 0;

    if (i.jump) { p.aimTick(i); return; }
    if (!i.jump && p.wasJump && p.aiming) { p.setState("fling"); return; }
    p.aiming = false;
  },
  exit(p){
    p.body.gravity = undefined;
    p.body.cling = false;           // ← reset
    p.vel.x = 0;
    p.aiming = false;
  }
};
