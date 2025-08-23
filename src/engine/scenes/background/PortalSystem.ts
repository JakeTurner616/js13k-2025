// src/engine/scenes/background/PortalSystem.ts
// One-file portal system: input → raycast → sprite portals → teleport.
// Keeps: A/B slots, side/orientation, velocity transform, cooldown guard, forbidden tile gate.
// Drops: pixel masks, collision toggles, hysteresis, extra modules.

import { tb, fb, pushByHit, s2w } from "./sceneUtils";
import { getCurrentMap } from "../../renderer/level-loader";
import { mapOffsetY } from "../../renderer/Space";
import { zzfx } from "../../audio/SoundEngine";
import { port } from "../../../sfx/port";
import { zip } from "../../../sfx/zip";
import { isSolidTileId } from "../../../player/Physics";
import type { Player } from "../../../player/Player";
import type { Cam } from "../../camera/Camera";

// ---- tiny consts ----
const TILE = 16, PW = 32, PH = 32, TAU = Math.PI * 2;
const { max, min, sign, hypot, cos, sin, PI } = Math;
const MD = 2000;              // max raycast distance
const FORBID_ID = 134;        // tile id that refuses portals

type Ori = "R" | "L" | "U" | "D";
type Portal = { k: "A" | "B"; x: number; y: number; a: number; o: Ori };
type Shot = { k: "A" | "B"; x: number; y: number; dx: number; dy: number; hx: number; hy: number; a: number; o: Ori; t: number; th: number; ban: boolean };

export class PortalSystem {
  // --- state ---
  private A?: Portal; private B?: Portal;
  private Q: Shot[] = [];
  private player: Player | null = null;
  private onDown?: (e: MouseEvent) => void;
  private cool = 0;

  // animator (trim-aware frame slicer you already have)
  private anim: any = null;
  private frames = 1; private fps = 10; private fw = 32; private fh = 32;

  // tiny scratch canvas for tinting
  private sc = (() => { const c = document.createElement("canvas"); c.width = PW; c.height = PH; return c; })();
  private sx = (null as unknown as CanvasRenderingContext2D);

  constructor() {
    this.sx = this.sc.getContext("2d")!;
  }

  // --- external hooks ---
  setPlayer(p: Player | null) { this.player = p; }
  setAnimator(a: any) {
    // expects a.drawFrame(ctx, "portal", frame, x, y) + optional meta
    this.anim = a;
    this.fw = a?.fw ?? 32; this.fh = a?.fh ?? 32;
    const m = a?.getMeta?.("portal");
    this.frames = max(1, (m?.frameCount ?? 1) | 0);
    this.fps = max(1, (m?.fps ?? 10) | 0);
  }

  clear() { this.A = this.B = undefined; this.Q.length = 0; this.cool = 0; }

  attachInput(k: HTMLCanvasElement, cam: Cam) {
    k.oncontextmenu = e => e.preventDefault();
    this.onDown = e => {
      const m = getCurrentMap(); if (!m) return;
      const { wx, wy } = s2w(e.clientX, e.clientY, k, cam);
      const pl = this.player, bx = pl ? pl.body.pos.x + pl.body.width * .5 : wx, by = pl ? pl.body.pos.y + pl.body.height * .5 : wy;
      const K = e.button === 2 ? "B" : "A";
      this.spawn(K, bx, by, wx - bx, wy - by, m, k.height);
    };
    k.addEventListener("mousedown", this.onDown);
  }
  detachInput(k: HTMLCanvasElement) {
    if (this.onDown) k.removeEventListener("mousedown", this.onDown), this.onDown = undefined;
    k.oncontextmenu = null;
  }

  // --- raycast (grid DDA) ---
  private cast(sx: number, sy: number, dx: number, dy: number, m: { width: number; height: number; tiles: Uint32Array | number[] }, cH: number) {
    let L = hypot(dx, dy) || 1; dx /= L; dy /= L;

    const oY = mapOffsetY(cH, m.height, TILE);
    const toTy = (wy: number) => ((wy - oY) / TILE | 0);
    const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < m.width && y < m.height;
    const tid = (x: number, y: number) => inb(x, y) ? (m.tiles as any)[y * m.width + x] as number : 0;
    const solid = (x: number, y: number) => { const id = tid(x, y); return id > 0 && isSolidTileId(id); };

    let tx = (sx / TILE) | 0, ty = toTy(sy), sX = sign(dx), sY = sign(dy);
    let tX = sX ? (((sX > 0 ? tx + 1 : tx) * TILE - sx) / dx) : 1e30;
    let tY = sY ? ((oY + (sY > 0 ? ty + 1 : ty) * TILE - sy) / dy) : 1e30;
    const dX = sX ? TILE / Math.abs(dx) : 1e30, dY = sY ? TILE / Math.abs(dy) : 1e30;

    for (let tr = 0; tr <= MD;) {
      if (tX < tY) {
        tr = tX; tx += sX; tX += dX; if (!inb(tx, ty)) break;
        if (solid(tx, ty)) { const id = tid(tx, ty); return { hx: sx + dx * tr, hy: sy + dy * tr, ax: "x" as const, sX, sY, ban: id === FORBID_ID }; }
      } else {
        tr = tY; ty += sY; tY += dY; if (!inb(tx, ty)) break;
        if (solid(tx, ty)) { const id = tid(tx, ty); return { hx: sx + dx * tr, hy: sy + dy * tr, ax: "y" as const, sX, sY, ban: id === FORBID_ID }; }
      }
    }
    return null;
  }

