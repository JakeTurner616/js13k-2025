// src/engine/scenes/background/sceneUtils.ts
// Utilities used by PortalSystem:
//  - s2w:    screen (client) → world coords using camera center
//  - tb/fb:  transform vectors to/from a portal's local basis (normal/tangent)
//  - push:   small offset along portal normal
//  - pushByHit: offset that accounts for the player's half-extent (+ optional pad)

import type { Cam } from "../../camera/Camera";

// Define or import the Ori type
export type Ori = "R" | "L" | "U" | "D";


/** Screen(client) → world, honoring canvas CSS scale & camera center. */
export const s2w = (x: number, y: number, c: HTMLCanvasElement, cam: Cam) => {
  const r = c.getBoundingClientRect();
  // map CSS pixel to canvas pixel
  const sx = (x - r.left) * (c.width  / Math.max(1, r.width));
  const sy = (y - r.top)  * (c.height / Math.max(1, r.height));
  // camera.x/y represent world center; canvas draws centered on camera
  return { wx: sx + (cam.x - c.width  * 0.5), wy: sy + (cam.y - c.height * 0.5) };
};

// ---- Portal-local basis transforms -----------------------------------------
// We define a portal's local basis as:
//   n = outward normal (positive points out of the surface)
//   t = tangent (rightward when looking along +n)
// Mapping by orientation:
//   R: normal +X, tangent +Y
//   L: normal -X, tangent +Y
//   U: normal -Y, tangent +X
//   D: normal +Y, tangent +X

/** world (vx,vy) → portal basis {n,t} */
export const tb = (vx: number, vy: number, o: Ori) =>
  o === "R" ? { n:  vx,  t: vy } :
  o === "L" ? { n: -vx,  t: vy } :
  o === "U" ? { n: -vy,  t: vx } :
              { n:  vy,  t: vx };

/** portal basis {n,t} → world (vx,vy) */
export const fb = (n: number, t: number, o: Ori) =>
  o === "R" ? { vx:  n,  vy: t } :
  o === "L" ? { vx: -n,  vy: t } :
  o === "U" ? { vx:  t,  vy:-n } :
              { vx:  t,  vy: n };

/** Pure push along the portal normal by distance d (positive = outward). */
export const push = (o: Ori, d: number) =>
  o === "R" ? { dx:  d, dy:  0 } :
  o === "L" ? { dx: -d, dy:  0 } :
  o === "U" ? { dx:  0, dy: -d } :
              { dx:  0, dy:  d };

/**
 * Push so that a rectangle with half-extent (hw,hh) clears the portal plane,
 * with an extra padding `p` (default 2px).
 * For vertical portals (R/L) we push by hw; for horizontal (U/D) by hh.
 */
export const pushByHit = (o: Ori, hw: number, hh: number, p = 2) =>
  (o === "R" || o === "L") ? push(o, hw + p) : push(o, hh + p);
