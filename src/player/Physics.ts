// src/player/Physics.ts
import { getCurrentMap } from "../engine/renderer/MapContext";

export type Vec2 = { x: number; y: number };

export interface PhysicsBody {
  pos: Vec2;
  vel: Vec2;
  acc?: Vec2;

  // Visual sprite size (what you draw)
  width: number;
  height: number;

  // Optional collision hitbox (inset margins) relative to pos
  // If omitted, width/height are used.
  hit?: { x: number; y: number; w: number; h: number };

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
const S = 16; // tile size in pixels

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

  // Effective hitbox (inset inside the visual sprite if provided)
  const hx = b.hit?.x ?? 0;
  const hy = b.hit?.y ?? 0;
  const hw = b.hit?.w ?? b.width;
  const hh = b.hit?.h ?? b.height;

  const left   = b.pos.x + hx;
  const right  = b.pos.x + hx + hw - 1;
  const top    = b.pos.y + hy;
  const bottom = b.pos.y + hy + hh - 1;

  const x0Tile = (left  / S) | 0;
  const x1Tile = (right / S) | 0;
  const y0Tile = ((top    - y0) / S) | 0;
  const y1Tile = ((bottom - y0) / S) | 0;

  for (let y = y0Tile; y <= y1Tile; y++) {
    for (let x = x0Tile; x <= x1Tile; x++) {
      if (x < 0 || y < 0 || x >= m.width || y >= m.height) continue;
      if (solid.has((m.tiles as any)[y * m.width + x])) return true;
    }
  }
  return false;
};
