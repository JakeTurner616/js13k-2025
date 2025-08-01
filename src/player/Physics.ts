import { getCurrentMap } from "../engine/renderer/MapContext.ts";

export type Vec2 = { x: number; y: number };
export interface PhysicsBody {
  pos: Vec2; vel: Vec2; acc?: Vec2;
  width: number; height: number; grounded: boolean;
}

const G = 0.14, S = 32, solid = new Set<number>();

export const setSolidTiles = (ids: number[]) => {
  solid.clear();
  for (let i of ids) solid.add(i);
};

export const applyPhysics = (b: PhysicsBody, c: CanvasRenderingContext2D) => {
  const m = getCurrentMap();
  if (!m) return;

  b.vel.y += G;
  if (b.acc) b.vel.x += b.acc.x, b.vel.y += b.acc.y;

  b.pos.x += b.vel.x;
  if (collides(b, c, m)) b.pos.x -= b.vel.x, b.vel.x = 0;

  b.pos.y += b.vel.y;
  if (collides(b, c, m)) {
    b.grounded = b.vel.y > 0;
    b.pos.y -= b.vel.y;
    b.vel.y = 0;
  } else b.grounded = false;
};

const collides = (b: PhysicsBody, ctx: CanvasRenderingContext2D, m: any) => {
  const y0 = ctx.canvas.height - m.height * S;
  const minX = b.pos.x / S | 0, maxX = (b.pos.x + b.width - 1) / S | 0;
  const minY = (b.pos.y - y0) / S | 0, maxY = (b.pos.y + b.height - 1 - y0) / S | 0;

  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) {
      if (x < 0 || y < 0 || x >= m.width || y >= m.height) continue;
      if (solid.has(m.tiles[y * m.width + x])) return true;
    }

  return false;
};

export const drawTileColliders = (ctx: CanvasRenderingContext2D) => {
  const m = getCurrentMap();
  if (!m) return;

  const y0 = ctx.canvas.height - m.height * S;
  ctx.strokeStyle = "red", ctx.lineWidth = 1;

  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++)
      if (solid.has(m.tiles[y * m.width + x]))
        ctx.strokeRect(x * S, y0 + y * S, S, S);
};
