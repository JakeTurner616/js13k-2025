// src/engine/renderer/render.ts
type TileArray = number[] | Uint32Array;

export function drawMapAndColliders(
  ctx: CanvasRenderingContext2D,
  map: { width: number; height: number; tiles: TileArray },
  tileSize: number
) {
  const { width: w, height: h, tiles } = map;
  const offsetY = ctx.canvas.height - h * tileSize;

  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i++) {
      const id = tiles[i] as number;
      if (!id) continue;

      // 🎨 pick colors by ID
      switch (id) {
        case 19:  ctx.fillStyle = "#000"; break; // black
        case 134: ctx.fillStyle = "#777"; break; // grey
        default:  ctx.fillStyle = "#000"; break; // fallback
      }

      ctx.fillRect(x * tileSize, offsetY + y * tileSize, tileSize, tileSize);
    }
  }
}
