// src/engine/scenes/background/PortalSystem.ts
import { createPortalManager, createPortalGun, type PortalKind, PORTAL_W, PORTAL_H } from "../../objects/portals/Portals";
import { tb, fb, pushByHit, s2w } from "./sceneUtils";
import { getCurrentMap } from "../../renderer/level-loader";
import { zzfx } from "../../audio/SoundEngine";
import { port } from "../../../sfx/port";
import type { Player } from "../../../player/Player";
import type { Cam } from "../../camera/Camera";

const TILE = 16;
const { cos, sin } = Math;
type PL = { x:number; y:number; angle:number; o:"R"|"L"|"U"|"D" };

export class PortalSystem {
  readonly portals = createPortalManager(TILE);
  readonly portalGun = createPortalGun(TILE);
  private player: Player | null = null;
  private onDown?: (e: MouseEvent) => void;

  private prevHardMask = 0;
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

  private rotLocal(p: PL, px:number, py:number){
    const ca = cos(-p.angle), sa = sin(-p.angle);
    const dx = px - p.x, dy = py - p.y;
    return { lx: dx*ca - dy*sa, ly: dx*sa + dy*ca };
  }
  private soft(p: PL, bx:number,by:number,bw:number,bh:number, tight:boolean){
    const cx = bx + bw*.5, cy = by + bh*.5;
    const { lx, ly } = this.rotLocal(p, cx, cy);
    const rx = PORTAL_W * (tight ? .46 : .54) + ((p.o==="R"||p.o==="L") ? bw*(tight?.25:.5) : 0);
    const ry = PORTAL_H * (tight ? .48 : .58) + ((p.o==="U"||p.o==="D") ? bh*(tight?.25:.5) : 0);
    const nx = lx / rx, ny = ly / ry;
    return nx*nx + ny*ny <= 1;
  }
  private hard(p: PL, bx:number,by:number,bw:number,bh:number){
    const fm = this.portals.getFootprintMask();
    if (fm.bbox.x1 < fm.bbox.x0) return false;
    const STEP=2, HIT_MIN=3, x1=bx+bw, y1=by+bh;
    let hits=0;
    for (let sy=by; sy<y1; sy+=STEP){
      for (let sx=bx; sx<x1; sx+=STEP){
        const { lx, ly } = this.rotLocal(p, sx, sy);
        const mx = (lx + fm.w*.5) | 0, my = (ly + fm.h*.5) | 0;
        if (mx < fm.bbox.x0 || mx > fm.bbox.x1 || my < fm.bbox.y0 || my > fm.bbox.y1) continue;
        if (mx < 0 || my < 0 || mx >= fm.w || my >= fm.h) continue;
        if (fm.data[my*fm.w+mx] && ++hits >= HIT_MIN) return true;
      }
    }
    return false;
  }

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

    // soft hysteresis
    const enterBits =
      (this.soft(S.A, bx,by,bw,bh, false) ? 1 : 0) |
      (this.soft(S.B, bx,by,bw,bh, false) ? 2 : 0);

    let keepBits = 0;
    if (this.softActiveMask & 1) keepBits |= (this.soft(S.A, bx,by,bw,bh, true) ? 1 : 0);
    if (this.softActiveMask & 2) keepBits |= (this.soft(S.B, bx,by,bw,bh, true) ? 2 : 0);

    this.softActiveMask = enterBits | keepBits;
    b.pMask = this.softActiveMask;
    (pl as any).setTouchingPortal?.(this.softActiveMask !== 0, 2);

    // hard pixel mask (edge trigger)
    const hardMask =
      (this.hard(S.A, bx,by,bw,bh) ? 1 : 0) |
      (this.hard(S.B, bx,by,bw,bh) ? 2 : 0);

    const enterA = !!(hardMask & 1) && !(this.prevHardMask & 1);
    const enterB = !!(hardMask & 2) && !(this.prevHardMask & 2);
    if (!(enterA || enterB)) { this.prevHardMask = hardMask; return; }

    const ent = enterA ? S.A : S.B!, ext = enterA ? S.B! : S.A!;
    const lv = tb(b.vel.x, b.vel.y, ent.o);
    const re = fb(-lv.n, lv.t, ext.o);

    const hw=(hb.w*.5)|0, hh=(hb.h*.5)|0;
    const k = pushByHit(ext.o, hw, hh, 2);
    const px = ext.x + k.dx, py = ext.y + k.dy;

    b.pos.x += px - cx; b.pos.y += py - cy;
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
