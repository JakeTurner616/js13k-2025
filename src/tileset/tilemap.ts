// src/tileset/tilemap.ts

import {
  getTileAtlasImage,
  isTileAtlasReady as isTileAtlasLoaded
} from "../engine/sharedTileAtlasImage";

// This import must exactly match the filename casing on disk
import { tileAtlasMeta } from "../atlas/tileAtlas";

const TILE_SIZE = 32;

type TileName = keyof typeof tileAtlasMeta;

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tileName: TileName,
  dx: number,
  dy: number
) {
  if (!isTileAtlasLoaded()) return;

  const tile = tileAtlasMeta[tileName];
  if (!tile) return;

  ctx.drawImage(
    getTileAtlasImage(),
    tile.x, tile.y, tile.w, tile.h,
    dx, dy, TILE_SIZE, TILE_SIZE
  );
}

export function isTileAtlasReady(): boolean {
  return isTileAtlasLoaded();
}
