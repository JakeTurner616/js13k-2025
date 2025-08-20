// src/engine/renderer/Space.ts
// Bottom-aligned map helpers (same convention used by render.ts & Physics)

export type MapLike = { width:number; height:number };

export const mapOffsetY = (canvasH:number, mapH:number, tile:number) =>
  canvasH - mapH * tile;

/** Convert world px → tile coords, returning also the bottom offset used. */
export function worldToTile(
  wx:number, wy:number,
  canvasH:number, map:MapLike, tile:number
){
  const offY = mapOffsetY(canvasH, map.height, tile);
  const tx = Math.floor(wx / tile);
  const ty = Math.floor((wy - offY) / tile);
  return { tx, ty, offY };
}

/** Convert tile coords → world px (top-left of that tile). */
export function tileToWorld(
  tx:number, ty:number,
  canvasH:number, map:MapLike, tile:number
){
  const offY = mapOffsetY(canvasH, map.height, tile);
  return { wx: tx * tile, wy: offY + ty * tile };
}
