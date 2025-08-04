// src/engine/render.ts

import { drawTile } from "../../tileset/tilemap";


/**
 * Renders the current tilemap to the canvas, along with debug colliders.
 * 
 * @param ctx - The destination 2D canvas context
 * @param map - A simple map object with { width, height, tiles[] }
 * @param tileSize - The size of each tile in pixels (e.g. 32)
 */
export function drawMapAndColliders(
  ctx: CanvasRenderingContext2D,
  map: any,
  tileSize: number
) {
  // Total height of the tilemap in pixels
  const totalHeight = map.height * tileSize;

  // Iterate through each tile in row-major order
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const i = y * map.width + x;
      const tile = map.tiles[i];
      if (!tile) continue; // Skip empty tiles (ID 0)

      // Convert tile coordinates to canvas-space
      const drawX = x * tileSize;
      const drawY = ctx.canvas.height - totalHeight + y * tileSize;

      // Construct tile key name (e.g. "Tile_01", "Tile_12", etc.)
      const tileKey = `Tile_${String(tile).padStart(2, "0")}` as any;

      // Draw the tile to the screen
      drawTile(ctx, tileKey, drawX, drawY);
    }
  }


}
