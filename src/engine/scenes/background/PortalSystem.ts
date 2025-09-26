// src/engine/scenes/background/PortalSystem.ts
import { tb, fb, pushByHit, s2w } from "./sceneUtils";
import { getCurrentMap } from "../../renderer/level-loader";
import { hc } from "../../../player/hb";
import { zzfx } from "../../audio/SoundEngine";
import { port } from "../../../sfx/port";
import { zip } from "../../../sfx/zip";     // ✅ valid stick SFX
import { wrong } from "../../../sfx/wrong"; // ✅ invalid/miss SFX
import type { Player } from "../../../player/Player";
import type { Cam } from "../../camera/Camera";

type O = "R" | "L" | "U" | "D";
type P = { k: "A" | "B"; x: number; y: number; a: number; o: O };
type Sh = {
  k: "A" | "B";
  x: number;
  y: number;
  dx: number;
  dy: number;
  hx: number;
  hy: number;
  a: number;
  o: O;
  t: number;
  th: number;
  ban: boolean;       // true if first hit was GREY/FINISH/SPIKE
  sfx?: 1;            // guard so we play the resolution SFX exactly once
};

type ShotInfo = {
  k: "A" | "B";
  sx: number; sy: number;       // ray start (player center)
  ax: number; ay: number;       // aim point (mouse world)
  hit: boolean;                 // hit any solid tile
  hitBlack: boolean;            // hit and NOT banned
  banned: boolean;              // hit GREY/FINISH/SPIKE etc.
  impactX: number; impactY: number; // where ray ended or clicked
  tileId?: number; tx?: number; ty?: number; // hit tile info (if any)
};

const T = 16, PW = 32, PH = 32, MD = 2e3, S = 640, { min, sign, hypot, PI } = Math;
const ang = (o: O) => (o === "R" ? PI : o === "L" ? 0 : o === "U" ? PI / 2 : -PI / 2);

export class PortalSystem {
  A?: P; B?: P; Q: Sh[] = [];
  pl: Player | null = null; cool = 0; last?: "A" | "B"; h?: (e: MouseEvent) => void;

  sc = document.createElement("canvas");
  sx = this.sc.getContext("2d")!;
  anim: any = null; n = 1; fps = 10; fw = 32; fh = 32;

  // Shot outcome callback (e.g., TutorialScene listens)
  onShot?: (info: ShotInfo) => void;

  constructor() {
    this.sc.width = PW; this.sc.height = PH;

    // 🔔 Global safety nets to guarantee portals clear across scene switches.
    addEventListener("portals:clear", () => this.clear());
    addEventListener("scene:start-music", () => this.clear()); // fires on scene start in main.ts
  }

  reset() { this.A = this.B = undefined; this.Q.length = this.cool = 0; this.last = undefined; }
  clear() { this.reset(); }
  setPlayer(p: Player | null) { this.pl = p; }
  setAnimator(a: any) {
    this.anim = a; this.fw = a?.fw ?? 32; this.fh = a?.fh ?? 32;
    const m = a?.getMeta?.("portal"); this.n = (m?.frameCount | 0) || 1; this.fps = (m?.fps | 0) || 10;
  }

  attachInput(cv: HTMLCanvasElement, cam: Cam) {
    cv.oncontextmenu = e => e.preventDefault();
    this.h = e => {
      const m = getCurrentMap(); if (!m) return;
      const { wx, wy } = s2w(e.clientX, e.clientY, cv, cam);
      const b = this.pl?.body, c = b ? hc(b) : 0 as any, cx = c ? c.cx : wx, cy = c ? c.cy : wy;
      this.spawn(e.button === 2 ? "B" : "A", cx, cy, wx - cx, wy - cy, m, cv.height, wx, wy);
    };
    cv.addEventListener("mousedown", this.h);
  }
  detachInput(cv: HTMLCanvasElement) {
    if (this.h) cv.removeEventListener("mousedown", this.h), this.h = undefined;
    cv.oncontextmenu = null;
  }

