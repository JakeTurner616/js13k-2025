// src/player/Physics.ts
import { getCurrentMap } from "../engine/renderer/MapContext";

export type Vec2 = { x:number; y:number };

export interface PhysicsBody {
  pos:Vec2; vel:Vec2; acc?:Vec2;
  width:number; height:number;
  hit?:{ x:number; y:number; w:number; h:number };

  grounded:boolean;
  gravity?:number;
  bounce?:number;
  collide?:boolean;

  touchL?: boolean;
  touchR?: boolean;
  cling?: boolean;
  clingSlide?: number;

  // Used by FSM to detect a *new* horizontal wall impact this tick:
  // -1 = left wall, +1 = right wall, 0 = none.
  hitWall?: number;
}

export interface TileMapLike { width:number; height:number; tiles:number[]|Uint32Array; }

const G = 0.14, S = 16;
const AIR = 0.002, GFRIC = 0.08;
const CEIL = 0.25;

const solid = new Set<number>();
export const setSolidTiles = (ids:number[]) => { solid.clear(); for (let i of ids) solid.add(i); };

// ✅ expose a single source of truth for “solid”
export const isSolidTileId = (id:number) => solid.has(id);

export const applyPhysics = (
  b:PhysicsBody,
  ctx:CanvasRenderingContext2D,
  mapOverride?:TileMapLike,
  topAligned=false
) => {
  const m = mapOverride ?? getCurrentMap();
  if (!m || b.collide === false) return;

  // Reset contacts each step
  b.touchL = b.touchR = false;
  b.hitWall = 0;

  // Integrate
  const g = b.gravity ?? G;
  b.vel.y += g;
  if (b.acc) { b.vel.x += b.acc.x; b.vel.y += b.acc.y; }

  // Damping
  b.vel.x *= 1 - (b.grounded ? GFRIC : AIR);

  // ---- HORIZONTAL SWEEP (glue to wall) ----
  const vx = b.vel.x;
  if (vx){
    b.pos.x += vx;
    if (collides(b, ctx, m, topAligned)) {
      b.pos.x -= vx;
      (vx > 0 ? (b.touchR = true) : (b.touchL = true));

      // *** KEY: stamp which wall we *actively hit* BEFORE zeroing velocity
      b.hitWall = vx > 0 ? +1 : -1;

      b.vel.x = 0;
      b.vel.y = 0;      // glue stops vertical motion on same tick as wall catch
      b.grounded = false;
    }
  }

  // ---- VERTICAL SWEEP ----
  const vy = b.vel.y;
  if (vy){
    b.pos.y += vy;
    if (collides(b, ctx, m, topAligned)) {
      b.pos.y -= vy;
      if (vy > 0) {          // landing
        b.vel.y = 0; b.grounded = true;
      } else {               // ceiling
        b.vel.y = (b.touchL || b.touchR) ? 0 : -vy * (b.bounce ?? CEIL);
        if (Math.abs(b.vel.y) < 0.2) b.vel.y = 0;
        b.grounded = false;
      }
    } else {
      b.grounded = false;
    }
  }
};

const collides = (b:PhysicsBody, ctx:CanvasRenderingContext2D, m:TileMapLike, topAligned:boolean):boolean => {
  const y0 = topAligned ? 0 : ctx.canvas.height - m.height * S;
  const hx = b.hit?.x ?? 0,  hy = b.hit?.y ?? 0,  hw = b.hit?.w ?? b.width,  hh = b.hit?.h ?? b.height;

  const left   = b.pos.x + hx,           right  = b.pos.x + hx + hw - 1;
  const top    = b.pos.y + hy,           bottom = b.pos.y + hy + hh - 1;

  const x0Tile = (left  / S) | 0,        x1Tile = (right / S) | 0;
  const y0Tile = ((top - y0) / S) | 0,   y1Tile = ((bottom - y0) / S) | 0;

  for (let y = y0Tile; y <= y1Tile; y++) {
    for (let x = x0Tile; x <= x1Tile; x++) {
      if (x < 0 || y < 0 || x >= m.width || y >= m.height) continue;
      if (solid.has((m.tiles as any)[y * m.width + x])) return true;
    }
  }
  return false;
};
