import { cos } from "./math";

// pass `isCling` and `anchored = grounded || isCling`
export const resolveFacing = (
  prev:1|-1,
  isCling:boolean,
  anchored:boolean,
  aiming:boolean,
  clingSide:number,
  angle:number,
  vx:number,
  L:boolean,
  R:boolean
):1|-1 =>
  isCling ? (clingSide>=0?1:-1) :
  (aiming && anchored) ? (cos(angle)>=0?1:-1) :
  (L!==R && (anchored)) ? (R?1:-1) :
  (vx*vx>.0025 ? (vx>=0?1:-1) : prev);
