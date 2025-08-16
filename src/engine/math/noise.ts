// src/engine/math/noise.ts
// Shared tiny noise bits: 2D fBm, 1D ridge curve, and a 1D hash.

const { sin, floor } = Math;

/** 2D fBm → 0..1 (2 octaves by default; tweak o for crisp/smooth) */
export function fb(x:number, y:number, s:number, o=2){
  let a=0, b=1;
  for(let k=0;k<o;k++){
    a += b*(sin(x*.02+s)+sin(y*.02+s*1.3)+sin((x+y)*.015+s*2.1))/3;
    b *= .5; x*=1.8; y*=1.8;
  }
  return a*.5+.5;
}

/** 1D ridge curve (good for silhouettes / tracks) → 0..1 */
export function rg(x:number, s:number){
  return (
    sin(x*0.018+s)*0.6 +
    sin(x*0.034+s*1.7)*0.3 +
    sin(x*0.058+s*2.3)*0.15
  )*.5+.5;
}

/** Tiny 1D hash 0..1 (deterministic “random”) */
export function hs(n:number){
  const f = sin(n*12.9898)*43758.5453;
  return f - floor(f);
}
