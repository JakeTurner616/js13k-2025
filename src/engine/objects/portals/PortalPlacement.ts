// src/engine/objects/portals/PortalPlacement.ts
import type { GameMapLike } from "./Portals";
import { isSolidTileId } from "../../../player/Physics";

export type Ori = "R"|"L"|"U"|"D";
export const snapEven = (t:number) => (t & ~1);
const inb = (m:GameMapLike,x:number,y:number)=> x>=0&&y>=0&&x<m.width&&y<m.height;
const id  = (m:GameMapLike,x:number,y:number)=> (m.tiles as any)[y*m.width + x] as number;

export function isFootprintEmpty(m:GameMapLike, gx:number, gy:number):boolean {
  if (!inb(m,gx,gy)||!inb(m,gx+1,gy+1)) return false;
  return id(m,gx,gy)===0 && id(m,gx+1,gy)===0 && id(m,gx,gy+1)===0 && id(m,gx+1,gy+1)===0;
}

export function hasSupport(m:GameMapLike, gx:number, gy:number, o:Ori):boolean {
  const tile = (x:number,y:number)=> inb(m,x,y) ? id(m,x,y) : 0;
  const solid = (idn:number)=> idn>0 && isSolidTileId(idn);
  if (o==="R") return solid(tile(gx-1,gy)) && solid(tile(gx-1,gy+1));
  if (o==="L") return solid(tile(gx+2,gy)) && solid(tile(gx+2,gy+1));
  if (o==="U") return solid(tile(gx,gy+2)) && solid(tile(gx+1,gy+2));
  /* o==="D" */ return solid(tile(gx,gy-1)) && solid(tile(gx+1,gy-1));
}

export function validateExact(m:GameMapLike,gx:number,gy:number,o:Ori){
  const bounds = inb(m,gx,gy)&&inb(m,gx+1,gy+1);
  const footOK = bounds && isFootprintEmpty(m,gx,gy);
  const suppOK = bounds && hasSupport(m,gx,gy,o);
  return { ok: bounds && footOK && suppOK, bounds, footOK, suppOK };
}
