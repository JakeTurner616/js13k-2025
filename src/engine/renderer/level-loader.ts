// src/engine/renderer/level-loader.ts
import { setSolidTiles as S } from "../../player/Physics";
import { setCurrentMap as M, getCurrentMap as getMap } from "./MapContext";
import * as L1 from "../../levels/level1";
import * as L2 from "../../levels/level2";
import * as L3 from "../../levels/level3";

const V = [
  [L1.LEVEL_1_WIDTH, L1.LEVEL_1_HEIGHT, L1.LEVEL_1_BASE64],
  [L2.LEVEL_2_WIDTH, L2.LEVEL_2_HEIGHT, L2.LEVEL_2_BASE64],
  [L3.LEVEL_3_WIDTH, L3.LEVEL_3_HEIGHT, L3.LEVEL_3_BASE64],
] as const;

const L=(i:number)=>{
  const [w,h,b]=V[i|0], r=atob(b as string), l=r.length;
  let tot=0; for(let k=1;k<l;k+=2) tot+=r.charCodeAt(k);
  const tiles=new Uint32Array(tot); let j=0;
  const s:any={};
  for(let k=0;k<l;k+=2){
    let n=r.charCodeAt(k+1), v=r.charCodeAt(k);
    while(n--){ tiles[j++]=v; if(v&&v-3&&v-4) s[v]=1 }
  }
  M({width:w as number, height:h as number, tiles});
  S(Object.keys(s).map(Number));
};

export const LEVEL_COUNT = V.length;
export const loadLevel =(i:number)=>L(i);
export const loadLevel1 =()=>L(0);
export const loadLevel2 =()=>L(1);
export const loadLevel3 =()=>L(2);
export { getMap as getCurrentMap };
