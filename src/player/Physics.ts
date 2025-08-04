import { getCurrentMap } from "../engine/renderer/MapContext";

export type Vec2 = { x: number; y: number };
export interface PhysicsBody {
  pos: Vec2;
  vel: Vec2;
  acc?: Vec2;
  width: number;
  height: number;
  grounded: boolean;
  gravity?: number;
  bounce?: number;
  collide?: boolean;
}

export interface TileMapLike {
  width: number;
  height: number;
  tiles: number[] | Uint32Array;
}

const G = 0.14;
const S = 32;
const solid = new Set<number>();

export const setSolidTiles = (ids: number[]) => {
  solid.clear();
  for (let i of ids) solid.add(i);
};

export const applyPhysics = (
  b: PhysicsBody,
  ctx: CanvasRenderingContext2D,
  mapOverride?: TileMapLike,
  topAligned = false
) => {
  const m = mapOverride ?? getCurrentMap();
  if (!m || b.collide === false) return;

  const gravity = b.gravity ?? G;
  b.vel.y += gravity;
  if (b.acc) {
    b.vel.x += b.acc.x;
    b.vel.y += b.acc.y;
  }

  // Horizontal
  b.pos.x += b.vel.x;
  if (collides(b, ctx, m, topAligned)) {
    b.pos.x -= b.vel.x;
    b.vel.x *= -((b.bounce ?? 0) * 0.5); // Optional side bounce
  }

  // Vertical
  b.pos.y += b.vel.y;
  if (collides(b, ctx, m, topAligned)) {
    b.pos.y -= b.vel.y;

    if (Math.abs(b.vel.y) > 0.5 && b.bounce && b.bounce > 0.01) {
      b.vel.y *= -b.bounce;
      if (Math.abs(b.vel.y) < 0.5) {
        b.vel.y = 0;
        b.grounded = true;
      } else {
        b.grounded = false;
      }
    } else {
      b.vel.y = 0;
      b.grounded = true;
    }
  } else {
    b.grounded = false;
  }
};

const collides = (
  b: PhysicsBody,
  ctx: CanvasRenderingContext2D,
  m: TileMapLike,
  topAligned: boolean
): boolean => {
  const y0 = topAligned ? 0 : ctx.canvas.height - m.height * S;
  const x0 = (b.pos.x / S) | 0;
  const x1 = ((b.pos.x + b.width - 1) / S) | 0;
  const y0Tile = ((b.pos.y - y0) / S) | 0;
  const y1Tile = ((b.pos.y + b.height - 1 - y0) / S) | 0;

  for (let y = y0Tile; y <= y1Tile; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= m.width || y >= m.height) continue;
      if (solid.has(m.tiles[y * m.width + x])) return true;
    }
  }
  return false;
};