  private cast(
    sx: number, sy: number, dx: number, dy: number,
    m: { width: number; height: number; tiles: Uint32Array | number[] }, cH: number
  ) {
    let L = hypot(dx, dy) || 1; dx /= L; dy /= L;
    const oY = cH - m.height * T,
      inb = (x: number, y: number) => x >= 0 && y >= 0 && x < m.width && y < m.height,
      tid = (x: number, y: number) => inb(x, y) ? (m.tiles as any)[y * m.width + x] | 0 : 0,
      sol = (x: number, y: number) => tid(x, y) > 0;

    let tx = (sx / T | 0), ty = ((sy - oY) / T | 0),
      sxn = sign(dx), syn = sign(dy),
      tX = sxn ? (((sxn > 0 ? tx + 1 : tx) * T - sx) / dx) : 1e30,
      tY = syn ? ((oY + (syn > 0 ? ty + 1 : ty) * T - sy) / dy) : 1e30,
      dX = sxn ? T / Math.abs(dx) : 1e30,
      dY = syn ? T / Math.abs(dy) : 1e30;

    for (let tr = 0; tr <= MD;) {
      if (tX < tY) {
        tr = tX; tx += sxn; tX += dX; if (!inb(tx, ty)) break;
        if (sol(tx, ty)) {
          const id = tid(tx, ty), ban = (id === 2 || id === 3 || id === 4);
          return { hx: sx + dx * tr, hy: sy + dy * tr, ax: "x" as const, sX: sxn, sY: syn, ban, id, tx, ty };
        }
      } else {
        tr = tY; ty += syn; tY += dY; if (!inb(tx, ty)) break;
        if (sol(tx, ty)) {
          const id = tid(tx, ty), ban = (id === 2 || id === 3 || id === 4);
          return { hx: sx + dx * tr, hy: sy + dy * tr, ax: "y" as const, sX: sxn, sY: syn, ban, id, tx, ty };
        }
      }
    }
    return null;
  }

  private spawn(
    k: "A" | "B", sx: number, sy: number, dx: number, dy: number,
    m: any, cH: number, ax: number, ay: number
  ) {
    const r = this.cast(sx, sy, dx, dy, m, cH);

    // Inform listeners (tutorial) about shot outcome
    if (!r) {
      // MISS → play WRONG immediately and exit (no travel ray)
      try { zzfx?.(...(wrong as unknown as number[])) } catch {}
      this.onShot?.({ k, sx, sy, ax, ay, hit: false, hitBlack: false, banned: false, impactX: ax, impactY: ay });
      return;
    } else {
      const hitBlack = !r.ban;
      this.onShot?.({
        k, sx, sy, ax, ay, hit: true, hitBlack, banned: r.ban,
        impactX: r.hx, impactY: r.hy, tileId: r.id, tx: r.tx, ty: r.ty
      });
    }

    // 👇 DEFER SFX to *resolution time* (end of ray) to avoid early/incorrect "wrong" beeps.
    // We still push a traveling ray so visuals match.
    const L = hypot(dx, dy) || 1, d = hypot(r.hx - sx, r.hy - sy),
          o = (r.ax === "x" ? (r.sX > 0 ? "L" : "R") : (r.sY > 0 ? "U" : "D")) as O;
    this.Q.push({
      k, x: sx, y: sy, dx: dx / L, dy: dy / L,
      hx: r.hx, hy: r.hy, a: ang(o), o,
      t: 0, th: min(d, MD) / S, ban: r.ban
    });
  }

  private inP(p: P, cx: number, cy: number, hw: number, hh: number) {
    const v = tb(cx - p.x, cy - p.y, p.o),
      rx = PW * .48 + ((p.o === "R" || p.o === "L") ? hw * .35 : 0),
      ry = PH * .46 + ((p.o === "U" || p.o === "D") ? hh * .35 : 0);
    return (v.n * v.n) / (rx * rx) + (v.t * v.t) / (ry * ry) <= 1;
  }

