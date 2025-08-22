// src/player/Physics.ts
import { getCurrentMap } from "../engine/renderer/MapContext";
import { WORLD_G } from "./core/math";

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

const G = WORLD_G, S = 16;
const AIR = 0.002, GFRIC = 0.08;
const CEIL = 0.25;

// 💡 keeps motion under a tile per tick to reduce tunneling
const VX_MAX = 5;   // px/frame
const VY_MAX = 8;   // px/frame (< S)

const solid = new Set<number>();
export const setSolidTiles = (ids:number[]) => { solid.clear(); for (let i of ids) solid.add(i); };

// ✅ single source of truth for “solid”
export const isSolidTileId = (id:number) => solid.has(id);

export const applyPhysics = (
  b:PhysicsBody,
  ctx:CanvasRenderingContext2D,
  mapOverride?:TileMapLike,
  topAligned=false
) => {
  // NOTE: we ALWAYS integrate. When collide === false, we only skip collision tests.
  const m = mapOverride ?? getCurrentMap();

  // Reset contacts each step
  b.touchL = false;
  b.touchR = false;
  b.hitWall = 0;

  // Integrate
  const g = (b.gravity === undefined ? G : b.gravity);
  b.vel.y += g;
  if (b.acc) { b.vel.x += b.acc.x; b.vel.y += b.acc.y; }

  // Damping
  b.vel.x *= 1 - (b.grounded ? GFRIC : AIR);

  // 🔒 clamp velocities (prevents big steps that can tunnel)
  if (b.vel.x >  VX_MAX) b.vel.x =  VX_MAX;
  if (b.vel.x < -VX_MAX) b.vel.x = -VX_MAX;
  if (b.vel.y >  VY_MAX) b.vel.y =  VY_MAX;
  if (b.vel.y < -VY_MAX) b.vel.y = -VY_MAX;

  const collisionsEnabled = (b.collide !== false) && !!m;

  // Precompute hitbox metrics
  const hb = b.hit;
  const hx = hb ? hb.x : 0;
  const hy = hb ? hb.y : 0;
  const hw = hb ? hb.w : b.width;
  const hh = hb ? hb.h : b.height;

  // If we’re colliding, cache map/canvas derived constants & a fast local collider
  let collidesFast: (() => boolean) | null = null;
  if (collisionsEnabled) {
    const mm = m as TileMapLike;
    const tiles = mm.tiles as any;
    const mw = mm.width|0, mh = mm.height|0;
    const y0 = topAligned ? 0 : (ctx.canvas.height - mh * S);

    collidesFast = () => {
      const left   = (b.pos.x + hx)|0;
      const right  = (b.pos.x + hx + hw - 1)|0;
      const top    = (b.pos.y + hy)|0;
      const bottom = (b.pos.y + hy + hh - 1)|0;

      let x0t = (left  / S) | 0;
      let x1t = (right / S) | 0;
      let y0t = ((top    - y0) / S) | 0;
      let y1t = ((bottom - y0) / S) | 0;

      if (x0t < 0) x0t = 0;
      if (y0t < 0) y0t = 0;
      if (x1t >= mw) x1t = mw - 1;
      if (y1t >= mh) y1t = mh - 1;

      for (let ty = y0t; ty <= y1t; ty++) {
        const row = ty * mw;
        for (let tx = x0t; tx <= x1t; tx++) {
          const id = tiles[row + tx] as number;
          if (solid.has(id)) return true;
        }
      }
      return false;
    };

    // 🧯 ultra-small anti-stuck: if spawned/teleported into a wall, nudge out 1–2px
    if (collidesFast()) {
      // prefer up, then down, then left/right; try radius 1..2
      const dirs = [[0,-1],[0,1],[-1,0],[1,0]] as const;
      const ox = b.pos.x, oy = b.pos.y;
      let fixed = false;
      for (let r = 1; r <= 2 && !fixed; r++) {
        for (let d = 0; d < 4 && !fixed; d++) {
          b.pos.x = ox + dirs[d][0] * r;
          b.pos.y = oy + dirs[d][1] * r;
          if (!collidesFast()) fixed = true;
        }
      }
      if (!fixed) { b.pos.x = ox; b.pos.y = oy; }  // revert if nothing helped
      // kill tiny drift to avoid re-embedding immediately
      if (fixed) { if (Math.abs(b.vel.x) < 0.5) b.vel.x = 0; if (Math.abs(b.vel.y) < 0.5) b.vel.y = 0; }
    }
  }

  // ---- HORIZONTAL SWEEP ----
  const vx = b.vel.x;
  if (vx) {
    b.pos.x += vx;
    if (collidesFast && collidesFast()) {
      b.pos.x -= vx;
      if (vx > 0) { b.touchR = true; b.hitWall = +1; }
      else        { b.touchL = true; b.hitWall = -1; }
      b.vel.x = 0;
      b.vel.y = 0;      // glue stops vertical motion on same tick as wall catch
      b.grounded = false;
    }
  }

  // ---- VERTICAL SWEEP ----
  const vy = b.vel.y;
  if (vy) {
    b.pos.y += vy;
    if (collidesFast && collidesFast()) {
      b.pos.y -= vy;
      if (vy > 0) {          // landing
        b.vel.y = 0;
        b.grounded = true;
      } else {               // ceiling
        const ny = (b.touchL || b.touchR) ? 0 : -vy * (b.bounce ?? CEIL);
        b.vel.y = (Math.abs(ny) < 0.2) ? 0 : ny;
        b.grounded = false;
      }
    } else {
      b.grounded = false;
    }
  }
};
