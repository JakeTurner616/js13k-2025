// src/player/Physics.ts
import { getCurrentMap } from "../engine/renderer/MapContext";
import { G, T as S } from "./Core";

export type Vec2 = { x:number; y:number };

export interface PhysicsBody {
  pos:Vec2; vel:Vec2; acc?:Vec2;
  width:number; height:number;
  hit?:{ x:number; y:number; w:number; h:number };

  grounded:boolean;
  gravity?:number;
  bounce?:number;
  collide?:boolean;

  // public
  touchL?: boolean;
  touchR?: boolean;

  // mangle-friendly mirrors
  _touchL?: boolean;
  _touchR?: boolean;

  cling?: boolean;
  clingSlide?: number;

  // -1 = left, +1 = right, 0 = none
  hitWall?: number;
  _hitWall?: number;
}

export interface TileMapLike { width:number; height:number; tiles:number[]|Uint32Array; }

const AIR = 0.002, GFRIC = 0.08;
const CEIL = 0.25;

// keep motion under a tile per tick (tunneling guard)
const VX_MAX = 5;
const VY_MAX = 8;

const solid = new Set<number>();
export const setSolidTiles = (ids:number[]) => { solid.clear(); for (let i of ids) solid.add(i); };
export const isSolidTileId = (id:number) => solid.has(id);

export const applyPhysics = (
  b:PhysicsBody,
  ctx:CanvasRenderingContext2D,
  mapOverride?:TileMapLike,
  topAligned=false
) => {
  const m = mapOverride ?? getCurrentMap();

  // reset contacts
  b.touchL = b.touchR = false;
  b._touchL = b._touchR = false;
  b.hitWall = 0;
  b._hitWall = 0;

  // integrate
  const g = (b.gravity === undefined ? G : b.gravity);
  b.vel.y += g;
  if (b.acc) { b.vel.x += b.acc.x; b.vel.y += b.acc.y; }

  // damping
  b.vel.x *= 1 - (b.grounded ? GFRIC : AIR);

  // clamp velocity (local helper aids minification)
  const c=(v:number,lo:number,hi:number)=> v<lo?lo : v>hi?hi : v;
  b.vel.x = c(b.vel.x, -VX_MAX, VX_MAX);
  b.vel.y = c(b.vel.y, -VY_MAX, VY_MAX);

  const collisionsEnabled = (b.collide !== false) && !!m;

  // hitbox metrics
  const hb = b.hit, hx = hb?hb.x:0, hy = hb?hb.y:0, hw = hb?hb.w:b.width, hh = hb?hb.h:b.height;

  // fast collider
  let hitAny: (() => boolean) | null = null;
  if (collisionsEnabled) {
    const mm = m as TileMapLike, tiles = mm.tiles as any;
    const mw = mm.width|0, mh = mm.height|0;
    const y0 = topAligned ? 0 : (ctx.canvas.height - mh * S);

    hitAny = () => {
      let left=(b.pos.x+hx)|0, right=(b.pos.x+hx+hw-1)|0;
      let top =(b.pos.y+hy)|0, bot  =(b.pos.y+hy+hh-1)|0;
      let x0=(left/S)|0, x1=(right/S)|0, y0t=((top-y0)/S)|0, y1t=((bot-y0)/S)|0;
      if (x0<0) x0=0; if (y0t<0) y0t=0; if (x1>=mw) x1=mw-1; if (y1t>=mh) y1t=mh-1;
      for (let ty=y0t; ty<=y1t; ty++){
        const row=ty*mw;
        for (let tx=x0; tx<=x1; tx++){
          if (solid.has(tiles[row+tx] as number)) return true;
        }
      }
      return false;
    };
  }

  // ---- HORIZONTAL ----
  const vx = b.vel.x;
  if (vx) {
    b.pos.x += vx;
    if (hitAny?.()) {
      b.pos.x -= vx;
      if (vx > 0) {
        b.touchR = b._touchR = true;
        b.hitWall = b._hitWall = +1;
      } else {
        b.touchL = b._touchL = true;
        b.hitWall = b._hitWall = -1;
      }
      b.vel.x = 0;
      b.vel.y = 0;      // glue vertical on the catch tick (stick-to-wall feel)
      b.grounded = false;
    }
  }

  // ---- VERTICAL ----
  const vy = b.vel.y;
  if (vy) {
    b.pos.y += vy;
    if (hitAny?.()) {
      b.pos.y -= vy;
      if (vy > 0) {                 // landing
        b.vel.y = 0; b.grounded = true;
      } else {                      // ceiling
        const ny = (b.touchL || b.touchR) ? 0 : -vy * (b.bounce ?? CEIL);
        b.vel.y = (Math.abs(ny) < 0.2) ? 0 : ny;
        b.grounded = false;
      }
    } else b.grounded = false;
  }
};
