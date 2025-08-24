// src/player/Physics.ts
import { getCurrentMap } from "../engine/renderer/MapContext";
import { G, T as S } from "./Core";

export type Vec2={x:number;y:number};
export interface PhysicsBody{
  pos:Vec2; vel:Vec2; acc?:Vec2;
  width:number; height:number; hit?:{x:number;y:number;w:number;h:number};
  grounded:boolean; gravity?:number; bounce?:number; collide?:boolean;
  touchL?:boolean; touchR?:boolean; _touchL?:boolean; _touchR?:boolean;
  cling?:boolean; clingSlide?:number; hitWall?:number; _hitWall?:number;
}
export interface TileMapLike{width:number;height:number;tiles:number[]|Uint32Array}

const AIR=.002,GFRIC=.08,CEIL=.25,VX_MAX=5,VY_MAX=8;

const solid=new Set<number>();
export const setSolidTiles=(ids:number[])=>{solid.clear();for(const i of ids)solid.add(i)};
export const isSolidTileId=(id:number)=>solid.has(id);

export const applyPhysics=(b:PhysicsBody,ctx:CanvasRenderingContext2D,mapOverride?:TileMapLike,topAligned=false)=>{
  const m=mapOverride||getCurrentMap();

  // reset contacts
  b.touchL=b.touchR=b._touchL=b._touchR=false;
  b.hitWall=b._hitWall=0;

  // integrate+damp
  const a=b.acc, g=b.gravity??G;
  b.vel.y+=g; if(a){b.vel.x+=a.x; b.vel.y+=a.y;}
  b.vel.x*=1-(b.grounded?GFRIC:AIR);

  // clamp
  const c=(v:number,lo:number,hi:number)=>v<lo?lo:v>hi?hi:v;
  b.vel.x=c(b.vel.x,-VX_MAX,VX_MAX);
  b.vel.y=c(b.vel.y,-VY_MAX,VY_MAX);

  const enabled=b?.collide!==false && !!m;

  // hitbox metrics
  const hb=b.hit, hx=hb?hb.x:0, hy=hb?hb.y:0, hw=hb?hb.w:b.width, hh=hb?hb.h:b.height;

  // collider
  let hitAny:()=>boolean=()=>false;
  if(enabled){
    const mm=m as TileMapLike, T=mm.tiles as any, mw=mm.width|0, mh=mm.height|0, Y0=topAligned?0:(ctx.canvas.height-mh*S);
    hitAny=()=>{
      let L=(b.pos.x+hx)|0, R=(b.pos.x+hx+hw-1)|0, T0=(b.pos.y+hy)|0, B0=(b.pos.y+hy+hh-1)|0;
      let x0=(L/S)|0, x1=(R/S)|0, y0=((T0-Y0)/S)|0, y1=((B0-Y0)/S)|0;
      if(x0<0)x0=0; if(y0<0)y0=0; if(x1>=mw)x1=mw-1; if(y1>=mh)y1=mh-1;
      for(let ty=y0;ty<=y1;ty++){ const row=ty*mw;
        for(let tx=x0;tx<=x1;tx++){ if(solid.has(T[row+tx] as number)) return true; }
      }
      return false;
    };
  }

  // H
  const vx=b.vel.x;
  if(vx){
    b.pos.x+=vx;
    if(hitAny()){
      b.pos.x-=vx;
      if(vx>0){ b.touchR=b._touchR=true; b.hitWall=b._hitWall=+1; }
      else    { b.touchL=b._touchL=true; b.hitWall=b._hitWall=-1; }
      b.vel.x=0; b.vel.y=0; b.grounded=false;
    }
  }

  // V
  const vy=b.vel.y;
  if(vy){
    b.pos.y+=vy;
    if(hitAny()){
      b.pos.y-=vy;
      if(vy>0){ b.vel.y=0; b.grounded=true; }
      else{ const ny=(b.touchL||b.touchR)?0:-vy*(b.bounce??CEIL); b.vel.y=Math.abs(ny)<.2?0:ny; b.grounded=false; }
    } else b.grounded=false;
  }
};
