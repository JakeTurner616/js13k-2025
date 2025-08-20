// src/engine/objects/portals/PortalGun.ts
import type { GameMapLike, PortalKind } from "./Portals";
import type { Ori } from "./PortalPlacement";
import { mapOffsetY } from "../../renderer/Space";
import { isSolidTileId } from "../../../player/Physics";
import { zip } from "../../../sfx/zip";
import { zzfx } from "../../audio/SoundEngine";

const S = 640, MD = 2000, TAU = 6.283;

export function createPortalGun(T: number) {
  const P: any[] = [];

  // Raycast to first solid tile using grid DDA
function cast(sx: number, sy: number, dx: number, dy: number, m: GameMapLike, cH: number) {
    let L = Math.hypot(dx, dy) || 1;
    dx /= L; dy /= L;
    const oY = mapOffsetY(cH, m.height, T), toTy = (wy: number) => ((wy - oY) / T | 0);
    let tx = (sx / T) | 0, ty = toTy(sy), sX = Math.sign(dx), sY = Math.sign(dy);
    const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < m.width && y < m.height;
    const sol = (x: number, y: number) => inb(x, y) && isSolidTileId((m.tiles as any)[y * m.width + x] as number);
    let tX = sX ? (((sX > 0 ? tx + 1 : tx) * T - sx) / dx) : 1e30, tY = sY ? ((oY + (sY > 0 ? ty + 1 : ty) * T - sy) / dy) : 1e30;
    const dX = sX ? T / Math.abs(dx) : 1e30, dY = sY ? T / Math.abs(dy) : 1e30;
    for (let tr = 0; tr <= MD;) {
        if (tX < tY) { tr = tX; tx += sX; tX += dX; if (sol(tx, ty)) return { hx: sx + dx * tr, hy: sy + dy * tr, ax: "x", sX, sY }; }
        else         { tr = tY; ty += sY; tY += dY; if (sol(tx, ty)) return { hx: sx + dx * tr, hy: sy + dy * tr, ax: "y", sX, sY }; }
        if (!inb(tx, ty)) break;
    }
    return null;
}

  function spawn(k:PortalKind, sx:number, sy:number, dx:number, dy:number, m:GameMapLike, cH:number){
    const r = cast(sx,sy,dx,dy,m,cH); if(!r) return;
    zzfx?.(...(zip as unknown as number[]));
    const L = Math.hypot(dx,dy)||1, d = Math.hypot(r.hx-sx, r.hy-sy);
    const nx = r.ax==="x" ? (r.sX>0?-1:1) : 0;
    const ny = r.ax==="y" ? (r.sY>0?-1:1) : 0;
    const a  = r.ax==="x" ? 0 : (ny<0?Math.PI/2:-Math.PI/2);
    const o  = (nx?(nx<0?"L":"R"):(ny<0?"U":"D")) as Ori;
    P.push({k, x:sx, y:sy, dx:dx/L, dy:dy/L, hx:r.hx, hy:r.hy, nx, ny, a, o, t:0, th:Math.min(d,MD)/S});
  }

  function update(dt:number, onP:(k:PortalKind,x:number,y:number,a:number,o:Ori,h?:any)=>void){
    for(let i=P.length;i--;){
      const p=P[i]; p.t+=dt;
      if(p.t>=p.th){ onP(p.k,p.hx,p.hy,p.a,p.o,{hx:p.hx,hy:p.hy,nx:p.nx,ny:p.ny}); P.splice(i,1); }
    }
  }

  function draw(ctx:CanvasRenderingContext2D){
    for(const p of P){
      const tr = Math.min(p.t,p.th)*S, px=p.x+p.dx*tr, py=p.y+p.dy*tr, b = p.k==="A"?"40,140,255":"255,160,40";
      ctx.strokeStyle=`rgba(${b},.35)`; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.hx,p.hy); ctx.stroke();
      ctx.strokeStyle=`rgba(${b},.9)`;  ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(px,py);  ctx.stroke();
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(px,py,2.5,0,TAU); ctx.fill();
    }
  }

  return { spawn, update, draw };
}
