// src/engine/objects/portals/PortalGun.ts
// Visual feedback preserved on forbidden hits: beam flies & impacts, but no placement.

import type { GameMapLike, PortalKind } from "./Portals";
import type { Ori } from "./PortalPlacement";
import { mapOffsetY } from "../../renderer/Space";
import { isSolidTileId } from "../../../player/Physics";
import { zip } from "../../../sfx/zip";
import { zzfx } from "../../audio/SoundEngine";

const S = 640, MD = 2000, TAU = 6.283;
// 🚫 disallowed portal surface IDs
const isForbidden = (id:number)=> id === 134;

export function createPortalGun(T: number) {
  const P: any[] = [];

  // Raycast to first solid tile using grid DDA
  function cast(sx: number, sy: number, dx: number, dy: number, m: GameMapLike, cH: number) {
    let L = Math.hypot(dx, dy) || 1;
    dx /= L; dy /= L;
    const oY = mapOffsetY(cH, m.height, T), toTy = (wy: number) => ((wy - oY) / T | 0);
    let tx = (sx / T) | 0, ty = toTy(sy), sX = Math.sign(dx), sY = Math.sign(dy);
    const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < m.width && y < m.height;
    const tid = (x:number,y:number)=> inb(x,y) ? (m.tiles as any)[y*m.width + x] as number : 0;
    const solid = (x: number, y: number) => { const id=tid(x,y); return id>0 && isSolidTileId(id); };

    let tX = sX ? (((sX > 0 ? tx + 1 : tx) * T - sx) / dx) : 1e30, tY = sY ? ((oY + (sY > 0 ? ty + 1 : ty) * T - sy) / dy) : 1e30;
    const dX = sX ? T / Math.abs(dx) : 1e30, dY = sY ? T / Math.abs(dy) : 1e30;

    for (let tr = 0; tr <= MD;) {
      if (tX < tY) {
        tr = tX; tx += sX; tX += dX;
        if (!inb(tx,ty)) break;
        if (solid(tx, ty)) {
          const f = isForbidden(tid(tx,ty));
          return { hx: sx + dx * tr, hy: sy + dy * tr, ax: "x", sX, sY, forbidden: f };
        }
      } else {
        tr = tY; ty += sY; tY += dY;
        if (!inb(tx,ty)) break;
        if (solid(tx, ty)) {
          const f = isForbidden(tid(tx,ty));
          return { hx: sx + dx * tr, hy: sy + dy * tr, ax: "y", sX, sY, forbidden: f };
        }
      }
    }
    return null;
  }

  function spawn(k:PortalKind, sx:number, sy:number, dx:number, dy:number, m:GameMapLike, cH:number){
    const r = cast(sx,sy,dx,dy,m,cH); if(!r) return;
    // Only play "place" sfx if it's actually placeable
    if (!r.forbidden) try { zzfx?.(...(zip as unknown as number[])); } catch {}
    const L = Math.hypot(dx,dy)||1, d = Math.hypot(r.hx-sx, r.hy-sy);
    const nx = r.ax==="x" ? (r.sX>0?-1:1) : 0;
    const ny = r.ax==="y" ? (r.sY>0?-1:1) : 0;
    const a  = r.ax==="x" ? 0 : (ny<0?Math.PI/2:-Math.PI/2);
    const o  = (nx?(nx<0?"L":"R"):(ny<0?"U":"D")) as Ori;
    // keep projectile for visual line & impact glow; mark forbidden so update() won't place
    P.push({k, x:sx, y:sy, dx:dx/L, dy:dy/L, hx:r.hx, hy:r.hy, nx, ny, a, o, t:0, th:Math.min(d,MD)/S, forbidden: !!r.forbidden});
  }

  function update(dt:number, onP:(k:PortalKind,x:number,y:number,a:number,o:Ori,h?:any)=>void){
    for(let i=P.length;i--;){
      const p=P[i]; p.t+=dt;
      if(p.t>=p.th){
        if (!p.forbidden) onP(p.k,p.hx,p.hy,p.a,p.o,{hx:p.hx,hy:p.hy,nx:p.nx,ny:p.ny});
        P.splice(i,1);
      }
    }
  }

  function draw(ctx:CanvasRenderingContext2D){
    for(const p of P){
      const tr = Math.min(p.t,p.th)*S, px=p.x+p.dx*tr, py=p.y+p.dy*tr, b = p.k==="A"?"40,140,255":"255,160,40";
      // faint full path + bright head
      ctx.strokeStyle=`rgba(${b},.35)`; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.hx,p.hy); ctx.stroke();
      ctx.strokeStyle=`rgba(${b},.9)`;  ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(px,py);  ctx.stroke();
      // head dot
      ctx.fillStyle=p.forbidden?`rgba(255,80,80,.95)`:"#fff";
      ctx.beginPath(); ctx.arc(px,py,2.5,0,TAU); ctx.fill();
      // small impact flash when near end (forbidden shows red)
      if (p.t>p.th*0.9){
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = p.forbidden? "rgba(255,60,60,.7)" : `rgba(${b},.35)`;
        ctx.beginPath(); ctx.arc(p.hx,p.hy,4.5,0,TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  function clear(){ P.length = 0; }

  return { spawn, update, draw, clear };
}
