// src/engine/scenes/background/PortalSystem.ts
// Keeps: input, raycast spawn, sprite portals, side/orientation, velocity transform.
// Drops: pixel masks, hysteresis, player collide toggles, pMask plumbing.
// Uses a tiny cooldown to avoid instant re-entry.

import { createPortalManager, createPortalGun, type PortalKind, PORTAL_W, PORTAL_H } from "../../objects/portals/Portals";
import { tb, fb, pushByHit, s2w } from "./sceneUtils";
import { getCurrentMap } from "../../renderer/level-loader";
import { zzfx } from "../../audio/SoundEngine";
import { port } from "../../../sfx/port";
import type { Player } from "../../../player/Player";
import type { Cam } from "../../camera/Camera";

const TILE = 16;
const { cos, sin, max } = Math;

type PL = { x:number; y:number; angle:number; o:"R"|"L"|"U"|"D" };

export class PortalSystem {
  readonly portals = createPortalManager(TILE);
  readonly portalGun = createPortalGun(TILE);
  private player: Player | null = null;
  private onDown?: (e: MouseEvent) => void;

  // simple re-entry guard (frames)
  private cool = 0;

  setPlayer(p: Player | null) { this.player = p; }
  setAnimator(a: any) { this.portals.setAnimator(a); }

  clear() {
    this.portals.clear();
    (this.portalGun as any).clear?.();
    this.cool = 0;
  }

  attachInput(k: HTMLCanvasElement, cam: Cam) {
    k.oncontextmenu = e => e.preventDefault();
    this.onDown = e => {
      const m = getCurrentMap(); if (!m) return;
      const { wx, wy } = s2w(e.clientX, e.clientY, k, cam);
      const pl = this.player, bx = pl ? pl.body.pos.x + pl.body.width  * .5 : wx;
      const by = pl ? pl.body.pos.y + pl.body.height * .5 : wy;
      this.portalGun.spawn((e.button === 2 ? "B" : "A") as PortalKind, bx, by, wx - bx, wy - by, m, k.height);
    };
    k.addEventListener("mousedown", this.onDown);
  }
  detachInput(k: HTMLCanvasElement) {
    if (this.onDown) k.removeEventListener("mousedown", this.onDown), this.onDown = undefined;
    k.oncontextmenu = null;
  }

  private rotLocal(p: PL, px:number, py:number){
    const ca = cos(-p.angle), sa = sin(-p.angle);
    const dx = px - p.x, dy = py - p.y;
    return { lx: dx*ca - dy*sa, ly: dx*sa + dy*ca };
  }
  private centerInEllipse(p: PL, cx:number, cy:number, hw:number, hh:number){
    // center + a small bias along portal axis to be generous
    const { lx, ly } = this.rotLocal(p, cx, cy);
    const rx = PORTAL_W * .48 + ((p.o==="R"||p.o==="L") ? hw*.35 : 0);
    const ry = PORTAL_H * .46 + ((p.o==="U"||p.o==="D") ? hh*.35 : 0);
    const nx = lx / rx, ny = ly / ry;
    return nx*nx + ny*ny <= 1;
  }

  private teleportIfInside() {
    const S = this.portals.getSlots(), pl = this.player;
    if (!(pl && S.A && S.B)) return;
    if (this.cool > 0) { this.cool--; return; }

    const b:any = pl.body;
    const hb = b.hit ?? {x:0,y:0,w:b.width,h:b.height};
    const cx = b.pos.x + b.width*.5, cy = b.pos.y + b.height*.5;
    const hw=(hb.w*.5)|0, hh=(hb.h*.5)|0;

    const inA = this.centerInEllipse(S.A, cx, cy, hw, hh);
    const inB = !inA && this.centerInEllipse(S.B, cx, cy, hw, hh);
    if(!(inA||inB)) return;

    const ent = inA ? S.A : S.B!;   // entered
    const ext = inA ? S.B! : S.A!;  // exit

    // reflect velocity across portal normal and map basis A->B
    const lv = tb(b.vel.x, b.vel.y, ent.o);
    const re = fb(-lv.n, lv.t, ext.o);

    // push out relative to exit portal plane (no collide toggles)
    const k = pushByHit(ext.o, hw, hh, 2);
    const px = ext.x + k.dx, py = ext.y + k.dy;

    // apply transform
    b.pos.x += px - cx; b.pos.y += py - cy;
    b.vel.x = re.vx;    b.vel.y = re.vy;
    b.grounded = false; b.touchL = b.touchR = false; b.hitWall = 0;

    try{ zzfx?.(...(port as unknown as number[])); }catch{}

    // small cooldown to prevent immediate re-entry thrash
    this.cool = 8; // ~8 ticks @60Hz
  }

  tick() {
    this.portalGun.update(1/60, (k:PortalKind, x:number, y:number, a:number, o:"R"|"L"|"U"|"D") =>
      this.portals.replaceWorld(k, x, y, a, o)
    );
    this.teleportIfInside();
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    this.portalGun.draw(ctx);
    this.portals.draw(ctx, t);
  }
}
