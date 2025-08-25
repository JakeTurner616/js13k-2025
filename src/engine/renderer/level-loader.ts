// src/engine/renderer/level-loader.ts
//
// Tiny multi-level loader (pre-terser friendly) + FINISH-aware solids.
// - Levels are base64-encoded (value,count) RLE pairs → Uint32Array tiles
// - loadLevel1 / loadLevel2 wire straight into MapContext + Physics
// - FINISH tile (241) is *excluded* from solids so portals won't stick
//
// Add more levels by copying the 3 import symbols and another loadLevelN()
// then register it in your scene switcher (BackgroundScene).

import {
  LEVEL_1_BASE64 as b1,
  LEVEL_1_WIDTH  as w1,
  LEVEL_1_HEIGHT as h1
} from "../../levels/level1.ts";

import {
  LEVEL_2_BASE64 as b2,
  LEVEL_2_WIDTH  as w2,
  LEVEL_2_HEIGHT as h2
} from "../../levels/level2.ts";

import { setSolidTiles as setSolids } from "../../player/Physics.ts";
import { setCurrentMap as setMap, getCurrentMap as getMap } from "./MapContext.ts";

const FINISH = 241; // finish tile id; must NOT be solid

/**
 * RLE(base64) decoder: bytes are [value, count] pairs.
 * Returns expanded Uint32Array of tile ids.
 */
function d(a:string){
  const r=atob(a), l=r.length, B=new Uint8Array(l);
  for(let i=0;i<l;i++) B[i]=r.charCodeAt(i);
  let tot=0; for(let i=1;i<l;i+=2) tot+=B[i];
  const out=new Uint32Array(tot); let j=0;
  for(let i=0;i<l;i+=2){ const v=B[i], n=B[i+1]; for(let k=0;k<n;k++) out[j++]=v; }
  return out;
}

/** Core setter: decode → set current map → compute solids (exclude 0 & FINISH) */
function L(w:number,h:number,base64:string){
  const tiles=d(base64);
  setMap({ width:w, height:h, tiles });
  const S=new Set<number>();
  for(let i=0;i<tiles.length;i++){ const v=tiles[i]; if(v && v!==FINISH) S.add(v); }
  setSolids([...S]);
}

// Public loaders (extend as needed)
export function loadLevel1(){ L(w1,h1,b1); }
export function loadLevel2(){ L(w2,h2,b2); }

// Re-export current map getter for convenience
export { getMap as getCurrentMap };
