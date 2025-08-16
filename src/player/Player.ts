// src/player/Player.ts
import { applyPhysics, type PhysicsBody } from "./Physics";
import type { AtlasAnimator } from "../animation/AtlasAnimator";
import type { InputState } from "./states/types";

import { cos, sin } from "./core/math";
import { AN } from "./core/anim";
import { ST, preUpdate, postUpdate } from "./core/state";
import { isBadAim, drawAimDots } from "./core/aim";
import { resolveFacing } from "./core/facing";

type State = 0|1|2; // ST.G/ST.F/ST.C widened so comparisons don’t get TS2367

export type Player = ReturnType<typeof createPlayer>;

export function createPlayer(atlas: AtlasAnimator){
  const body: PhysicsBody = {
    pos:{x:32,y:32}, vel:{x:0,y:0},
    width:32, height:32,
    hit:{x:8,y:6,w:16,h:24},
    grounded:false
  };

  // core bag (minifier will shrink keys across modules)
  const p = {
    body, st: ST.G as State, anim: 0, facing: 1 as 1|-1,
    wasJump:false, aiming:false, clingSide:1,
    aimAngle: Math.PI*0.6, aimPower:3.5,
    minPower:2.0, maxPower:8.0, chargeRate:0.14, angleStep: 2*Math.PI/180
  };

  function update(input: Partial<InputState>, ctx:CanvasRenderingContext2D){
    const i:InputState = { left:!!input.left, right:!!input.right, jump:!!input.jump };
    const onWall = !!(body.touchL || body.touchR);

    preUpdate(p, i, onWall);
    applyPhysics(body, ctx);
    postUpdate(p);

    const isCling = p.st === ST.C;
    const anchored = body.grounded || isCling;

    // slimmer API: (prev, isCling, anchored, aiming, clingSide, angle, vx, L, R)
    p.facing = resolveFacing(
      p.facing, isCling, anchored, p.aiming, p.clingSide, p.aimAngle, body.vel.x, i.left, i.right
    );

    p.wasJump = i.jump;
  }

  function draw(ctx:CanvasRenderingContext2D, t:number){
    const name = AN[p.anim];
    const m = atlas.getMeta(name);
    const frame = ((t*.001)*((m?.fps)||6) | 0) % ((m?.frameCount)||1);

    const flip = p.facing < 0;
    ctx.save();
    if (flip) ctx.scale(-1,1);
    atlas.drawFrame(ctx, name, frame, flip ? -body.pos.x - body.width : body.pos.x, body.pos.y);
    ctx.restore();

    const isCling = p.st === ST.C;
    const anchored = body.grounded || isCling;
    if (p.aiming && anchored){
      const px = body.pos.x + body.width*.5, py = body.pos.y + body.height*.5;
      const vx = cos(p.aimAngle)*p.aimPower,  vy = -sin(p.aimAngle)*p.aimPower;
      const onWall = !!(body.touchL || body.touchR);
      const bad = isBadAim(vx, vy, p.clingSide, isCling || onWall);
      drawAimDots(ctx, px, py, vx, vy, bad);
    }
  }

  return { body, update, draw };
}
