// src/engine/renderer/render.ts
import { tileAtlasMeta, TILE } from "../../atlas/tileAtlas";
import { getAtlasImage, isAtlasReady } from "./SharedAtlas";

type TileArray = number[] | Uint32Array;
type AtlasMeta = Record<number, [number, number]>; // [sx, sy]

export function drawMapAndColliders(
  ctx: CanvasRenderingContext2D,
  map: { width: number; height: number; tiles: TileArray },
  tileSize: number // destination tile size in pixels (use 16)
) {
  if (!isAtlasReady("tile")) return;

  const img = getAtlasImage("tile");
  const { width: w, height: h, tiles } = map;
  const offsetY = ctx.canvas.height - h * tileSize;
  const TSRC = TILE; // source tile size in atlas (e.g., 16)

  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i++) {
      const id = tiles[i] as number;
      if (!id) continue;

      const m = (tileAtlasMeta as AtlasMeta)[id];
      if (!m) continue;

      const sx = m[0], sy = m[1]; // source coords in atlas
      ctx.drawImage(
        img,
        sx, sy, TSRC, TSRC,
        x * tileSize,
        offsetY + y * tileSize,
        tileSize, tileSize
      );
    }
  }
}
