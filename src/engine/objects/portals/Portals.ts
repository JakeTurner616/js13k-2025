// src/engine/objects/portals/Portals.ts
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
export type FootprintMask = { w:number; h:number; data:Uint8Array; bbox:{x0:number;y0:number;x1:number;y1:number} };

const {cos,sin,sign,hypot,PI,round,max,min} = Math;
const TAU = PI*2, S = 640, MD = 2000;
const isForbidden = (gid:number)=> gid===134;

const mkBBox=()=>({x0:1e9,y0:1e9,x1:-1e9,y1:-1e9});
const touch=(b:FootprintMask["bbox"],x:number,y:number)=>{ if(x<b.x0)b.x0=x; if(y<b.y0)b.y0=y; if(x>b.x1)b.x1=x; if(y>b.y1)b.y1=y; };
const hasBBox=(b:FootprintMask["bbox"])=> b.x1>=b.x0 && b.y1>=b.y0;

// ---------- Portal MANAGER ----------
export function createPortalManager(TILE:number){
  const PW=PORTAL_W, PH=PORTAL_H;
  const slots:{A?:Portal;B?:Portal} = {};
  let animator:AtlasAnimator|null=null, fw=32, fh=32, frames=1, fps=10;

  const sc = document.createElement("canvas"); sc.width=PW; sc.height=PH;
  const sx = sc.getContext("2d")!;

  // union + outer/inner
  const raw :FootprintMask = { w:PW, h:PH, data:new Uint8Array(PW*PH), bbox:mkBBox() };
  const outer:FootprintMask = { w:PW, h:PH, data:new Uint8Array(PW*PH), bbox:mkBBox() };
  const inner:FootprintMask = { w:PW, h:PH, data:new Uint8Array(PW*PH), bbox:mkBBox() };

  const clearMask=(m:FootprintMask)=>{ m.data.fill(0); m.bbox=mkBBox(); };
  const hitMask=(m:FootprintMask,x:number,y:number)=> !(x<m.bbox.x0||y<m.bbox.y0||x>m.bbox.x1||y>m.bbox.y1||x<0||y<0||x>=m.w||y>=m.h) && !!m.data[y*m.w+x];

  function rebuildMask(){
    if(!animator) return;
    clearMask(raw); clearMask(outer); clearMask(inner);

    // ✅ union only frame 0 (smaller, same gameplay)
    sx.setTransform(PW/fw,0,0,PH/fh,0,0);
    sx.clearRect(0,0,PW,PH);
    animator!.drawFrame(sx as unknown as CanvasRenderingContext2D, "portal", 0, 0, 0);
    const id = sx.getImageData(0,0,PW,PH).data;
    for(let y=0,i=3;y<PH;y++){
      for(let x=0;x<PW;x++,i+=4){
        if(id[i]>8){ const q=y*PW+x; if(!raw.data[q]){ raw.data[q]=1; touch(raw.bbox,x,y); } }
      }
    }
    if(!hasBBox(raw.bbox)) raw.bbox={x0:0,y0:0,x1:-1,y1:-1};

    // one pass neighbors → inner/outer
    for(let y=0;y<PH;y++){
      const ym1=y-1, yp1=y+1;
      for(let x=0;x<PW;x++){
        const i=y*PW+x; if(!raw.data[i]) continue;
        const up=ym1>=0?raw.data[ym1*PW+x]:0, dn=yp1<PH?raw.data[yp1*PW+x]:0;
        const lf=x>0?raw.data[i-1]:0, rt=x<PW-1?raw.data[i+1]:0;
        if(up&&dn&&lf&&rt){ inner.data[i]=1; touch(inner.bbox,x,y); }
        const P=(qx:number,qy:number)=>{ const qi=qy*PW+qx; if(!outer.data[qi]){ outer.data[qi]=1; touch(outer.bbox,qx,qy); } };
        P(x,y); if(x)P(x-1,y); if(x<PW-1)P(x+1,y); if(y)P(x,y-1); if(y<PH-1)P(x,y+1);
      }
    }
    if(!hasBBox(outer.bbox)) outer.bbox={x0:0,y0:0,x1:-1,y1:-1};
    if(!hasBBox(inner.bbox)) inner.bbox={x0:0,y0:0,x1:-1,y1:-1};

    sx.setTransform(1,0,0,1,0,0);
  }

  function setAnimator(a:AtlasAnimator){
    animator=a;
    fw=a.fw??32; fh=a.fh??32;
    const m=a.getMeta?.("portal");
    frames=max(1,(m?.frameCount??1)|0);
    fps   =max(1,(m?.fps??10)|0);
    rebuildMask();
  }

  function replaceWorld(kind:PortalKind,x:number,y:number,angle:number,o:Ori){
    (kind==="A" ? (slots.A={kind,x,y,angle,o}) : (slots.B={kind,x,y,angle,o}));
  }
  function replace(kind:PortalKind,gx:number,gy:number,o:Ori){
    replaceWorld(kind, gx*TILE + PW*.5, gy*TILE + PH*.5, o==="U"?PI/2:o==="D"?-PI/2:0, o);
  }
  const clear = ()=>{ slots.A=slots.B=undefined; };
  const getSlots = ()=>slots as {A?:Portal;B?:Portal};
  const getFootprintMask=()=>raw;

  function drawOne(ctx:CanvasRenderingContext2D,p:Portal,t:number){
    const a=animator; if(!a) return;
    const fi=((t*0.001*fps)|0)%frames;

    // base frame → scratch → tint (no alpha juggling)
    sx.setTransform(PW/fw,0,0,PH/fh,0,0);
    sx.clearRect(0,0,PW,PH);
    a.drawFrame(sx as unknown as CanvasRenderingContext2D,"portal",fi,0,0);
    sx.globalCompositeOperation="source-atop";
    sx.fillStyle=p.kind==="A"?"#28f":"#f80";
    sx.fillRect(0,0,PW,PH);
    sx.globalCompositeOperation="source-over";

    // blit rotated
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle);
    ctx.drawImage(sc, 0,0,PW,PH, -PW/2,-PH/2,PW,PH);
    ctx.restore();
  }
  function draw(ctx:CanvasRenderingContext2D,t:number){
    if(slots.A) drawOne(ctx,slots.A,t);
    if(slots.B) drawOne(ctx,slots.B,t);
  }

  return { setAnimator, replaceWorld, replace, clear, draw, getSlots, getFootprintMask };
}

