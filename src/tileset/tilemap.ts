import { getAtlasImage, isAtlasReady } from "../engine/sharedAtlasImage";

const TILE_SIZE = 32;
const TILE_COLS = 31;
const TILE_TOTAL = 72;

const tileImage = getAtlasImage();

type TileFrame = { x: number; y: number; w: number; h: number };
export const tileAtlasMeta: Record<string, TileFrame> = {};

for (let i = 0; i < TILE_TOTAL; i++) {
  const x = (i % TILE_COLS) * TILE_SIZE;
  const y = Math.floor(i / TILE_COLS) * TILE_SIZE;
  tileAtlasMeta[`Tile_${(i + 1).toString().padStart(2, "0")}`] = {
    x, y, w: TILE_SIZE, h: TILE_SIZE
  };
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tileName: string,
  dx: number,
  dy: number
) {
  const t = tileAtlasMeta[tileName];
  if (!isAtlasReady() || !t) return;
  ctx.drawImage(tileImage, t.x, t.y, t.w, t.h, dx, dy, TILE_SIZE, TILE_SIZE);
}

export function isTileAtlasReady() {
  return isAtlasReady();
}