  // --- spawn shot that “flies” to hit point (for a snappy VFX + SFX) ---
  private spawn(k: "A" | "B", sx: number, sy: number, dx: number, dy: number, m: { width: number; height: number; tiles: Uint32Array | number[] }, cH: number) {
    const r = this.cast(sx, sy, dx, dy, m, cH); if (!r) return;
    if (!r.ban) { try { zzfx?.(...(zip as unknown as number[])); } catch { } }
    const L = hypot(dx, dy) || 1, d = hypot(r.hx - sx, r.hy - sy);
    const nx = r.ax === "x" ? (r.sX > 0 ? -1 : 1) : 0, ny = r.ax === "y" ? (r.sY > 0 ? -1 : 1) : 0;
    const a = r.ax === "x" ? 0 : (ny < 0 ? PI / 2 : -PI / 2);
    const o = (nx ? (nx < 0 ? "L" : "R") : (ny < 0 ? "U" : "D")) as Ori;
    this.Q.push({ k, x: sx, y: sy, dx: dx / L, dy: dy / L, hx: r.hx, hy: r.hy, a, o, t: 0, th: min(d, MD) / 640, ban: !!r.ban });
  }

  // --- install portal instantly once shot reaches wall ---
  private place(k: "A" | "B", x: number, y: number, a: number, o: Ori) {
    const p = { k, x, y, a, o };
    if (k === "A") this.A = p; else this.B = p;
  }

  // --- ellipse test in portal-local space (center + axis bias) ---
  private inPortal(p: Portal, cx: number, cy: number, hw: number, hh: number) {
    const ca = cos(-p.a), sa = sin(-p.a);
    const lx = (cx - p.x) * ca - (cy - p.y) * sa;
    const ly = (cx - p.x) * sa + (cy - p.y) * ca;
    const rx = PW * .48 + ((p.o === "R" || p.o === "L") ? hw * .35 : 0);
    const ry = PH * .46 + ((p.o === "U" || p.o === "D") ? hh * .35 : 0);
    return (lx * lx) / (rx * rx) + (ly * ly) / (ry * ry) <= 1;
  }

  // --- teleport logic w/ cooldown guard ---
  private teleportIfInside() {
    const pl = this.player, A = this.A, B = this.B;
    if (!(pl && A && B)) return;
    if (this.cool > 0) { this.cool--; return; }

    const b: any = pl.body;
    const hb = b.hit ?? { x: 0, y: 0, w: b.width, h: b.height };
    const cx = b.pos.x + b.width * .5, cy = b.pos.y + b.height * .5;
    const hw = (hb.w * .5) | 0, hh = (hb.h * .5) | 0;

    const inA = this.inPortal(A, cx, cy, hw, hh);
    const inB = !inA && this.inPortal(B, cx, cy, hw, hh);
    if (!(inA || inB)) return;

    const ent = inA ? A : B;     // entered
    const ext = inA ? B : A;     // exit

    // local basis reflect → map to exit basis
    const lv = tb(b.vel.x, b.vel.y, ent.o);
    const re = fb(-lv.n, lv.t, ext.o);

    // push out from exit plane (no collide toggles)
    const k = pushByHit(ext.o, hw, hh, 2);
    const px = ext.x + k.dx, py = ext.y + k.dy;

    b.pos.x += px - cx; b.pos.y += py - cy;
    b.vel.x = re.vx; b.vel.y = re.vy;
    b.grounded = false; b.touchL = b.touchR = false; b.hitWall = 0;

    try { zzfx?.(...(port as unknown as number[])); } catch { }
    this.cool = 8; // ~8 ticks @60Hz
  }

  // --- tick/draw ---
  tick() {
    // advance shots and plant portals
    for (let i = this.Q.length; i--;) {
      const s = this.Q[i]; s.t += 1 / 60;
      if (s.t >= s.th) { if (!s.ban) this.place(s.k, s.hx, s.hy, s.a, s.o); this.Q.splice(i, 1); }
    }
    this.teleportIfInside();
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    // draw shots (laser trails + dot)
    for (const p of this.Q) {
      const tr = min(p.t, p.th) * 640, px = p.x + p.dx * tr, py = p.y + p.dy * tr, rgb = p.k === "A" ? "40,140,255" : "255,160,40";
      ctx.strokeStyle = `rgba(${rgb},.9)`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(px, py); ctx.stroke();
      ctx.fillStyle = p.ban ? "rgba(255,80,80,.95)" : "#fff";
      ctx.beginPath(); ctx.arc(px, py, 2.5, 0, TAU); ctx.fill();
      if (p.t > p.th * .9) {
        const a = ctx.globalAlpha; ctx.globalAlpha = .6;
        ctx.fillStyle = p.ban ? "rgba(255,60,60,.7)" : `rgba(${rgb},.35)`;
        ctx.beginPath(); ctx.arc(p.hx, p.hy, 4.5, 0, TAU); ctx.fill();
        ctx.globalAlpha = a;
      }
    }

    // draw portals (tinted sprite, rotated)
    const a = this.anim; if (!a) return;
    const fi = ((t * 0.001 * this.fps) | 0) % this.frames;

    const drawP = (p?: Portal) => {
      if (!p) return;
      // slice→tint→blit
      const sx = this.sx, sc = this.sc;
      sx.setTransform(PW / this.fw, 0, 0, PH / this.fh, 0, 0);
      sx.clearRect(0, 0, PW, PH);
      a.drawFrame(sx as unknown as CanvasRenderingContext2D, "portal", fi, 0, 0);
      sx.globalCompositeOperation = "source-atop";
      sx.fillStyle = p.k === "A" ? "#28f" : "#f80";
      sx.fillRect(0, 0, PW, PH);
      sx.globalCompositeOperation = "source-over";

      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.drawImage(sc, 0, 0, PW, PH, -PW / 2, -PH / 2, PW, PH);
      ctx.restore();
    };

    drawP(this.A); drawP(this.B);
  }
}
