// src/engine/scenes/objects/drawBuilding.ts
import { poly, clamp, vstrip, hband, antenna } from "../u";

export type BV = {
  h:number; colsLeft:number; colsRight?:number; rows:number;
  hat?:boolean; columns?:boolean; sills?:boolean;
  hasAntenna?:boolean; antennaHeight?:number; antennaRungs?:number;
  wallLeftColor?:string; wallRightColor?:string;
  hatOverhangPx?:number; hatHeightPx?:number; blinkOffset?:number;
  // caches
  _vid?:number; _r?:number;
};

const walls=(
  c:CanvasRenderingContext2D,
  x:number,y:number,
  fwR:number,side:number,fh:number,dep:number,
  L:number,R:number, ex:number,ey:number
)=>{
  const fwSum=side+fwR;
  poly(c,R,[[x+side-ex,y+dep],[x+fwSum,y],[x+fwSum,y+fh+ey],[x+side-ex,y+fh+dep]]);
  poly(c,L,[[x,y],[x,y+fh+ey],[x+side+ex,y+fh+dep],[x+side+ex,y+dep]]);
};

const columns=(c:CanvasRenderingContext2D,x:number,y:number,cL:number,cR:number,fwL:number,fwR:number,side:number,fh:number,dep:number)=>{
  const WIN=8,GAP=6;
  const draw=(cols:number,bx:number,fw:number,dm:number,ci:number)=>{
    for(let i=1;i<cols;i++){
      const lx=i*(WIN+GAP)-GAP/2, y0=y, y1=y+fh;
      vstrip(c,bx,y,fw,dm, lx/fw, (lx+.5)/fw, y0, y1-y0, ci, dep);
    }
  };
  draw(cL,x,      fwL, 1, 17);
  draw(cR,x+side, fwR,-1, 16);
};

const windows=(c:CanvasRenderingContext2D,x:number,y:number,v:BV,cL:number,cR:number,fwL:number,fwR:number,side:number,fh:number,dep:number)=>{
  const vMar=fh*.08, faceH=fh-vMar*2;
  const baseL=v.wallLeftColor ?? "#2a2a2f";
  const baseR=v.wallRightColor ?? "#232327";
  const d1="#1b1b20", d2="#16161a", m1="#34343b", m2="#2a2a30";

  if(v._vid==null){
    const seed=(n:number)=>((Math.sin(n*12.9898)*43758.5453)%1+1)%1;
    const sSeed=(v.blinkOffset??0)*3.17 + v.colsLeft*.73 + (v.colsRight??v.colsLeft)*.41 + v.rows*.19;
    const s=seed(sSeed), rr=(s*997)|0; v._r=rr; v._vid=rr%5;
  }
  const r=v._r!, vid=v._vid!;

  const face=(cols:number,bx:number,by:number,fw:number,dm:number,base:string)=>{
    hband(c,bx,by,fw,dm,by+vMar,faceH, base, dep);

    const nB=vid===1?12+(r%8):vid===0?4+(r%3):vid===4?2+(r%2):vid===2?3+(r%4):0;
    const bh=vid===1?faceH/(nB*1.8):vid===0?faceH*.12:vid===4?faceH*.09:vid===2?faceH*.13:0;
    for(let i=0;i<nB;i++){
      const y0 = vid===1 ? by+vMar+(i+.5)*(faceH/nB)-bh*.5 : by+vMar+((i+1)/(nB+1))*faceH-bh*.5;
      const colr = vid===1 ? (i%3? d2 : m2) : (vid===0 ? (i&1? m1 : d1) : m2);
      hband(c,bx,by,fw,dm,y0,bh, colr, dep);
    }

    if(vid===2){
      const ih=Math.max(2,bh*.22), y0=by+vMar+faceH*.5-ih*.5;
      vstrip(c,bx,by,fw,dm,.06,.94,y0,ih, m1, dep);
    }

    const pN=vid===3?clamp(((cols|0)>>1)||3,2,5):(vid===4?2+(r%3):0), pW=vid===3?.05+(r*.0002):.04;
    for(let i=1;i<=pN;i++){
      const u=i/(pN+1);
      vstrip(c,bx,by,fw,dm,u-pW*.5,u+pW*.5,by+vMar,faceH, d1, dep);
    }
    if(vid===3){
      const ch=faceH*.06;
      hband(c,bx,by,fw,dm,by+vMar,         ch, "#0003", dep);
      hband(c,bx,by,fw,dm,by+vMar+faceH-ch,ch, "#0003", dep);
    }

    const cap=Math.max(2,faceH*.04), ew=fw*.02;
    hband(c,bx,by,fw,dm,by+vMar-cap*.5,cap, "#0003", dep);
    hband(c,bx,by,fw,dm,by+vMar+faceH-cap*.5,cap, "#0003", dep);
    vstrip(c,bx,by,fw,dm,0,      ew/fw,by+vMar,faceH, "#0004", dep);
    vstrip(c,bx,by,fw,dm,1-ew/fw,1,     by+vMar,faceH, "#0004", dep);
  };

  face(cL,x,      y,     fwL, 1, baseL);
  face(cR,x+side, y+dep, fwR,-1, baseR);
};

export function drawBuilding(c:CanvasRenderingContext2D,x:number,y:number,v:BV,t:number,sc:number){
  const WIN=8,GAP=6, cL=v.colsLeft, cR=v.colsRight??cL;
  const fwL=cL*WIN+(cL-1)*GAP, fwR=cR*WIN+(cR-1)*GAP, fh=v.h, side=fwL*.5, dep=fh*.03;
  const ex=.5/sc, ey=.5/sc;

  walls(c,x,y,fwR,side,fh,dep, 16, 15, ex, ey);
  if(v.columns) columns(c,x,y,cL,cR,fwL,fwR,side,fh,dep);

  windows(c,x,y,v,cL,cR,fwL,fwR,side,fh,dep);

  const ey2=.75/sc, fwSum=side+fwR;
  poly(c,19,[[x,y+ey2],[x+fwL,y-dep],[x+fwSum,y+ey2],[x+side,y+dep+ey2]]);
  if(!v.hat) return;

  const pad=(v as any).hatOverhangPx ?? clamp(Math.round(side*.08),3,8);
  const hh =(v as any).hatHeightPx  ?? clamp(Math.round(dep*.55),6,12);

  poly(c,17,[[x-pad,y-hh],[x,y+ey2],[x+side,y+dep+ey2],[x+side,y-hh+dep]]);
  poly(c,16,[[x+side,y-hh+dep],[x+side,y+dep+ey2],[x+fwSum,y+ey2],[x+fwSum+pad,y-hh]]);
  poly(c,18,[[x-pad,y-hh+ey2],[x+fwL,y-hh-dep+ey2],[x+fwSum+pad,y-hh+ey2],[x+side,y-hh+dep+ey2]]);

  if(v.hasAntenna && v.antennaHeight && v.antennaRungs)
    antenna(c,x+fwL*.5,y-hh+ey2,v.antennaHeight,v.antennaRungs,t,17,(v.blinkOffset??0));
}
