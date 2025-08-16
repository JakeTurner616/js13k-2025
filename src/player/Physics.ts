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

  // ---- HORIZONTAL SWEEP (with glue) ----
  const vx = b.vel.x;
  if (vx !== 0){
    b.pos.x += vx;
    if (collides(b, ctx, m, topAligned)) {
      // back out to previous column edge
      b.pos.x -= vx;
      // mark side
      if (vx > 0) b.touchR = true;
      else        b.touchL = true;
      // glue: kill ALL velocity immediately
      b.vel.x = 0;
      b.vel.y = 0;
      b.grounded = false; // we're on a wall, not ground
    }
  }

  // ---- VERTICAL SWEEP ----
  const vy = b.vel.y;
  if (vy !== 0){
    b.pos.y += vy;
    if (collides(b, ctx, m, topAligned)) {
      b.pos.y -= vy;
      if (vy > 0) { // landing
        b.vel.y = 0; b.grounded = true;
      } else {
        // ceiling hit — if latched to a wall this frame, do NOT bounce
        if (b.touchL || b.touchR) {
          b.vel.y = 0;
        } else {
          const r = b.bounce ?? CEIL;
          b.vel.y = -vy * r;
          if (Math.abs(b.vel.y) < 0.2) b.vel.y = 0;
        }
        b.grounded = false;
      }
    } else {
      b.grounded = false;
    }
  } else {
    // vy==0 path: keep grounded flag from horizontal step unless we’re airborne
    // nothing to do
  }

  // ---- POST: optional slow slide while clinging ----
  if ((b.touchL || b.touchR) && b.cling){
    const cap = b.clingSlide ?? 0.25;
    if (b.vel.y > cap) b.vel.y = cap;
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
