// src/player/Player.ts
import { applyPhysics, type PhysicsBody } from "./Physics";
import type { AtlasAnimator } from "../animation/AtlasAnimator";
import type { InputState } from "./states/types";

import { cos, sin } from "./core/math";
import { AN } from "./core/anim";
import { ST, preUpdate, postUpdate } from "./core/state";
import { isBadAim, drawAimDots } from "./core/aim";
import { resolveFacing } from "./core/facing";
import { zzfx } from "../engine/audio/SoundEngine";

const DBG = true;
const log = (...a:any[]) => { if (DBG) console.log("[player]", ...a); };

// SFX when a red-arc fling is attempted
const BAD_AIM_SFX: Parameters<typeof zzfx> =
  [7,,15,.1,.01,.04,,.45,,,,,,,,,,.91,.01,,332] as any;

type State = 0|1|2; // ST.G/ST.F/ST.C widened so comparisons don’t get TS2367
export type Player = ReturnType<typeof createPlayer>;

export function createPlayer(atlas: AtlasAnimator){
  const body: PhysicsBody = {
    pos:{x:32,y:32}, vel:{x:0,y:0},
    width:32, height:32,
    hit:{x:8,y:6,w:16,h:24},
    grounded:false
  };

  const p = {
    body, st: ST.G as State, anim: 0, facing: 1 as 1|-1,
    wasJump:false, aiming:false, clingSide:1,
    aimAngle: Math.PI*0.6, aimPower:3.5,
    minPower:2.0, maxPower:8.0, chargeRate:0.14, angleStep: 2*Math.PI/180,
    _clingLock: 0,
    bad:false
  } as any;

  function update(input: Partial<InputState>, ctx:CanvasRenderingContext2D){
    const i:InputState = { left:!!input.left, right:!!input.right, jump:!!input.jump };
    const released = !i.jump && p.wasJump;

    // --- EARLY VETO: if release while arc is red → cancel fling and snap to cling
    {
      const isCling = p.st === ST.C;
      const anchored = body.grounded || isCling;
      if (p.aiming && anchored && released) {
        const vx = cos(p.aimAngle)*p.aimPower;
        const vy = -sin(p.aimAngle)*p.aimPower;
        const onWall = !!(body.touchL || body.touchR) || isCling;
        const bad = isBadAim(vx, vy, p.clingSide, onWall);

        if (bad) {
          // cancel fling completely
          try { zzfx(...BAD_AIM_SFX); } catch {}
          (p as any).setAnimation?.("ledge");
          (p as any).setState?.("cling");

          body.gravity = 0;
          body.cling = true;
          body.vel.x = 0;
          if (body.vel.y < 0) body.vel.y = 0;

          p._clingLock = 2;
          p.aiming = false;
          p.bad = true;
          p.wasJump = false;  // consume release so fling never sees it

          log("RED-ARC RELEASE → cling/ledge (vetoed fling)");
        }
      }
    }

    // === state pre-step
    preUpdate(p, i, !!(body.touchL || body.touchR));

    // physics
    applyPhysics(body, ctx);

    // instant cling on wall hit
    if (!body.grounded && body.hitWall && p.st !== ST.C && p._clingLock === 0) {
      p.clingSide = body.hitWall > 0 ? +1 : -1;
      (p as any).setState?.("cling");
      body.gravity = 0;
      body.cling = true;
      body.vel.x = 0; body.vel.y = 0;
      p._clingLock = 2;
      log("FORCED CLING", "side", p.clingSide, "pos", body.pos.x|0, body.pos.y|0);
      body.hitWall = 0;
    }

    // compute aim validity for UI
    {
      const isCling = p.st === ST.C;
      const anchored = body.grounded || isCling;
      if (p.aiming && anchored) {
        const vx = cos(p.aimAngle)*p.aimPower;
        const vy = -sin(p.aimAngle)*p.aimPower;
        const onWall = !!(body.touchL || body.touchR);
        p.bad = isBadAim(vx, vy, p.clingSide, isCling || onWall);
      } else {
        p.bad = false;
      }
    }

    // state update
    postUpdate(p);

    // fall animation guard
    if (
      p.st === ST.F &&
      !body.grounded &&
      !(body.touchL || body.touchR) &&
      !body.cling &&
      !body.hitWall &&
      body.vel.y > 0
    ) {
      (p as any).setAnimation?.("fall");
      log("fall anim set vy", body.vel.y.toFixed(3));
    }

    // facing resolution
    const isCling2 = p.st === ST.C;
    const anchored2 = body.grounded || isCling2;
    p.facing = resolveFacing(
      p.facing, isCling2, anchored2, p.aiming, p.clingSide, p.aimAngle, body.vel.x, i.left, i.right
    );

    if (p._clingLock > 0) p._clingLock--;
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

    // draw aim arc
    const isCling = p.st === ST.C;
    const anchored = body.grounded || isCling;
    if (p.aiming && anchored) {
      const px = body.pos.x + body.width*.5, py = body.pos.y + body.height*.5;
      const vx = cos(p.aimAngle)*p.aimPower, vy = -sin(p.aimAngle)*p.aimPower;
      const onWall = !!(body.touchL || body.touchR);
      const badNow = p.bad || isBadAim(vx, vy, p.clingSide, isCling || onWall);
      drawAimDots(ctx, px, py, vx, vy, badNow);
    }
  }

  return { body, update, draw };
}
