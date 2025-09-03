// src/player/Physics.ts
import { getCurrentMap } from "../engine/renderer/level-loader";
import { G, T as S } from "./Core";
import { hb as getHB } from "./hb";

export type Vec2={x:number;y:number};
export interface PhysicsBody{
  pos:Vec2; vel:Vec2; acc?:Vec2;
  width:number; height:number; hit?:{x:number;y:number;w:number;h:number};
  grounded:boolean; gravity?:number; bounce?:number;
}
export interface TileMapLike{width:number;height:number;tiles:number[]|Uint32Array}

const AIR=.002,GFRIC=.08,CEIL=.25,VX_MAX=5,VY_MAX=8;

const solid=new Set<number>();
export const setSolidTiles=(ids:number[])=>{ solid.clear(); for(const i of ids) solid.add(i) };
export const isSolidTileId=(id:number)=>solid.has(id);

export const applyPhysics=(b:PhysicsBody,ctx:CanvasRenderingContext2D,mapOverride?:TileMapLike,topAligned=false)=>{
  const m=mapOverride||getCurrentMap();

  const a=b.acc, g=b.gravity??G;
  if(a){ b.vel.x+=a.x; b.vel.y+=a.y; }
  b.vel.y+=g;
  b.vel.x*=1-(b.grounded?GFRIC:AIR);

  // clamp
  let v=b.vel.x; if(v<-VX_MAX)v=-VX_MAX; else if(v>VX_MAX)v=VX_MAX; b.vel.x=v;
  v=b.vel.y; if(v<-VY_MAX)v=-VY_MAX; else if(v>VY_MAX)v=VY_MAX; b.vel.y=v;

  const enabled=!!m;

  // hitbox via shared helper (DRY)
  const H=getHB(b), hx=H.x, hy=H.y, hw=H.w, hh=H.h;

  let hitAny=()=>false;
  if(enabled){
    const mm=m as TileMapLike, T=mm.tiles as any, mw=mm.width|0, mh=mm.height|0, Y0=topAligned?0:(ctx.canvas.height-mh*S);
    hitAny=()=>{
      let L=(b.pos.x+hx)|0, R=(b.pos.x+hx+hw-1)|0, T0=(b.pos.y+hy)|0, B0=(b.pos.y+hy+hh-1)|0;
      let x0=(L/S)|0, x1=(R/S)|0, y0=((T0-Y0)/S)|0, y1=((B0-Y0)/S)|0;
      if(x0<0)x0=0; if(y0<0)y0=0; if(x1>=mw)x1=mw-1; if(y1>=mh)y1=mh-1;
      for(let ty=y0;ty<=y1;ty++){
        const row=ty*mw;
        for(let tx=x0;tx<=x1;tx++) if(solid.has(T[row+tx] as number)) return true;
      }
      return false;
    };
  }

  // X
  const vx=b.vel.x;
  if(vx){
    b.pos.x+=vx;
    if(hitAny()){
      b.pos.x-=vx;
      b.vel.x=0;          // only kill horizontal speed on wall hit
      b.grounded=false;   // keep in-air friction
    }
  }

  // Y
  const vy=b.vel.y;
  if(vy){
    b.pos.y+=vy;
    if(hitAny()){
      b.pos.y-=vy;
      if(vy>0){ b.vel.y=0; b.grounded=true; }
      else{
        const ny=-vy*(b.bounce??CEIL);
        b.vel.y=Math.abs(ny)<.2?0:ny; b.grounded=false;
      }
    } else b.grounded=false;
  }
};
