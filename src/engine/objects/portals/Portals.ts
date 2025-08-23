// src/engine/objects/portals/Portals.ts
// Lean portals: keep sprite drawing (animator), keep DDA raycast + side/orientation.
// Removed pixel masks and any collision-state toggles.

import type { AtlasAnimator } from "../../../animation/AtlasAnimator";
import { mapOffsetY } from "../../renderer/Space";
import { zzfx } from "../../audio/SoundEngine";
import { zip } from "../../../sfx/zip";
import { isSolidTileId } from "../../../player/Physics";

export type GameMapLike = { width:number; height:number; tiles: Uint32Array | number[] };
export type PortalKind  = "A" | "B";
export type Ori = "R"|"L"|"U"|"D";

export const PORTAL_W = 32;
export const PORTAL_H = 32;

type Portal = { kind: PortalKind; x:number; y:number; angle:number; o:Ori };

const { PI, hypot, sign, min } = Math;
const TAU = PI*2, S = 640, MD = 2000;
const isForbidden = (gid:number)=> gid===134;

// ---------- MANAGER (sprite drawing stays) ----------
export function createPortalManager(TILE:number){
  const slots:{A?:Portal;B?:Portal} = {};
  let animator:AtlasAnimator|null=null, frames=1, fps=10, fw=32, fh=32;

  // tiny scratch only for tinting; NOT used for any footprint/collision
  const sc = document.createElement("canvas"); sc.width=PORTAL_W; sc.height=PORTAL_H;
  const sx = sc.getContext("2d")!;

  function setAnimator(a:AtlasAnimator){
    animator=a;
    fw=a.fw??32; fh=a.fh??32;
    const m=a.getMeta?.("portal");
    frames=Math.max(1,(m?.frameCount??1)|0);
    fps   =Math.max(1,(m?.fps??10)|0);
  }

  function replaceWorld(kind:PortalKind,x:number,y:number,angle:number,o:Ori){
    (kind==="A" ? (slots.A={kind,x,y,angle,o}) : (slots.B={kind,x,y,angle,o}));
  }
  function replace(kind:PortalKind,gx:number,gy:number,o:Ori){
    replaceWorld(kind, gx*TILE + PORTAL_W*.5, gy*TILE + PORTAL_H*.5, o==="U"?PI/2:o==="D"?-PI/2:0, o);
  }
  const clear = ()=>{ slots.A=slots.B=undefined; };
  const getSlots = ()=>slots as {A?:Portal;B?:Portal};

  function drawOne(ctx:CanvasRenderingContext2D,p:Portal,t:number){
    const a=animator; if(!a) return;
    const fi=((t*0.001*fps)|0)%frames;

    // draw frame → tint → blit rotated
    sx.setTransform(PORTAL_W/fw,0,0,PORTAL_H/fh,0,0);
    sx.clearRect(0,0,PORTAL_W,PORTAL_H);
    a.drawFrame(sx as unknown as CanvasRenderingContext2D,"portal",fi,0,0);
    sx.globalCompositeOperation="source-atop";
    sx.fillStyle=p.kind==="A"?"#28f":"#f80";
    sx.fillRect(0,0,PORTAL_W,PORTAL_H);
    sx.globalCompositeOperation="source-over";

    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle);
    ctx.drawImage(sc, 0,0,PORTAL_W,PORTAL_H, -PORTAL_W/2,-PORTAL_H/2,PORTAL_W,PORTAL_H);
    ctx.restore();
  }
  function draw(ctx:CanvasRenderingContext2D,t:number){
    if(slots.A) drawOne(ctx,slots.A,t);
    if(slots.B) drawOne(ctx,slots.B,t);
  }

  return { setAnimator, replaceWorld, replace, clear, draw, getSlots };
}