  private tp() {
    const pl = this.pl, A = this.A, B = this.B; if (!(pl && A && B)) return;
    if (this.cool > 0) { this.cool--; return; }

    const { cx, cy, hw, hh } = hc(pl.body);
    if (this.last) { const ex = this.last === "A" ? A : B; if (this.inP(ex, cx, cy, hw, hh)) return; }

    const ent = this.inP(A, cx, cy, hw, hh) ? A : (this.inP(B, cx, cy, hw, hh) ? B : 0 as any);
    if (!ent) { this.last = undefined; return; }

    const ext = ent === A ? B : A, b: any = pl.body,
      lv = tb(b.vel.x, b.vel.y, ent.o), re = fb(-lv.n, lv.t, ext.o),
      k = pushByHit(ext.o, hw, hh, 2), px = ext.x + k.dx, py = ext.y + k.dy;

    b.pos.x += px - cx; b.pos.y += py - cy; b.vel.x = re.vx; b.vel.y = re.vy; b.grounded = false;
    try { zzfx?.(...(port as unknown as number[])) } catch {}
    this.cool = 8; this.last = ext === A ? "A" : "B";
  }

  tick() {
    // Advance rays; resolve at end-of-travel
    for (let i = this.Q.length; i--;) {
      const s = this.Q[i]; s.t += 1 / 60;
      if (s.t >= s.th) {
        // 🔊 Play the *correct* SFX *now* based on the resolved hit (`ban`)
        if (!s.sfx) {
          try {
            if (s.ban) zzfx?.(...(wrong as unknown as number[]));
            else zzfx?.(...(zip as unknown as number[]));
          } catch {}
          s.sfx = 1;
        }
        // Place the portal only for valid hits
        if (!s.ban) (this as any)[s.k] = { k: s.k, x: s.hx, y: s.hy, a: s.a, o: s.o } as P;
        this.Q.splice(i, 1);
      }
    }
    this.tp();
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    // rays
    for (const p of this.Q) {
      const tr = min(p.t, p.th) * S, px = p.x + p.dx * tr, py = p.y + p.dy * tr;
      const ga = ctx.globalAlpha;
      ctx.globalAlpha = .9; ctx.strokeStyle = p.k === "A" ? "#28f" : "#f80";
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(px, py); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = p.ban ? "#f44" : "#fff";
      ctx.beginPath(); ctx.arc(px, py, 2.5, 0, PI * 2); ctx.fill();
      if (p.t > p.th * .9) {
        ctx.globalAlpha = .6; ctx.fillStyle = p.ban ? "#f66" : (p.k === "A" ? "#28f" : "#f80");
        ctx.beginPath(); ctx.arc(p.hx, p.hy, 4.5, 0, PI * 2); ctx.fill(); ctx.globalAlpha = ga;
      }
    }

    // portals
    const a = this.anim; if (!a) return;
    const fi = ((t * .001 * this.fps) | 0) % this.n, sx = this.sx, sc = this.sc;
    sx.setTransform(PW / this.fw, 0, 0, PH / this.fh, 0, 0);
    const draw = (p?: P) => {
      if (!p) return;
      sx.clearRect(0, 0, PW, PH);
      a.drawFrame(sx as any, "portal", fi, 0, 0);
      sx.globalCompositeOperation = "source-atop";
      sx.fillStyle = p.k === "A" ? "#28f" : "#f80"; sx.fillRect(0, 0, PW, PH);
      sx.globalCompositeOperation = "source-over";
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.drawImage(sc, 0, 0, PW, PH, -PW / 2, -PH / 2, PW, PH);
      ctx.restore();
    };
    draw(this.A); draw(this.B);
  }
}
