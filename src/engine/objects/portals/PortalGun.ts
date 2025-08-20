// src/engine/objects/portals/PortalGun.ts
// Grid-free portal shots. Raycast to first solid face, derive the normal,
// and place a portal at the hit point with rotation from that normal.
// update() accepts BOTH (dt, onPlace) and (dt, map, canvasH, onPlace).
//
// CHANGE: Bounds are not colliders. OOB is empty. If the ray exits the map
// *after having entered it at least once*, we abort with no hit.

import type { GameMapLike, PortalKind } from "./Portals";
import type { Ori } from "./PortalPlacement";
import { mapOffsetY } from "../../renderer/Space";
import { isSolidTileId } from "../../../player/Physics";

type Axis = "x" | "y";
type Projectile = {
  kind: PortalKind;
  x: number; y: number;      // start (world px)
  dx: number; dy: number;    // normalized direction
  hitX: number; hitY: number;// impact point (world px)
  nx: number; ny: number;    // surface normal at impact (axis-aligned)
  angle: number;             // sprite rotation (radians)
  o: Ori;                    // "L","R","U","D"
  axis: Axis;                // which boundary we hit (for debug viz)
  t: number; tHit: number;
  alive: boolean;
};

export type PlaceCb = (
  kind: PortalKind,
  x: number, y: number,      // world center
  angle: number,             // rotation to apply to the vertical sprite
  o: Ori,                    // cardinal orientation
  hit?: { hitX:number; hitY:number; nx:number; ny:number }
) => void;

const SPEED = 640;     // px/s
const MAX_DIST = 2000; // px
const EPS_T = 1e-7;

