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
    // tightened hitbox (smaller margins for more accurate contact/portals)
    hit:{x:9,y:8,w:14,h:20},
    grounded:false
  };

  const p = {
    body, st: ST.G as State, anim: 0, facing: 1 as 1|-1,
    wasJump:false, aiming:false, clingSide:1,
    aimAngle: Math.PI*0.6, aimPower:3.5,
    minPower:2.0, maxPower:8.0, chargeRate:0.14, angleStep: 2*Math.PI/180,
    bad:false,
    detach: 0,
    noCling: 0,                 // frames to block *entering* cling (e.g., after teleport)
    portalContact: 0,           // countdown: frames of portal overlap
    touchPortal: false,         // derived each frame from portalContact
    setAnimation: undefined as undefined | ((name:"idle"|"dash"|"jump"|"fall"|"ledge")=>void)
  } as any;

  // External helpers (call from portal/teleport system)
  function setTouchingPortal(active:boolean, frames=2){
    p.portalContact = active ? Math.max(frames|0, 1) : 0;
  }

  function update(input: Partial<InputState>, ctx:CanvasRenderingContext2D){
    const i:InputState = { left:!!input.left, right:!!input.right, jump:!!input.jump };
    const released = !i.jump && p.wasJump;

    // Decay & derive portal contact flag
    if (p.portalContact>0) p.portalContact--;
    p.touchPortal = p.portalContact>0;

    // 1) early veto: if releasing while red (based on last frame contacts), eat release (no queue)
    if (p.aiming && (body.grounded || p.st === ST.C) && released) {
      const vx = cos(p.aimAngle)*p.aimPower;
      const vy = -sin(p.aimAngle)*p.aimPower;
      const onWall = !!(body.touchL || body.touchR) || p.st === ST.C;
      if (isBadAim(vx, vy, p.clingSide, onWall)) {
        try { zzfx(...BAD_AIM_SFX); } catch {}
        p.bad = true;
        p.wasJump = false; // consume release so Cling.update can't fling/queue
        log("RED-ARC RELEASE vetoed (no queue)");
      }
    }

    // 2) state pre-step (runs current state's pre-logic)
    preUpdate(p, i, !!(body.touchL || body.touchR));

    // 3) physics (populates touch flags + hitWall)
    applyPhysics(body, ctx);

    // 5) compute aim “bad” flag for UI (use current frame contacts)
    {
      const anchored = body.grounded || p.st === ST.C;
      if (p.aiming && anchored) {
        const vx = cos(p.aimAngle)*p.aimPower;
        const vy = -sin(p.aimAngle)*p.aimPower;
        const onWall = !!(body.touchL || body.touchR);
        p.bad = isBadAim(vx, vy, p.clingSide, (p.st === ST.C) || onWall);
      } else {
        p.bad = false;
      }
    }

    // 6) state post-step (transitions/animations are owned by the FSM)
    postUpdate(p);

    // 7) facing resolution
    const anchored2 = body.grounded || p.st === ST.C;
    p.facing = resolveFacing(
      p.facing, p.st === ST.C, anchored2, p.aiming, p.clingSide, p.aimAngle, body.vel.x, i.left, i.right
    );

    // 8) store edge
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

    // draw aim arc (red if bad)
    const anchored = body.grounded || p.st === ST.C;
    if (p.aiming && anchored) {
      const px = body.pos.x + body.width*.5, py = body.pos.y + body.height*.5;
      const vx = cos(p.aimAngle)*p.aimPower,  vy = -sin(p.aimAngle)*p.aimPower;
      const onWall = !!(body.touchL || body.touchR);
      drawAimDots(ctx, px, py, vx, vy, p.bad || isBadAim(vx, vy, p.clingSide, (p.st === ST.C) || onWall));
    }
  }

  // Called after a teleport: block only *entering* cling briefly and mark portal overlap.
  function onTeleported(_exitO:"R"|"L"|"U"|"D"){
    body.grounded = false;
    body.touchL = false;
    body.touchR = false;
    body.gravity = undefined;
    body.cling = false;
    p.aiming = false;

    p.detach = 4;           // prevents ST.F → ST.C snap for a couple frames
    p.noCling = 8;          // do not ENTER cling briefly (doesn't affect existing C)
    setTouchingPortal(true, 3); // treat as overlapping portal right after exit

    p.st = ST.F as State;
  }

  return { body, update, draw, onTeleported, setTouchingPortal };
}
