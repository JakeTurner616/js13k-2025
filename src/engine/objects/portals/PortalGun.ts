// src/engine/objects/portals/PortalGun.ts
// ------------------------------------------------------
// Portal gun logic:
// - Fires projectiles (raycast to solid tiles)
// - Determines hit point and surface normal
// - Spawns portals at valid collision faces
// - Draws beam trails + projectile indicator
// ------------------------------------------------------

import type { GameMapLike, PortalKind } from "./Portals";
import type { Ori } from "./PortalPlacement";

import { mapOffsetY } from "../../renderer/Space";
import { isSolidTileId } from "../../../player/Physics";

import { zip } from "../../../sfx/zip";              // portal shot sound
import { zzfx } from "../../audio/SoundEngine";      // sound engine

// ------------------ Types ------------------

type Axis = "x" | "y";

/** Active portal projectile (in-flight beam) */
type Projectile = {
  k: PortalKind;        // kind of portal (A or B)
  x: number; y: number; // start position
  dx: number; dy: number; // direction (normalized)

  hx: number; hy: number; // hit point
  nx: number; ny: number; // surface normal
  a: number;             // angle for orientation
  o: Ori;                // facing orientation

  t: number;             // elapsed lifetime
  th: number;            // total time until hit
  alive: boolean;        // active flag
};

// Placement callback signature
export type PlaceCb = (
  k: PortalKind,
  x: number,
  y: number,
  a: number,
  o: Ori,
  h?: { hx: number; hy: number; nx: number; ny: number }
) => void;

// ------------------ Constants ------------------

const S = 640;       // speed scaling (px/sec)
const MD = 2000;     // max ray distance (px)

// ------------------ Factory ------------------

export function createPortalGun(T: number) {
  // active projectiles
  const p: Projectile[] = [];

  // ------------------ Raycast ------------------
  function rc(
    sx: number, sy: number,
    dx: number, dy: number,
    m: GameMapLike, cH: number
  ) {
    // normalize direction
    const L = Math.hypot(dx, dy) || 1;
    dx /= L; dy /= L;

    // tile Y offset (account for camera/map offset)
    const oY = mapOffsetY(cH, m.height, T);

    const toTileY = (wy: number) => Math.floor((wy - oY) / T);

    // current tile coords
    let tx = Math.floor(sx / T);
    let ty = toTileY(sy);

    // step direction per axis
    const sX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const sY = dy > 0 ? 1 : dy < 0 ? -1 : 0;

    // avoid div/0 → use huge number
    const I = 1e30;

    // step distance in tiles
    const dX = sX ? T / Math.abs(dx) : I;
    const dY = sY ? T / Math.abs(dy) : I;

    // next boundary in world px
    const nX = sX > 0 ? (tx + 1) * T : tx * T;
    const nY = sY > 0 ? (oY + (ty + 1) * T) : (oY + ty * T);

    // time to next boundary
    let tmX = sX ? (nX - sx) / dx : I;
    let tmY = sY ? (nY - sy) / dy : I;

    // traveled distance
    let tr = 0;

    // helpers
    const inb = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < m.width && y < m.height;

    const sol = (x: number, y: number) => {
      if (!inb(x, y)) return false;
      const id = (m.tiles as any)[y * m.width + x] as number;
      return id > 0 && isSolidTileId(id);
    };

    // DDA stepping loop
    while (tr <= MD) {
      if (tmX < tmY) {
        // step in X
        tr = tmX; tx += sX; tmX += dX;
        if (sol(tx, ty)) {
          return { hx: sx + dx * tr, hy: sy + dy * tr, axis: "x" as Axis, stepX: sX, stepY: sY };
        }
      } else {
        // step in Y
        tr = tmY; ty += sY; tmY += dY;
        if (sol(tx, ty)) {
          return { hx: sx + dx * tr, hy: sy + dy * tr, axis: "y" as Axis, stepX: sX, stepY: sY };
        }
      }
      if (!inb(tx, ty)) return null;
    }

    return null;
  }

  // ------------------ Orientation ------------------
  function or(ax: Axis, sX: number, sY: number) {
    if (ax === "x") {
      const nx = sX > 0 ? -1 : 1;
      const o: Ori = nx < 0 ? "L" : "R";
      return { nx, ny: 0, a: 0, o };
    } else {
      const ny = sY > 0 ? -1 : 1;
      const o: Ori = ny < 0 ? "U" : "D";
      return { nx: 0, ny, a: ny < 0 ? Math.PI / 2 : -Math.PI / 2, o };
    }
  }

  // ------------------ Spawn ------------------
  function sp(
    k: PortalKind,
    sx: number, sy: number,
    dx: number, dy: number,
    m: GameMapLike, cH: number
  ) {
    const r = rc(sx, sy, dx, dy, m, cH);
    if (!r) return;

    // play "zip" sound
    zzfx?.(...(zip as unknown as number[]));

    // normalize direction
    const L = Math.hypot(dx, dy) || 1;

    // get orientation from hit normal
    const { nx, ny, a, o } = or(r.axis, r.stepX, r.stepY);

    // distance to hit
    const d = Math.hypot(r.hx - sx, r.hy - sy);

    // total travel time
    const th = Math.min(d, MD) / S;

    // push projectile
    p.push({
      k,
      x: sx, y: sy,
      dx: dx / L, dy: dy / L,
      hx: r.hx, hy: r.hy,
      nx, ny, a, o,
      t: 0, th,
      alive: true
    });
  }

  // ------------------ Update ------------------
  function up(dt: number, onP: PlaceCb) {
    for (let i = p.length - 1; i >= 0; i--) {
      const pr = p[i];

      // advance timer
      pr.t += dt;

      // reached hit
      if (pr.t >= pr.th) {
        onP(pr.k, pr.hx, pr.hy, pr.a, pr.o, {
          hx: pr.hx, hy: pr.hy, nx: pr.nx, ny: pr.ny
        });
        p.splice(i, 1);
      }
    }
  }

  // ------------------ Draw ------------------
  function dr(ctx: CanvasRenderingContext2D, _t?: number) {
    ctx.save();

    for (const pr of p) {
      const tr = Math.min(pr.t, pr.th) * S;

      const px = pr.x + pr.dx * tr;
      const py = pr.y + pr.dy * tr;

      const b = pr.k === "A" ? "40,140,255" : "255,160,40";

      // faint full ray (to wall)
      ctx.strokeStyle = `rgba(${b},0.35)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pr.x, pr.y);
      ctx.lineTo(pr.hx, pr.hy);
      ctx.stroke();

      // bright beam (projectile tail)
      ctx.strokeStyle = `rgba(${b},0.9)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pr.x, pr.y);
      ctx.lineTo(px, py);
      ctx.stroke();

      // tip (small glowing dot)
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ------------------ Public API ------------------
  return {
    spawn: sp,
    update: up,
    draw: dr
  };
}