// ---------- GUN (raycast kept) ----------
export function createPortalGun(T:number){
  type P = { k:PortalKind;x:number;y:number;dx:number;dy:number;hx:number;hy:number;nx:number;ny:number;a:number;o:Ori;t:number;th:number;forbidden:boolean };
  const Q:P[]=[];

  function cast(sx:number,sy:number,dx:number,dy:number,m:GameMapLike,cH:number){
    let L=hypot(dx,dy)||1; dx/=L; dy/=L;
    const oY=mapOffsetY(cH,m.height,T), toTy=(wy:number)=>((wy-oY)/T|0);
    const inb=(x:number,y:number)=>x>=0&&y>=0&&x<m.width&&y<m.height;
    const tid=(x:number,y:number)=> inb(x,y)? (m.tiles as any)[y*m.width+x] as number : 0;
    const solid=(x:number,y:number)=>{ const id=tid(x,y); return id>0&&isSolidTileId(id); };

    let tx=(sx/T)|0, ty=toTy(sy), sX=sign(dx), sY=sign(dy);
    let tX=sX?(((sX>0?tx+1:tx)*T-sx)/dx):1e30, tY=sY?((oY+(sY>0?ty+1:ty)*T-sy)/dy):1e30;
    const dX=sX?T/Math.abs(dx):1e30, dY=sY?T/Math.abs(dy):1e30;

    for(let tr=0; tr<=MD;){
      if(tX<tY){
        tr=tX; tx+=sX; tX+=dX; if(!inb(tx,ty)) break;
        if(solid(tx,ty)){ const f=isForbidden(tid(tx,ty)); return {hx:sx+dx*tr,hy:sy+dy*tr,ax:"x" as const,sX,sY,forbidden:f}; }
      } else {
        tr=tY; ty+=sY; tY+=dY; if(!inb(tx,ty)) break;
        if(solid(ty===ty?tx:tx,ty)){ const f=isForbidden(tid(tx,ty)); return {hx:sx+dx*tr,hy:sy+dy*tr,ax:"y" as const,sX,sY,forbidden:f}; }
      }
    }
    return null;
  }

  function spawn(k:PortalKind,sx:number,sy:number,dx:number,dy:number,m:GameMapLike,cH:number){
    const r=cast(sx,sy,dx,dy,m,cH); if(!r) return;
    if(!r.forbidden) try{ zzfx?.(...(zip as unknown as number[])); }catch{}
    const L=hypot(dx,dy)||1, d=hypot(r.hx-sx,r.hy-sy);
    const nx=r.ax==="x"?(r.sX>0?-1:1):0, ny=r.ax==="y"?(r.sY>0?-1:1):0;
    const a=r.ax==="x"?0:(ny<0?PI/2:-PI/2);
    const o=(nx?(nx<0?"L":"R"):(ny<0?"U":"D")) as Ori;
    Q.push({k,x:sx,y:sy,dx:dx/L,dy:dy/L,hx:r.hx,hy:r.hy,nx,ny,a,o,t:0,th:min(d,MD)/S,forbidden:!!r.forbidden});
  }

  function update(dt:number,onP:(k:PortalKind,x:number,y:number,a:number,o:Ori)=>void){
    for(let i=Q.length;i--;){
      const p=Q[i]; p.t+=dt;
      if(p.t>=p.th){ if(!p.forbidden) onP(p.k,p.hx,p.hy,p.a,p.o); Q.splice(i,1); }
    }
  }

  function draw(ctx:CanvasRenderingContext2D){
    for(const p of Q){
      const tr=min(p.t,p.th)*S, px=p.x+p.dx*tr, py=p.y+p.dy*tr, b=p.k==="A"?"40,140,255":"255,160,40";
      ctx.strokeStyle=`rgba(${b},.9)`; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(px,py); ctx.stroke();
      ctx.fillStyle=p.forbidden?"rgba(255,80,80,.95)":"#fff"; ctx.beginPath(); ctx.arc(px,py,2.5,0,TAU); ctx.fill();
      if(p.t>p.th*.9){ const a=ctx.globalAlpha; ctx.globalAlpha=.6; ctx.fillStyle=p.forbidden?"rgba(255,60,60,.7)":`rgba(${b},.35)`; ctx.beginPath(); ctx.arc(p.hx,p.hy,4.5,0,TAU); ctx.fill(); ctx.globalAlpha=a; }
    }
  }
  const clear=()=>{ Q.length=0; };

  return { spawn, update, draw, clear };
}