// ---------- Portal GUN ----------
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
        if(solid(tx,ty)){ const f=isForbidden(tid(tx,ty)); return {hx:sx+dx*tr,hy:sy+dy*tr,ax:"x",sX,sY,forbidden:f}; }
      } else {
        tr=tY; ty+=sY; tY+=dY; if(!inb(tx,ty)) break;
        if(solid(tx,ty)){ const f=isForbidden(tid(tx,ty)); return {hx:sx+dx*tr,hy:sy+dy*tr,ax:"y",sX,sY,forbidden:f}; }
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

  function update(dt:number,onP:(k:PortalKind,x:number,y:number,a:number,o:Ori,h?:any)=>void){
    for(let i=Q.length;i--;){
      const p=Q[i]; p.t+=dt;
      if(p.t>=p.th){ if(!p.forbidden) onP(p.k,p.hx,p.hy,p.a,p.o,{hx:p.hx,hy:p.hy,nx:p.nx,ny:p.ny}); Q.splice(i,1); }
    }
  }

  function draw(ctx:CanvasRenderingContext2D){
    for(const p of Q){
      const tr=min(p.t,p.th)*S, px=p.x+p.dx*tr, py=p.y+p.dy*tr, b=p.k==="A"?"40,140,255":"255,160,40";
      // slimmer: only growing beam + head + hit ring
      ctx.strokeStyle=`rgba(${b},.9)`; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(px,py); ctx.stroke();
      ctx.fillStyle=p.forbidden?"rgba(255,80,80,.95)":"#fff"; ctx.beginPath(); ctx.arc(px,py,2.5,0,TAU); ctx.fill();
      if(p.t>p.th*.9){ const a=ctx.globalAlpha; ctx.globalAlpha=.6; ctx.fillStyle=p.forbidden?"rgba(255,60,60,.7)":`rgba(${b},.35)`; ctx.beginPath(); ctx.arc(p.hx,p.hy,4.5,0,TAU); ctx.fill(); ctx.globalAlpha=a; }
    }
  }
  const clear=()=>{ Q.length=0; };

  return { spawn, update, draw, clear };
}

// Placement helpers (keep only if used elsewhere)
// snapEven/isFootprintEmpty/hasSupport/validateExact … (unchanged or delete if unused)
export const snapEven=(t:number)=> (t&~1);
const inb=(m:GameMapLike,x:number,y:number)=> x>=0&&y>=0&&x<m.width&&y<m.height;
const id =(m:GameMapLike,x:number,y:number)=> (m.tiles as any)[y*m.width+x] as number;

export function isFootprintEmpty(m:GameMapLike,gx:number,gy:number){
  if(!inb(m,gx,gy)||!inb(m,gx+1,gy+1)) return false;
  return id(m,gx,gy)===0 && id(m,gx+1,gy)===0 && id(m,gx,gy+1)===0 && id(m,gx+1,gy+1)===0;
}
export function hasSupport(m:GameMapLike,gx:number,gy:number,o:Ori){
  const tile=(x:number,y:number)=> inb(m,x,y)? id(m,x,y) : 0;
  const ok=(gid:number)=> gid>0 && isSolidTileId(gid) && !isForbidden(gid);
  if(o==="R") return ok(tile(gx-1,gy))&&ok(tile(gx-1,gy+1));
  if(o==="L") return ok(tile(gx+2,gy))&&ok(tile(gx+2,gy+1));
  if(o==="U") return ok(tile(gx,gy+2))&&ok(tile(gx+1,gy+2));
  return ok(tile(gx,gy-1))&&ok(tile(gx+1,gy-1));
}
export function validateExact(m:GameMapLike,gx:number,gy:number,o:Ori){
  const bounds=inb(m,gx,gy)&&inb(m,gx+1,gy+1);
  const footOK=bounds&&isFootprintEmpty(m,gx,gy);
  const suppOK=bounds&&hasSupport(m,gx,gy,o);
  return { ok: bounds&&footOK&&suppOK, bounds, footOK, suppOK };
}
