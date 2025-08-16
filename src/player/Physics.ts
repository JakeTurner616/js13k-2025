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

  // wall-cling helpers (set/used by gameplay)
  touchL?: boolean;
  touchR?: boolean;
  cling?: boolean;        // when true + touching wall → slow slide
  clingSlide?: number;    // px/frame cap (default ~0.25)
}

export interface TileMapLike { width:number; height:number; tiles:number[]|Uint32Array; }

const G = 0.14, S = 16;
const AIR = 0.002, GFRIC = 0.08;
const CEIL = 0.25;

const solid = new Set<number>();
export const setSolidTiles = (ids:number[]) => { solid.clear(); for (let i of ids) solid.add(i); };

export const applyPhysics = (
  b:PhysicsBody,
  ctx:CanvasRenderingContext2D,
  mapOverride?:TileMapLike,
  topAligned=false
) => {
  const m = mapOverride ?? getCurrentMap();
  if (!m || b.collide === false) return;

  b.touchL = b.touchR = false;

  // integrate
  const g = b.gravity ?? G;
  b.vel.y += g;
  if (b.acc) { b.vel.x += b.acc.x; b.vel.y += b.acc.y; }

  // damping
  if (b.grounded) b.vel.x *= (1 - GFRIC);
  else            b.vel.x *= (1 - AIR);

  // optional slow slide when clinging to wall
  if (b.cling && (b.touchL || b.touchR)) {
    const cap = b.clingSlide ?? 0.25;
    if (b.vel.y > cap) b.vel.y = cap;
  }

  // horizontal sweep
  const vx = b.vel.x;
  b.pos.x += vx;
  if (collides(b, ctx, m, topAligned)) {
    b.pos.x -= vx;
    b.vel.x = 0;
    if (vx > 0) b.touchR = true; else if (vx < 0) b.touchL = true;
  }

  // vertical sweep
  b.pos.y += b.vel.y;
  if (collides(b, ctx, m, topAligned)) {
    b.pos.y -= b.vel.y;
    if (b.vel.y > 0) { b.vel.y = 0; b.grounded = true; }         // land
    else {                                                        // ceiling tap
      const r = b.bounce ?? CEIL;
      b.vel.y = -b.vel.y * r;
      if (Math.abs(b.vel.y) < 0.2) b.vel.y = 0;
      b.grounded = false;
    }
  } else {
    b.grounded = false;
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
