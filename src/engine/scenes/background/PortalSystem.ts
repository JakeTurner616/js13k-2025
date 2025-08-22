// src/engine/scenes/background/PortalSystem.ts
// Soft anti-collider (asymmetric hysteresis) + hard pixel-mask teleport.

import { createPortalManager, createPortalGun, type PortalKind, PORTAL_W, PORTAL_H } from "../../objects/portals/Portals";
import { tb, fb, pushByHit, s2w } from "./sceneUtils";
import { getCurrentMap } from "../../renderer/level-loader";
import { zzfx } from "../../audio/SoundEngine";
import { port } from "../../../sfx/port";
import type { Player } from "../../../player/Player";
import type { Cam } from "../../camera/Camera";

const TILE = 16;
const { cos, sin, round } = Math;

type PortalLike = { x:number; y:number; angle:number; o:"R"|"L"|"U"|"D" };

export class PortalSystem {
  readonly portals = createPortalManager(TILE);
  readonly portalGun = createPortalGun(TILE);
  private player: Player | null = null;
  private onDown?: (e: MouseEvent) => void;

  // pixel-hull (hard) mask history bits: A=1, B=2
  private prevHardMask = 0;
  // soft hysteresis active bits: A=1, B=2
  private softActiveMask = 0;

  setPlayer(p: Player | null) { this.player = p; }
  setAnimator(a: any) { this.portals.setAnimator(a); }

  clear() {
    this.portals.clear();
    (this.portalGun as any).clear?.();
    this.prevHardMask = this.softActiveMask = 0;
    const pl = this.player;
    if (pl) {
      (pl.body as any).pMask = 0;
      (pl as any).setTouchingPortal?.(false);
      pl.body.collide = true;
    }
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

  // --- tiny helpers ----------------------------------------------------------
  private rotLocal(p: PortalLike, px:number, py:number){
    const ca = cos(-p.angle), sa = sin(-p.angle);
    const dx = px - p.x, dy = py - p.y;
    return { lx: dx*ca - dy*sa, ly: dx*sa + dy*ca };
  }
  private softEllipse(p: PortalLike, bx:number,by:number,bw:number,bh:number, rxBase:number, ryBase:number, growX=0, growY=0){
    const cx = bx + bw * .5, cy = by + bh * .5;
    const { lx, ly } = this.rotLocal(p, cx, cy);
    const rx = (p.o === "R" || p.o === "L") ? (rxBase + growX) : rxBase;
    const ry = (p.o === "U" || p.o === "D") ? (ryBase + growY) : ryBase;
    const nx = lx / rx, ny = ly / ry;
    return nx*nx + ny*ny <= 1;
  }
  private insideSoftEnter(p:PortalLike, bx:number,by:number,bw:number,bh:number){
    // generous ellipse, grow by half extents along the aligned axis
    const hw=bw*.5, hh=bh*.5;
    return this.softEllipse(p, bx,by,bw,bh, PORTAL_W*0.54, PORTAL_H*0.58, hw, hh);
  }
  private insideSoftExit(p:PortalLike, bx:number,by:number,bw:number,bh:number){
    // tighter ellipse, smaller growth
    const hw=bw*.25, hh=bh*.25;
    return this.softEllipse(p, bx,by,bw,bh, PORTAL_W*0.46, PORTAL_H*0.48, hw, hh);
  }

  // pixel-precise check against union hull
  private insideHard(p:PortalLike, bx:number,by:number,bw:number,bh:number){
    const fm = this.portals.getFootprintMask();
    if (fm.bbox.x1 < fm.bbox.x0) return false;

    const STEP = 2, HIT_MIN = 3;
    const x0 = bx, x1 = bx + bw, y0 = by, y1 = by + bh;
    let hits = 0;

    for (let sy = y0; sy < y1; sy += STEP){
      for (let sx = x0; sx < x1; sx += STEP){
        const { lx, ly } = this.rotLocal(p, sx, sy);
        const mx = (lx + fm.w * 0.5) | 0;
        const my = (ly + fm.h * 0.5) | 0;
        if (mx < fm.bbox.x0 || mx > fm.bbox.x1 || my < fm.bbox.y0 || my > fm.bbox.y1) continue;
        if (mx < 0 || my < 0 || mx >= fm.w || my >= fm.h) continue;
        if (fm.data[my * fm.w + mx] && ++hits >= HIT_MIN) return true;
      }
    }
    return false;
  }

  // --- main behavior ---------------------------------------------------------
  private tele() {
    const S = this.portals.getSlots(), pl = this.player;
    if (!(pl && S.A && S.B)) {
      (pl as any)?.setTouchingPortal?.(false);
      if (pl) (pl.body as any).pMask = 0;
      this.prevHardMask = this.softActiveMask = 0;
      return;
    }

    const b:any = pl.body;
    const hb = b.hit ?? {x:0,y:0,w:b.width,h:b.height};
    const bx = (b.pos.x + hb.x)|0, by = (b.pos.y + hb.y)|0, bw = hb.w|0, bh = hb.h|0;
    const cx = b.pos.x + b.width*.5, cy = b.pos.y + b.height*.5;

    // ----- SOFT hysteresis (enter on outer, exit when outside inner) -----
    const enterBits =
      (this.insideSoftEnter(S.A, bx,by,bw,bh) ? 1 : 0) |
      (this.insideSoftEnter(S.B, bx,by,bw,bh) ? 2 : 0);

    let keepBits = 0;
    if (this.softActiveMask & 1) keepBits |= (this.insideSoftExit(S.A, bx,by,bw,bh) ? 1 : 0);
    if (this.softActiveMask & 2) keepBits |= (this.insideSoftExit(S.B, bx,by,bw,bh) ? 2 : 0);

    this.softActiveMask = enterBits | keepBits;
    b.pMask = this.softActiveMask;
    (pl as any).setTouchingPortal?.(this.softActiveMask !== 0, 2);

    // ----- HARD pixel mask (edge-trigger) -----
    const hardMask =
      (this.insideHard(S.A, bx,by,bw,bh) ? 1 : 0) |
      (this.insideHard(S.B, bx,by,bw,bh) ? 2 : 0);

    const enterA = !!(hardMask & 1) && !(this.prevHardMask & 1);
    const enterB = !!(hardMask & 2) && !(this.prevHardMask & 2);
    if (!(enterA || enterB)) { this.prevHardMask = hardMask; return; }

    const ent = enterA ? S.A : S.B!, ext = enterA ? S.B! : S.A!;
    const lv = tb(b.vel.x, b.vel.y, ent.o);
    const re = fb(-lv.n, lv.t, ext.o);

    const hw=(hb.w*.5)|0, hh=(hb.h*.5)|0;
    const k = pushByHit(ext.o, hw, hh, 2);
    const px = ext.x + k.dx, py = ext.y + k.dy;

    b.pos.x += px - cx;
    b.pos.y += py - cy;
    b.vel.x = re.vx; b.vel.y = re.vy;
    b.grounded = b.touchL = b.touchR = false; b.hitWall = 0;

    zzfx?.(...(port as unknown as number[]));

    this.prevHardMask = 3;
    this.softActiveMask = 3;
    b.pMask = 3;
    (pl as any).setTouchingPortal?.(true, 3);
  }

  tick() {
    this.portalGun.update(1/60, (k:PortalKind, x:number, y:number, a:number, o:"R"|"L"|"U"|"D") =>
      this.portals.replaceWorld(k, x, y, a, o)
    );
    this.tele();
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    this.portalGun.draw(ctx);
    this.portals.draw(ctx, t);
  }
}
