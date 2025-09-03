// repo-fix/src/engine/scenes/objects/drawBuilding.ts
import { poly, clamp, vstrip, hband } from "../u";

export type BV={
  h:number; colsLeft:number; colsRight?:number; rows:number;
  hat?:boolean; columns?:boolean; sills?:boolean;
  wallLeftColor?:string; wallRightColor?:string;
  hatOverhangPx?:number; hatHeightPx?:number;
  _vid?:number; _r?:number;
};

const walls=(c:CanvasRenderingContext2D,x:number,y:number,fwR:number,side:number,fh:number,dep:number,L:number,R:number,ex:number,ey:number)=>{
  const s=side+fwR;
  poly(c,R,[[x+side-ex,y+dep],[x+s,y],[x+s,y+fh+ey],[x+side-ex,y+fh+dep]]);
  poly(c,L,[[x,y],[x,y+fh+ey],[x+side+ex,y+fh+dep],[x+side+ex,y+dep]]);
};

const cols=(c:CanvasRenderingContext2D,x:number,y:number,cL:number,cR:number,fwL:number,fwR:number,side:number,dep:number,topL:number,topR:number,bot:number)=>{
  const WIN=8,GAP=6;
  const draw=(n:number,bx:number,fw:number,dm:number,ci:number,top:number)=>{
    const y0=top,y1=bot;
    for(let i=1;i<n;i++){
      const lx=i*(WIN+GAP)-GAP/2;
      vstrip(c,bx,y,fw,dm,lx/fw,(lx+.5)/fw,y0,y1-y0,ci,dep);
    }
  };
  draw(cL,x,fwL, 1,17,topL);
  draw(cR,x+side,fwR,-1,16,topR);
};

export function drawBuilding(c:CanvasRenderingContext2D,x:number,y:number,v:BV,sc:number){
  const WIN=8,GAP=6,cL=v.colsLeft,cR=v.colsRight??cL, fwL=cL*WIN+(cL-1)*GAP, fwR=cR*WIN+(cR-1)*GAP,
        fh=v.h, side=fwL*.5, dep=fh*.03, ex=.5/sc, ey=.5/sc;
  walls(c,x,y,fwR,side,fh,dep,16,15,ex,ey);

  const ey2=.75/sc, roofL=y+ey2, roofR=y+dep+ey2, topL=roofL+1/sc, topR=roofR+1/sc, bot=y+fh-1/sc;

  if(v.columns) cols(c,x,y,cL,cR,fwL,fwR,side,dep,topL,topR,bot);

  const baseL=v.wallLeftColor ?? "#2a2a2f", baseR=v.wallRightColor ?? "#232327",
        d1="#1b1b20", d2="#16161a", m1="#34343b", m2="#2a2a30", vMar=fh*.08, faceH=fh-vMar*2;

  if(v._vid==null){ const s=(n:number)=>((Math.sin(n*12.9898)*43758.5453)%1+1)%1, seed=cL*.73+(cR)*.41+v.rows*.19, r=(s(seed)*997)|0; v._r=r; v._vid=r%5; }
  const r=v._r!, vid=v._vid!;

  const face=(cols:number,bx:number,by:number,fw:number,dm:number,base:string,top:number)=>{
    const t0=Math.max(by+vMar,top), t1=Math.min(by+vMar+faceH,bot), H=t1-t0; if(H<=0) return;
    hband(c,bx,by,fw,dm,t0,H,base,dep);
    const nB=vid===1?12+(r%8):vid===0?4+(r%3):vid===4?2+(r%2):vid===2?3+(r%4):0,
          bh=vid===1?H/(nB*1.8):vid===0?H*.12:vid===4?H*.09:vid===2?H*.13:0;
    for(let i=0;i<nB;i++){
      const y0=vid===1? t0+(i+.5)*(H/nB)-bh*.5 : t0+((i+1)/(nB+1))*H-bh*.5;
      hband(c,bx,by,fw,dm,y0,bh, vid===1 ? (i%3? d2 : m2) : (vid===0 ? (i&1? m1 : d1) : m2), dep);
    }
    if(vid===2){ const ih=Math.max(2,bh*.22), y0=t0+H*.5-ih*.5; vstrip(c,bx,by,fw,dm,.06,.94,y0,ih,m1,dep); }
    const pN=vid===3? clamp(((cols|0)>>1)||3,2,5) : (vid===4?2+(r%3):0), pW=vid===3?.05+(r*.0002):.04;
    for(let i=1;i<=pN;i++){ const u=i/(pN+1); vstrip(c,bx,by,fw,dm,u-pW*.5,u+pW*.5,t0,H,d1,dep); }
    if(vid===3){ const ch=H*.06; hband(c,bx,by,fw,dm,t0,ch,"#0003",dep); hband(c,bx,by,fw,dm,t0+H-ch,ch,"#0003",dep); }
    const cap=Math.max(2,H*.04), ew=fw*.02;
    hband(c,bx,by,fw,dm,t0-cap*.5,cap,"#0003",dep);
    hband(c,bx,by,fw,dm,t0+H-cap*.5,cap,"#0003",dep);
    vstrip(c,bx,by,fw,dm,0,ew/fw,t0,H,"#0004",dep);
    vstrip(c,bx,by,fw,dm,1-ew/fw,1,t0,H,"#0004",dep);
  };

  face(cL,x,      y,     fwL,  1, baseL, topL);
  face(cR,x+side, y+dep, fwR, -1, baseR, topR);

  const s=side+fwR;
  poly(c,19,[[x,y+ey2],[x+fwL,y-dep],[x+s,y+ey2],[x+side,y+dep+ey2]]);
  if(!v.hat) return;

  const pad=v.hatOverhangPx ?? clamp(Math.round(side*.08),3,8),
        hh =v.hatHeightPx  ?? clamp(Math.round(dep*.55),6,12);

  poly(c,17,[[x-pad,y-hh],[x,y+ey2],[x+side,y+dep+ey2],[x+side,y-hh+dep]]);
  poly(c,16,[[x+side,y-hh+dep],[x+side,y+dep+ey2],[x+s,y+ey2],[x+s+pad,y-hh]]);
  poly(c,18,[[x-pad,y-hh+ey2],[x+fwL,y-hh-dep+ey2],[x+s+pad,y-hh+ey2],[x+side,y-hh+dep+ey2]]);
}
