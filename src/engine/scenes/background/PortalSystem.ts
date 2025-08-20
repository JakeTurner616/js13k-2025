// src/engine/scenes/background/PortalSystem.ts
import { createPortalManager, type PortalKind, PORTAL_W, PORTAL_H } from "../../objects/portals/Portals";
import { createPortalGun } from "../../objects/portals/PortalGun";
import { tb, fb, pushByHit, s2w } from "./sceneUtils";
import { getCurrentMap } from "../../renderer/level-loader";
import { zzfx } from "../../audio/SoundEngine";
import { port } from "../../../sfx/port";
import type { Player } from "../../../player/Player";
import type { Cam } from "../../camera/Camera";

const TILE = 16;

export class PortalSystem {
  readonly portals = createPortalManager(TILE);
  readonly portalGun = createPortalGun(TILE);
  private player: Player | null = null;
  private onDown?: (e: MouseEvent) => void;

  setPlayer(p: Player | null) { this.player = p; }
  setAnimator(a: any) { this.portals.setAnimator(a); }

  attachInput(k: HTMLCanvasElement, cam: Cam) {
    k.oncontextmenu = e => e.preventDefault();
    this.onDown = e => {
      const map = getCurrentMap(); if (!map) return;
      const { wx, wy } = s2w(e.clientX, e.clientY, k, cam);
      const px = this.player ? this.player.body.pos.x + this.player.body.width * .5 : wx;
      const py = this.player ? this.player.body.pos.y + this.player.body.height * .5 : wy;
      this.portalGun.spawn((e.button === 2 ? "B" : "A") as PortalKind, px, py, wx - px, wy - py, map, k.height);
    };
    k.addEventListener("mousedown", this.onDown);
  }

  detachInput(k: HTMLCanvasElement) {
    if (this.onDown) k.removeEventListener("mousedown", this.onDown), this.onDown = undefined;
    k.oncontextmenu = null;
  }

  private tele() {
    const P = this.portals.getSlots(), pl = this.player;
    if (!(pl && P.A && P.B)) {
      (pl as any)?.setTouchingPortal?.(false);
      if (pl) (pl.body as any).pMask = 0;
      return;
    }

    const b: any = pl.body, cx = b.pos.x + b.width * .5, cy = b.pos.y + b.height * .5, old = b.pMask | 0;
    const hw = (b.hit?.w ?? b.width) * .5, hh = (b.hit?.h ?? b.height) * .5;

    const inside = (p: { x: number; y: number; angle: number; o: string }) => {
      const dx = cx - p.x, dy = cy - p.y, ca = Math.cos(-p.angle), sa = Math.sin(-p.angle);
      const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca, rx = PORTAL_W * .40, ry = PORTAL_H * .46;
      return (p.o === "R" || p.o === "L") ? (Math.abs(lx) <= rx + hw && Math.abs(ly) <= ry) : (Math.abs(lx) <= rx && Math.abs(ly) <= ry + hh);
    };

    const inA = inside(P.A), inB = inside(P.B), mask = (inA ? 1 : 0) | (inB ? 2 : 0);
    const enterA = inA && !(old & 1), enterB = inB && !(old & 2);
    if (!(enterA || enterB)) {
      b.pMask = mask;
      (pl as any).setTouchingPortal?.(mask !== 0, 2);
      return;
    }

    const ent = enterA ? P.A! : P.B!, ext = enterA ? P.B! : P.A!;
    const lv = tb(b.vel.x, b.vel.y, ent.o), re = fb(-lv.n, lv.t, ext.o);
    const k = pushByHit(ext.o, hw, hh, 2), px = ext.x + k.dx, py = ext.y + k.dy;

    b.pos.x += px - (b.pos.x + b.width * .5);
    b.pos.y += py - (b.pos.y + b.height * .5);
    b.vel.x = re.vx; b.vel.y = re.vy;
    b.grounded = b.touchL = b.touchR = false; b.hitWall = 0;
    zzfx?.(...(port as unknown as number[]));
    b.pMask = 3; (pl as any).setTouchingPortal?.(true, 3);
  }

  tick() {
    this.portalGun.update(1 / 60, (k, x, y, a, o) => this.portals.replaceWorld(k, x, y, a, o));
    this.tele();
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    this.portalGun.draw(ctx, t);
    this.portals.draw(ctx, t);
  }
}