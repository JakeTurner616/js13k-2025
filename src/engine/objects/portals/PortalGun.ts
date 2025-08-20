// src/engine/objects/portals/PortalGun.ts
// Raycast to first solid face, derive normal+orientation, animate a tracer.
// OOB is empty; if the ray exits after having entered once, we abort.

import type { GameMapLike, PortalKind } from "./Portals";
import type { Ori } from "./PortalPlacement";
import { mapOffsetY } from "../../renderer/Space";
import { isSolidTileId } from "../../../player/Physics";
import { zip } from "../../../sfx/zip";
import { zzfx } from "../../audio/SoundEngine"; // ✅ import actual zzfx

type Axis = "x" | "y";
type Projectile = {
  kind: PortalKind;
  x:number; y:number; dx:number; dy:number; // normalized for tracer
  hitX:number; hitY:number;
  nx:number; ny:number; angle:number; o:Ori;
  t:number; tHit:number; alive:boolean;
};

export type PlaceCb = (
  kind: PortalKind,
  x:number, y:number,
  angle:number,
  o:Ori,
  hit?: { hitX:number; hitY:number; nx:number; ny:number }
)=>void;

const SPEED = 640;     // px/s (for tracer)
const MAX_DIST = 2000; // px
const EPS_T = 1e-7;

