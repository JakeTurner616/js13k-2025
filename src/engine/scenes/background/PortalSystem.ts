// src/engine/scenes/background/PortalSystem.ts
// input → raycast → sprite portals → teleport (A/B, ori/vel xform, cooldown, forbid gate)

import { tb, fb, pushByHit, s2w } from "./sceneUtils";
import { getCurrentMap } from "../../renderer/level-loader";
import { zzfx } from "../../audio/SoundEngine";
import { port } from "../../../sfx/port";
import { zip } from "../../../sfx/zip";
import type { Player } from "../../../player/Player";
import type { Cam } from "../../camera/Camera";

type Ori = "R" | "L" | "U" | "D";
type Portal = { k: "A" | "B"; x: number; y: number; a: number; o: Ori };
type Shot = {
  k: "A" | "B"; x: number; y: number; dx: number; dy: number;
  hx: number; hy: number; a: number; o: Ori; t: number; th: number; ban: boolean
};

const TILE = 16, PW = 32, PH = 32, MD = 2000, S = 640, FORBID = 2, TAU = Math.PI * 2;
const { min, sign, hypot, PI } = Math;
const OA: Record<Ori, number> = { R: 0, L: 0, U: PI / 2, D: -PI / 2 };
const RGBA = ["40,140,255", "255,160,40"];

export class PortalSystem {
  private A?: Portal; private B?: Portal;
  private Q: Shot[] = [];
  private player: Player | null = null;
  private onDown?: (e: MouseEvent) => void;
  private cool = 0;
  private lastExit?: "A" | "B"; // prevent infinite portal loop re-entry

  private sc = document.createElement("canvas");
  private sx: CanvasRenderingContext2D;

  private anim: any = null; private frames = 1; private fps = 10; private fw = 32; private fh = 32;

  constructor() {
    this.sc.width = PW; this.sc.height = PH;
    this.sx = this.sc.getContext("2d")!;
  }

  reset() { this.A = this.B = undefined; this.Q.length = this.cool = 0; this.lastExit = undefined; }
  clear() { this.reset(); }
  setPlayer(p: Player | null) { this.player = p; }
  setAnimator(a: any) {
    this.anim = a; this.fw = a?.fw ?? 32; this.fh = a?.fh ?? 32;
    const m = a?.getMeta?.("portal"); this.frames = (m?.frameCount | 0) || 1; this.fps = (m?.fps | 0) || 10;
  }

  attachInput(canvas: HTMLCanvasElement, cam: Cam) {
    canvas.oncontextmenu = e => e.preventDefault();
    this.onDown = e => {
      const m = getCurrentMap(); if (!m) return;
      const { wx, wy } = s2w(e.clientX, e.clientY, canvas, cam);
      const p = this.player?.body;
      const hb = p?.hit ?? (p ? { x: 0, y: 0, w: p.width, h: p.height } : null);
      const cx = p && hb ? p.pos.x + hb.x + hb.w * .5 : wx;
      const cy = p && hb ? p.pos.y + hb.y + hb.h * .5 : wy;
      this.spawn(e.button === 2 ? "B" : "A", cx, cy, wx - cx, wy - cy, m, canvas.height);
    };
    canvas.addEventListener("mousedown", this.onDown);
  }
  detachInput(canvas: HTMLCanvasElement) {
    if (this.onDown) canvas.removeEventListener("mousedown", this.onDown), this.onDown = undefined;
    canvas.oncontextmenu = null;
  }

  /** Grid DDA raycast into tile map */
  private cast(
    sx: number, sy: number, dx: number, dy: number,
    m: { width: number; height: number; tiles: Uint32Array | number[] }, cH: number
  ) {
    let L = hypot(dx, dy) || 1; dx /= L; dy /= L;
    const oY = cH - m.height * TILE,
      inb = (x: number, y: number) => x >= 0 && y >= 0 && x < m.width && y < m.height,
      tid = (x: number, y: number) => inb(x, y) ? (m.tiles as any)[y * m.width + x] as number : 0,
      solid = (x: number, y: number) => tid(x, y) > 0;

    let tx = (sx / TILE | 0), ty = ((sy - oY) / TILE | 0), sX = sign(dx), sY = sign(dy);
    let tX = sX ? (((sX > 0 ? tx + 1 : tx) * TILE - sx) / dx) : 1e30,
        tY = sY ? ((oY + (sY > 0 ? ty + 1 : ty) * TILE - sy) / dy) : 1e30,
        dX = sX ? TILE / Math.abs(dx) : 1e30,
        dY = sY ? TILE / Math.abs(dy) : 1e30;

    for (let tr = 0; tr <= MD;) {
      if (tX < tY) { tr = tX; tx += sX; tX += dX; if (!inb(tx, ty)) break;
        if (solid(tx, ty)) { const id = tid(tx, ty); return { hx: sx + dx * tr, hy: sy + dy * tr, ax: "x" as const, sX, sY, ban: id === FORBID }; }
      } else { tr = tY; ty += sY; tY += dY; if (!inb(tx, ty)) break;
        if (solid(tx, ty)) { const id = tid(tx, ty); return { hx: sx + dx * tr, hy: sy + dy * tr, ax: "y" as const, sX, sY, ban: id === FORBID }; }
      }
    }
    return null;
  }

