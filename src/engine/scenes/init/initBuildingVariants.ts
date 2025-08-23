// src/engine/scenes/init/initBuildingVariants.ts
import type { BuildingVariant } from "../objects/types";
import { clamp } from "../../../player/core/math";

const R=Math.random,f=Math.floor;
const ri=(a:number,b:number)=>f(a+R()*(b-a+1));
const p =(q:number)=>R()<q;
const hsl=(h:number,s:number,l:number)=>`hsl(${h},${s}%,${l}%)`;
const jit=(n:number,j:number)=>n+ri(-j,j);

const L_LIT="#fce473",L_UN="#1a1a1a",R_LIT="#ffd966",R_UN="#111";

const walls=[ // base palettes
  {h:0,s:0,ll:20,lr:13},
  {h:220,s:8,ll:24,lr:16},
  {h:30,s:8,ll:22,lr:14},
  {h:250,s:10,ll:23,lr:15},
];

// favor 3–5 cols, rare 6
const pickColsLeft=()=>{const r=R();return r<.45?3:r<.8?4:r<.95?5:6};

// corner-sharing window lights (left/right corners toggle together)
function makeLights(rows:number,cL:number,cR:number){
  const maxC=Math.max(cL,cR), lights:string[][]=[];
  for(let y=0;y<rows;y++){
    const cornerOn=p(.5), row:string[]=[];
    for(let x=0;x<maxC;x++){
      const on = x===0 || x===cL-1 || x===cR-1 ? cornerOn : p(.75);
      const leftSide = x < cL;
      row.push(leftSide ? (on?L_LIT:L_UN) : (on?R_LIT:R_UN));
    }
    lights.push(row);
  }
  return lights;
}

/** heightMul compensates for layer scale so apparent height reads right. */
export function generateBuildingVariants(
  n:number, minH:number, maxH:number, heightMul=1
):(BuildingVariant&{groundOffset:number;blinkOffset?:number})[]{
  const out:(BuildingVariant&{groundOffset:number;blinkOffset?:number})[]=[];

  for(let i=0;i<n;i++){
    const cL = pickColsLeft();
    const rectangular = p(.7);
    const cRraw = clamp(cL + (p(.5)?1:-1), 2, 8);
    const cR = rectangular ? undefined : cRraw;

    const hRaw = minH + Math.pow(R(), .65) * (maxH - minH);
    const h = f(clamp(hRaw * heightMul, minH, maxH));
    const rows = Math.max(1, f(h/28));

    const hat=p(.5), columns=p(.6), sills=p(.8);
    const groundOffset=ri(-5,5), hasAntenna=hat && p(.4);

    const base=walls[ri(0,walls.length-1)];
    const wl=hsl(jit(base.h,3), clamp(jit(base.s,2),0,100), clamp(jit(base.ll,2),0,100));
    const wr=hsl(jit(base.h,3), clamp(jit(base.s,2),0,100), clamp(jit(base.lr,2),0,100));

    out.push({
      h, rows,
      colsLeft: cL,
      colsRight: cR,               // undefined => rectangular
      hat, columns, sills,
      groundOffset, hasAntenna,
      antennaHeight: 20 + R()*20,
      antennaRungs: ri(2,5),
      blinkOffset: R(),
      wallLeftColor: wl,
      wallRightColor: wr,
      windowLights: makeLights(rows, cL, cR ?? cL)
    });
  }
  return out;
}