export function createPortalGun(TILE: number) {
  const projectiles: Projectile[] = [];

  // ---- DDA raycast against tile solids (returns axis hit + normal) ----
  type AxisHit = {
    axis: Axis; stepX: number; stepY: number;
    tx: number; ty: number; hitX:number; hitY:number; tHit:number; offY:number
  };

  function raycast(
    sx:number, sy:number, dx:number, dy:number,
    map:GameMapLike, canvasH:number
  ): AxisHit | null {
    const offY = mapOffsetY(canvasH, map.height, TILE);

    // normalize direction
    const mag = Math.hypot(dx, dy) || 1;
    dx /= mag; dy /= mag;

    // starting cell (may be OOB)
    let ix = Math.floor(sx / TILE);
    let iy = Math.floor((sy - offY) / TILE);

    const inb = (tx:number,ty:number)=> tx>=0 && ty>=0 && tx<map.width && ty<map.height;
    let entered = inb(ix, iy); // track whether we've ever been in-bounds

    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;

    const INF = 1e30;
    const tDeltaX = stepX ? (TILE / Math.abs(dx)) : INF;
    const tDeltaY = stepY ? (TILE / Math.abs(dy)) : INF;

    const nextGX = stepX > 0 ? ((ix + 1) * TILE) : (ix * TILE);
    const nextGY = stepY > 0 ? (offY + (iy + 1) * TILE) : (offY + iy * TILE);
    let tMaxX = stepX ? ((nextGX - sx) / dx) : INF;
    let tMaxY = stepY ? ((nextGY - sy) / dy) : INF;

    const isSolid = (tx:number, ty:number)=>{
      if (!inb(tx, ty)) return false; // OOB is empty (key change)
      const id = (map.tiles as any)[ty * map.width + tx] as number;
      return id > 0 && isSolidTileId(id);
    };

    for (let iter=0; iter<4096; iter++) {
      const tNext = Math.min(tMaxX, tMaxY);
      if (tNext * mag > MAX_DIST) return null;

      // Corner: both boundaries at once → choose by dominant component.
      if (Math.abs(tMaxX - tMaxY) <= EPS_T) {
        const tB = tMaxX;
        const ixV = ix + stepX;
        const iyH = iy + stepY;

        const vIn = inb(ixV, iy);
        const hIn = inb(ix, iyH);
        const vSolid = vIn && isSolid(ixV, iy);
        const hSolid = hIn && isSolid(ix, iyH);

        if (vSolid || hSolid) {
          const axis: Axis = (vSolid && hSolid)
            ? (Math.abs(dx) >= Math.abs(dy) ? "x" : "y")
            : (vSolid ? "x" : "y");
          const hitX = sx + dx * tB;
          const hitY = sy + dy * tB;
          if (axis === "x") return { axis, stepX, stepY, tx: ixV, ty: iy, hitX, hitY, tHit:tB, offY };
          return { axis, stepX, stepY, tx: ix, ty: iyH, hitX, hitY, tHit:tB, offY };
        }

        // advance diagonally
        ix = ixV; iy = iyH;
        if (inb(ix, iy)) entered = true;
        else if (entered) return null; // we left the map after having been inside
        tMaxX += tDeltaX; tMaxY += tDeltaY;
        continue;
      }

      if (tMaxX < tMaxY) {
        const tB = tMaxX; ix += stepX;
        if (inb(ix, iy)) {
          entered = true;
          if (isSolid(ix, iy)) {
            const hitX = sx + dx * tB, hitY = sy + dy * tB;
            return { axis:"x", stepX, stepY, tx:ix, ty:iy, hitX, hitY, tHit:tB, offY };
          }
        } else if (entered) {
          return null; // exiting map after entering ⇒ no hit
        }
        tMaxX += tDeltaX;
      } else {
        const tB = tMaxY; iy += stepY;
        if (inb(ix, iy)) {
          entered = true;
          if (isSolid(ix, iy)) {
            const hitX = sx + dx * tB, hitY = sy + dy * tB;
            return { axis:"y", stepX, stepY, tx:ix, ty:iy, hitX, hitY, tHit:tB, offY };
          }
        } else if (entered) {
          return null;
        }
        tMaxY += tDeltaY;
      }
    }
    return null;
  }

  function orientationFrom(axis:Axis, stepX:number, stepY:number): { nx:number; ny:number; angle:number; o:Ori } {
    if (axis === "x") {
      // vertical boundary: normal points ±X; sprite vertical → angle 0
      const nx = stepX > 0 ? -1 : 1;
      const o: Ori = nx < 0 ? "L" : "R";
      return { nx, ny:0, angle:0, o };
    } else {
      // horizontal boundary: normal points ±Y; rotate 90° for floor/ceiling
      const ny = stepY > 0 ? -1 : 1;
      const o: Ori = ny < 0 ? "U" : "D";
      const angle = ny < 0 ? Math.PI/2 : -Math.PI/2;
      return { nx:0, ny, angle, o };
    }
  }

  function spawn(
    kind: PortalKind,
    sx:number, sy:number, dx:number, dy:number,
    map: GameMapLike, canvasH:number
  ) {
    const L = Math.hypot(dx,dy); if (L < 1e-6) return;
    dx/=L; dy/=L;

    const rc = raycast(sx, sy, dx, dy, map, canvasH);
    if (!rc) return;

    const { nx, ny, angle, o } = orientationFrom(rc.axis, rc.stepX, rc.stepY);

    projectiles.push({
      kind,
      x:sx, y:sy, dx, dy,
      hitX: rc.hitX, hitY: rc.hitY,
      nx, ny, angle, o,
      axis: rc.axis,
      t:0, tHit: Math.min(Math.max(rc.tHit,0), MAX_DIST) / SPEED,
      alive: true
    });
  }

  // Backward-compatible update:
  // - new style: update(dt, onPlace)
  // - old style: update(dt, map, canvasH, onPlace)
  function update(
    dt: number,
    a?: unknown, b?: unknown, c?: unknown
  ) {
    // normalize callback
    let onPlace: PlaceCb | undefined;
    if (typeof a === "function") {
      onPlace = a as PlaceCb;
    } else if (typeof c === "function") {
      onPlace = c as PlaceCb;
    }
    const cb: PlaceCb = (typeof onPlace === "function")
      ? onPlace!
      : (() => {}) as PlaceCb; // safe no-op

    for (let i=projectiles.length-1; i>=0; i--) {
      const p = projectiles[i];
      if (!p.alive) { projectiles.splice(i,1); continue; }
      p.t += dt;
      if (p.t >= p.tHit) {
        cb(p.kind, p.hitX, p.hitY, p.angle, p.o, { hitX:p.hitX, hitY:p.hitY, nx:p.nx, ny:p.ny });
        p.alive = false;
        projectiles.splice(i,1);
      }
    }
  }

  function draw(ctx:CanvasRenderingContext2D, _t:number) {
    ctx.save();
    for (const p of projectiles) {
      const travel = Math.min(p.t, p.tHit) * SPEED;
      const px = p.x + p.dx * travel, py = p.y + p.dy * travel;
      const hx = p.hitX, hy = p.hitY;
      const base = p.kind === "A" ? "40,140,255" : "255,160,40";

      // 1) full ray (spawn → hit) faint
      ctx.strokeStyle = `rgba(${base},0.35)`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(hx, hy); ctx.stroke();

      // 2) traveled segment (spawn → current) bright
      ctx.strokeStyle = `rgba(${base},0.9)`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(px, py); ctx.stroke();

      // 3) projectile dot
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI*2); ctx.fill();

      // 4) impact marker
      ctx.fillStyle = `rgba(${base},0.9)`;
      ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI*2); ctx.fill();

      // 5) normal arrow from hit
      const nx = p.nx, ny = p.ny, L = 16;
      const tx = hx + nx * L, ty = hy + ny * L;
      ctx.strokeStyle = `rgba(${base},0.9)`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      // arrow head (two small legs)
      const ax = -ny, ay = nx; // perp
      const s = 5;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - nx*6 + ax*s, ty - ny*6 + ay*s);
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - nx*6 - ax*s, ty - ny*6 - ay*s);
      ctx.stroke();

      // 6) tiny orientation label near arrow tip
      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.fillText(p.o, tx + 3, ty + 3);
    }
    ctx.restore();
  }

  return { spawn, update, draw };
}
