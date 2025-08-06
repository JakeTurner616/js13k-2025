// src/engine/render.ts
import { tileAtlasMeta } from "../../atlas/tileAtlas";
import { getAtlasImage, isAtlasReady } from "./SharedAtlas";

export function drawMapAndColliders(
  ctx: CanvasRenderingContext2D,
  map: { width: number; height: number; tiles: number[] },
  tileSize: number
) {
  if (!isAtlasReady("tile")) return;

  const img = getAtlasImage("tile");
  const { width: w, height: h, tiles } = map;
  const offsetY = ctx.canvas.height - h * tileSize;

  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i++) {
      const meta = (tileAtlasMeta as { [key: number]: { x: number; y: number; w: number; h: number } })[tiles[i]];
      if (meta)
        ctx.drawImage(
          img,
          meta.x, meta.y, meta.w, meta.h,
          x * tileSize,
          offsetY + y * tileSize,
          meta.w, meta.h
        );
    }
  }
}
