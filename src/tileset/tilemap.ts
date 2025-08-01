// src/tileset/tilemap.ts

import {
  getAtlasImage,
  isAtlasReady
} from "../engine/renderer/SharedAtlas";

import { tileAtlasMeta } from "../atlas/tileAtlas";

const TILE_SIZE = 32;
type TileName = keyof typeof tileAtlasMeta;

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tileName: TileName,
  dx: number,
  dy: number
) {
  if (!isAtlasReady("tile")) return;

  const tile = tileAtlasMeta[tileName];
  if (!tile) return;

  ctx.drawImage(
    getAtlasImage("tile"),
    tile.x, tile.y, tile.w, tile.h,
    dx, dy, TILE_SIZE, TILE_SIZE
  );
}

export function isTileAtlasReady(): boolean {
  return isAtlasReady("tile");
}
