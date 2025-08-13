// src/engine/renderer/render.ts
import { tileAtlasMeta } from "../../atlas/tileAtlas";
import { getAtlasImage, isAtlasReady } from "./SharedAtlas";

type TileArray = number[] | Uint32Array;

export function drawMapAndColliders(
  ctx: CanvasRenderingContext2D,
  map: { width: number; height: number; tiles: TileArray },
  tileSize: number // destination tile size in pixels (use 16)
) {
  if (!isAtlasReady("tile")) return;

  const img = getAtlasImage("tile");
  const { width: w, height: h, tiles } = map;
  const offsetY = ctx.canvas.height - h * tileSize;

  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i++) {
      const id = tiles[i] as number;
      if (!id) continue;
      const meta = (tileAtlasMeta as Record<number, { x: number; y: number; w: number; h: number }>)[id];
      if (!meta) continue;

      // Source is the 16×16 tile; destination is tileSize×tileSize
      ctx.drawImage(
        img,
        meta.x, meta.y, meta.w, meta.h,
        x * tileSize,
        offsetY + y * tileSize,
        tileSize,
        tileSize
      );
    }
  }
}