export function createPortalGun(TILE:number){
  const projectiles: Projectile[] = [];

  type Hit = { axis:Axis; stepX:number; stepY:number; tHit:number; hitX:number; hitY:number };

  function raycast(
    sx:number, sy:number, dx:number, dy:number,
    map:GameMapLike, canvasH:number
  ): Hit | null {
    // Normalize ONCE; with |d|=1, DDA 't' is world distance. (No t*mag!)
    const L = Math.hypot(dx, dy) || 1;
    dx /= L; dy /= L;

    const offY = mapOffsetY(canvasH, map.height, TILE);
    let ix = Math.floor(sx / TILE);
    let iy = Math.floor((sy - offY) / TILE);

    const inb = (tx:number,ty:number)=> tx>=0 && ty>=0 && tx<map.width && ty<map.height;
    let entered = inb(ix, iy);

    const stepX = dx>0 ? 1 : dx<0 ? -1 : 0;
    const stepY = dy>0 ? 1 : dy<0 ? -1 : 0;

    const INF = 1e30;
    const tDeltaX = stepX ? (TILE / Math.abs(dx)) : INF;
    const tDeltaY = stepY ? (TILE / Math.abs(dy)) : INF;

    const nextGX = stepX>0 ? (ix+1)*TILE : ix*TILE;
    const nextGY = stepY>0 ? (offY+(iy+1)*TILE) : (offY+iy*TILE);
    let tMaxX = stepX ? ((nextGX - sx) / dx) : INF;
    let tMaxY = stepY ? ((nextGY - sy) / dy) : INF;

    const isSolid = (tx:number, ty:number)=>{
      if (!inb(tx, ty)) return false; // OOB is empty
      const id = (map.tiles as any)[ty*map.width + tx] as number;
      return id>0 && isSolidTileId(id);
    };

    for (let iter=0; iter<8192; iter++){
      const tNext = Math.min(tMaxX, tMaxY);
      if (tNext > MAX_DIST) return null;

      // Corner tie: probe both neighbors; if both solid, choose dominant component
      if (Math.abs(tMaxX - tMaxY) <= EPS_T){
        const tB = tMaxX;
        const ixV = ix + stepX;
        const iyH = iy + stepY;

        const vIn = inb(ixV, iy),  hIn = inb(ix, iyH);
        const vSo = vIn && isSolid(ixV, iy);
        const hSo = hIn && isSolid(ix, iyH);

        if (vSo || hSo){
          const axis:Axis = (vSo && hSo)
            ? (Math.abs(dx) >= Math.abs(dy) ? "x" : "y")
            : (vSo ? "x" : "y");
          const hitX = sx + dx*tB, hitY = sy + dy*tB;
          return { axis, stepX, stepY, tHit:tB, hitX, hitY };
        }

        ix = ixV; iy = iyH;
        if (inb(ix, iy)) entered = true; else if (entered) return null;
        tMaxX += tDeltaX; tMaxY += tDeltaY;
        continue;
      }

      if (tMaxX < tMaxY){
        const tB = tMaxX; ix += stepX;
        if (inb(ix, iy)){
          entered = true;
          if (isSolid(ix, iy)){
            const hitX = sx + dx*tB, hitY = sy + dy*tB;
            return { axis:"x", stepX, stepY, tHit:tB, hitX, hitY };
          }
        } else if (entered) return null;
        tMaxX += tDeltaX;
      } else {
        const tB = tMaxY; iy += stepY;
        if (inb(ix, iy)){
          entered = true;
          if (isSolid(ix, iy)){
            const hitX = sx + dx*tB, hitY = sy + dy*tB;
            return { axis:"y", stepX, stepY, tHit:tB, hitX, hitY };
          }
        } else if (entered) return null;
        tMaxY += tDeltaY;
      }
    }
    return null;
  }

  function orientationFrom(axis:Axis, stepX:number, stepY:number){
    if (axis === "x"){
      const nx = stepX>0 ? -1 : 1;
      const o:Ori = nx<0 ? "L" : "R";
      return { nx, ny:0, angle:0, o };
    } else {
      const ny = stepY>0 ? -1 : 1;
      const o:Ori = ny<0 ? "U" : "D";
      const angle = ny<0 ? Math.PI/2 : -Math.PI/2;
      return { nx:0, ny, angle, o };
    }
  }

  function spawn(kind:PortalKind, sx:number, sy:number, dx:number, dy:number, map:GameMapLike, canvasH:number){
    const rc = raycast(sx, sy, dx, dy, map, canvasH);
    if (!rc) return;

    // 🔊 fire SFX when spawning a portal shot
    zzfx?.(...(zip as unknown as number[]));

    // normalized dir for tracer
    const L = Math.hypot(dx, dy) || 1;
    const ndx = dx / L, ndy = dy / L;

    const { nx, ny, angle, o } = orientationFrom(rc.axis, rc.stepX, rc.stepY);
    const tHit = Math.max(0, Math.min(rc.tHit, MAX_DIST)) / SPEED; // seconds for tracer

    projectiles.push({
      kind, x:sx, y:sy, dx:ndx, dy:ndy,
      hitX:rc.hitX, hitY:rc.hitY, nx, ny, angle, o,
      t:0, tHit, alive:true
    });
  }

  // new-style update signature: update(dt, onPlace)
  function update(dt:number, onPlace:PlaceCb){
    for (let i=projectiles.length-1; i>=0; i--){
      const p = projectiles[i];
      if (!p.alive) { projectiles.splice(i,1); continue; }
      p.t += dt;
      if (p.t >= p.tHit){
        onPlace(p.kind, p.hitX, p.hitY, p.angle, p.o, { hitX:p.hitX, hitY:p.hitY, nx:p.nx, ny:p.ny });
        p.alive = false;
        projectiles.splice(i,1);
      }
    }
  }

  function draw(ctx:CanvasRenderingContext2D, _t:number){
    ctx.save();
    for (const p of projectiles){
      const travel = Math.min(p.t, p.tHit) * SPEED;
      const px = p.x + p.dx*travel, py = p.y + p.dy*travel;
      const hx = p.hitX, hy = p.hitY;
      const base = p.kind === "A" ? "40,140,255" : "255,160,40";

      ctx.strokeStyle = `rgba(${base},0.35)`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(hx, hy); ctx.stroke();

      ctx.strokeStyle = `rgba(${base},0.9)`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(px, py); ctx.stroke();

      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  return { spawn, update, draw };
}
