// src/engine/scenes/init/initBuildingVariants.ts
import type { BuildingVariant } from "../objects/types";
import { clamp } from "../../../player/core/math";

const R=Math.random,
ri=(a:number,b:number)=>Math.floor(a+R()*(b-a+1)),
chance=(p:number)=>R()<p,

hsl=(h:number,s:number,l:number)=>`hsl(${h},${s}%,${l}%)`,
jitter=(n:number,j:number)=>n+ri(-j,j);

const L_LIT="#fce473",L_UN="#1a1a1a",R_LIT="#ffd966",R_UN="#111";

const walls=[
  {h:0,s:0,ll:20,lr:13},
  {h:220,s:8,ll:24,lr:16},
  {h:30,s:8,ll:22,lr:14},
  {h:250,s:10,ll:23,lr:15}
];

// weighted pick: favors 3–5 columns for consistent street cadence
function pickColsLeft(): number {
  const r = R();
  return r < 0.45 ? 3 : r < 0.80 ? 4 : r < 0.95 ? 5 : 6; // 6 is rare “landmark”
}

function makeLights(r:number,cL:number,cR:number){
  const maxC=Math.max(cL,cR),corner=chance(.5),lights:string[][]=[];
  for(let y=0;y<r;y++){
    const row:string[]=[];
    for(let x=0;x<maxC;x++){
      const leftSide=x<cL;
      if(x===0&&x===cL-1) row.push(corner?L_LIT:L_UN);
      else if(x===cL-1)   row.push(corner?L_LIT:L_UN);
      else if(x===0)      row.push(corner?R_LIT:R_UN);
      else row.push(chance(.75)?(leftSide?L_LIT:R_LIT):(leftSide?L_UN:R_UN));
    }
    lights.push(row);
  }
  return lights;
}

/** heightMul lets callers compensate for layer scale so apparent height reads right. */
export function generateBuildingVariants(
  n:number, minH:number, maxH:number, heightMul=1
):(BuildingVariant&{groundOffset:number;blinkOffset?:number})[]{
  const out:(BuildingVariant&{groundOffset:number;blinkOffset?:number})[]=[];
  for(let i=0;i<n;i++){
    // tighter column distribution
    const cL = pickColsLeft();

    // strongly prefer rectangular; occasional subtle asymmetry (±1)
    const rectangular = chance(.7);
    const cRraw = rectangular ? cL : clamp(cL + (chance(.5)?1:-1), 2, 8);
    const cR = rectangular ? undefined : cRraw;

    // height with mild tall bias but clamped by caller band
    const hRaw = minH + Math.pow(R(), .65) * (maxH - minH);
    const h = Math.floor(clamp(hRaw * heightMul, minH, maxH));

    const rows = Math.max(1, Math.floor(h / 28));

    const hat = chance(.5),
          columns = chance(.6),
          sills = chance(.8),
          groundOffset = ri(-5,5),
          hasAntenna = hat && chance(.4);

    const base = walls[ri(0, walls.length-1)];
    const wallLeftColor  = hsl(jitter(base.h,3), clamp(jitter(base.s,2),0,100), clamp(jitter(base.ll,2),0,100));
    const wallRightColor = hsl(jitter(base.h,3), clamp(jitter(base.s,2),0,100), clamp(jitter(base.lr,2),0,100));

    out.push({
      h, rows,
      colsLeft: cL,
      colsRight: cR,          // undefined => rectangular
      hat, columns, sills,
      groundOffset, hasAntenna,
      antennaHeight: 20 + R()*20,
      antennaRungs: ri(2,5),
      blinkOffset: R(),
      wallLeftColor, wallRightColor,
      windowLights: makeLights(rows, cL, cR ?? cL)
    });
  }
  return out;
}
