// src/engine/renderer/render.ts
type TileArray = number[] | Uint32Array;

export function drawMapAndColliders(
  ctx: CanvasRenderingContext2D,
  map: { width:number; height:number; tiles: TileArray },
  tileSize: number
){
  const { width:w, height:h, tiles } = map;
  const offY = ctx.canvas.height - h * tileSize;

  for (let y=0,i=0; y<h; y++){
    for (let x=0; x<w; x++, i++){
      const id = tiles[i] as number;
      if (!id) continue;
      ctx.fillStyle = id===134 ? "#777" : "#000"; // 134 grey, else black
      ctx.fillRect(x*tileSize, offY + y*tileSize, tileSize, tileSize);
    }
  }
}