  private spawn(
    k: "A" | "B", sx: number, sy: number, dx: number, dy: number,
    m: { width: number; height: number; tiles: Uint32Array | number[] }, cH: number
  ) {
    const r = this.cast(sx, sy, dx, dy, m, cH); if (!r) return;
    if (!r.ban) { try { zzfx?.(...(zip as unknown as number[])) } catch { } }
    const L = hypot(dx, dy) || 1, d = hypot(r.hx - sx, r.hy - sy),
      o = (r.ax === "x" ? (r.sX > 0 ? "L" : "R") : (r.sY > 0 ? "U" : "D")) as Ori;
    this.Q.push({ k, x: sx, y: sy, dx: dx / L, dy: dy / L, hx: r.hx, hy: r.hy, a: OA[o], o, t: 0, th: min(d, MD) / S, ban: !!r.ban });
  }

  private place(k: "A" | "B", x: number, y: number, a: number, o: Ori) {
    const p = { k, x, y, a, o }; k === "A" ? this.A = p : this.B = p;
  }

  private inPortal(p: Portal, cx: number, cy: number, hw: number, hh: number) {
    const v = tb(cx - p.x, cy - p.y, p.o);
    const rx = PW * .48 + ((p.o === "R" || p.o === "L") ? hw * .35 : 0);
    const ry = PH * .46 + ((p.o === "U" || p.o === "D") ? hh * .35 : 0);
    return (v.n * v.n) / (rx * rx) + (v.t * v.t) / (ry * ry) <= 1;
  }

  private teleportIfInside() {
    const pl = this.player, A = this.A, B = this.B; if (!(pl && A && B)) return;
    if (this.cool > 0) { this.cool--; return; }

    const b: any = pl.body, hb = b.hit ?? { x: 0, y: 0, w: b.width, h: b.height };
    const hw = (hb.w * .5) | 0, hh = (hb.h * .5) | 0;
    const cx = b.pos.x + hb.x + hb.w * .5, cy = b.pos.y + hb.y + hb.h * .5;

    // --- Prevent infinite teleport loops ---
    if (this.lastExit) {
      const ex = this.lastExit === "A" ? A : B;
      if (this.inPortal(ex, cx, cy, hw, hh)) return;
    }

    const inA = this.inPortal(A, cx, cy, hw, hh),
          ent = inA ? A : (this.inPortal(B, cx, cy, hw, hh) ? B : 0 as any);
    if (!ent) { this.lastExit = undefined; return; }
    const ext = ent === A ? B : A;

    const lv = tb(b.vel.x, b.vel.y, ent.o), re = fb(-lv.n, lv.t, ext.o);
    const k = pushByHit(ext.o, hw, hh, 2), px = ext.x + k.dx, py = ext.y + k.dy;
    b.pos.x += px - cx; b.pos.y += py - cy;
    b.vel.x = re.vx; b.vel.y = re.vy; b.grounded = false;

    try { zzfx?.(...(port as unknown as number[])) } catch { }
    this.cool = 8;
    this.lastExit = ext === A ? "A" : "B";
  }

  tick() {
    for (let i = this.Q.length; i--;) {
      const s = this.Q[i]; s.t += 1 / 60;
      if (s.t >= s.th) { if (!s.ban) this.place(s.k, s.hx, s.hy, s.a, s.o); this.Q.splice(i, 1); }
    }
    this.teleportIfInside();
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    for (const p of this.Q) {
      const tr = min(p.t, p.th) * S, px = p.x + p.dx * tr, py = p.y + p.dy * tr, c = RGBA[p.k === "A" ? 0 : 1];
      ctx.strokeStyle = `rgba(${c},.9)`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(px, py); ctx.stroke();

      ctx.fillStyle = p.ban ? "rgba(255,80,80,.95)" : "#fff";
      ctx.beginPath(); ctx.arc(px, py, 2.5, 0, TAU); ctx.fill();

      if (p.t > p.th * .9) {
        const ga = ctx.globalAlpha; ctx.globalAlpha = .6;
        ctx.fillStyle = p.ban ? "rgba(255,60,60,.7)" : `rgba(${c},.35)`;
        ctx.beginPath(); ctx.arc(p.hx, p.hy, 4.5, 0, TAU); ctx.fill();
        ctx.globalAlpha = ga;
      }
    }

    const a = this.anim; if (!a) return;
    const fi = ((t * 0.001 * this.fps) | 0) % this.frames, sx = this.sx, sc = this.sc;

    const drawP = (p?: Portal) => {
      if (!p) return;
      sx.setTransform(PW / this.fw, 0, 0, PH / this.fh, 0, 0);
      sx.clearRect(0, 0, PW, PH);
      a.drawFrame(sx as unknown as CanvasRenderingContext2D, "portal", fi, 0, 0);
      sx.globalCompositeOperation = "source-atop";
      sx.fillStyle = p.k === "A" ? "#28f" : "#f80"; sx.fillRect(0, 0, PW, PH);
      sx.globalCompositeOperation = "source-over";
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.drawImage(sc, 0, 0, PW, PH, -PW / 2, -PH / 2, PW, PH);
      ctx.restore();
    };

    drawP(this.A); drawP(this.B);
  }
}
