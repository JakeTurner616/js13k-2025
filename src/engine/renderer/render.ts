// src/engine/renderer/render.ts
type TileArray = number[] | Uint32Array;

export function drawMapAndColliders(
  ctx: CanvasRenderingContext2D,
  map: { width: number; height: number; tiles: TileArray },
  tileSize: number // destination tile size in pixels (use 16)
) {
  const { width: w, height: h, tiles } = map;
  const offsetY = ctx.canvas.height - h * tileSize;

  // Pure black tiles for any non-zero id
  ctx.fillStyle = "#000";

  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i++) {
      if ((tiles[i] as number) === 0) continue;
      ctx.fillRect(
        x * tileSize,
        offsetY + y * tileSize,
        tileSize, tileSize
      );
    }
  }
}
