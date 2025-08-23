// src/engine/scenes/objects/drawBuilding.ts
// Compact building renderer: walls + columns + windows + roof + antenna.

export type BuildingVariant = {
  h:number;
  colsLeft:number;
  colsRight?:number;
  hat?:boolean;
  columns?:boolean;
  sills?:boolean;           // kept for compat
  rows:number;              // style seed
  hasAntenna?:boolean;
  antennaHeight?:number;
  antennaRungs?:number;
  wallLeftColor?:string;
  wallRightColor?:string;
  windowLights?:string[][];
  hatOverhangPx?:number;
  hatHeightPx?:number;
  blinkOffset?:number;
};

const poly=(c:CanvasRenderingContext2D,fill:string,pts:[number,number][])=>{
  c.fillStyle=fill; c.beginPath(); c.moveTo(...pts[0]);
  for(let i=1;i<pts.length;i++) c.lineTo(...pts[i]);
  c.closePath(); c.fill();
};
const clamp=(n:number,a:number,b:number)=>n<a?a:n>b?b:n;

// --- tiny light & antenna ---
const blink=(c:CanvasRenderingContext2D,x:number,y:number,col:string,r:number,t:number,s=1,d=.5)=>{
  const p=(t*s)%1, a=p<d?1-(p/d)*.2:.1;
  c.fillStyle=col; c.globalAlpha=a;
  c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill();
  c.globalAlpha=1;
};
const antenna=(c:CanvasRenderingContext2D,cx:number,cy:number,h:number,rungs:number,t:number,onlyGlow=false,off=0)=>{
  if(!onlyGlow){
    c.strokeStyle="#444";
    c.beginPath(); c.moveTo(cx,cy); c.lineTo(cx,cy-h); c.stroke();
    for(let i=1;i<=rungs;i++){
      const y=cy-(h*i)/(rungs+1);
      c.beginPath(); c.moveTo(cx-3,y); c.lineTo(cx+3,y); c.stroke();
    }
  }
  blink(c,cx,cy-h-3,"#f22",2,t+off,.85+.5*off,.18+.08*off);
};

// --- walls ---
const walls=(c:CanvasRenderingContext2D,x:number,y:number,fwR:number,side:number,fh:number,dep:number,L:string,R:string)=>{
  const fwSum=side+fwR, tr=(c as any).getTransform?c.getTransform():{a:1,d:1}, ex=.5/(tr as any).a, ey=.5/(tr as any).d;
  poly(c,R,[[x+side-ex,y+dep],[x+fwSum,y],[x+fwSum,y+fh+ey],[x+side-ex,y+fh+dep]]); // right
  poly(c,L,[[x,y],[x,y+fh+ey],[x+side+ex,y+fh+dep],[x+side+ex,y+dep]]);             // left (slight overlap)
};

// --- columns ---
const columns=(c:CanvasRenderingContext2D,x:number,y:number,cL:number,cR:number,fwL:number,fwR:number,side:number,fh:number,dep:number)=>{
  const WIN=8, GAP=6;
  const sideDraw=(cols:number,bx:number,by:number,fw:number,dm:number,fill:string)=>{
    c.fillStyle=fill;
    for(let i=1;i<cols;i++){
      const lx=i*(WIN+GAP)-GAP/2, x0=bx+(dm>0?lx*.5:lx), y0=by, y1=by+fh;
      const d0=(lx/fw)*dep*dm, d1=((lx+1)/fw)*dep*dm;
      c.beginPath();
      c.moveTo(x0,        y0+d0);
      c.lineTo(x0+.5*dm,  y0+d1);
      c.lineTo(x0+.5*dm,  y1+d1);
      c.lineTo(x0,        y1+d0);
      c.closePath(); c.fill();
    }
  };
  sideDraw(cL,x,y,fwL, 1,"#444");
  sideDraw(cR,x+side,y+dep,fwR,-1,"#333");
};

// --- windows / fascia (mathy knobs, no switch) ---
const windows=(c:CanvasRenderingContext2D,x:number,y:number,v:BuildingVariant,cL:number,cR:number,fwL:number,fwR:number,side:number,fh:number,dep:number)=>{
  const vMar=fh*.08, faceH=fh-vMar*2;
  const baseL=v.wallLeftColor||"#2a2a2f", baseR=v.wallRightColor||"#232327";
  const d1="#1b1b20", d2="#16161a", m1="#34343b", m2="#2a2a30";
  const seed=(n:number)=>((Math.sin(n*12.9898)*43758.5453)%1+1)%1;
  const sSeed=(v.blinkOffset??0)*3.17 + v.colsLeft*.73 + (v.colsRight??v.colsLeft)*.41 + v.rows*.19;
  const s=seed(sSeed), r=(s*997)|0, vid=r%5; // 0..4 style

  // helpers
  const vstrip=(bx:number,fw:number,left:boolean,dm:number,u0:number,u1:number,y0:number,h:number,col:string)=>{
    const lx0=u0*fw,lx1=u1*fw, x0=bx+(left?lx0*.5:lx0), x1=bx+(left?lx1*.5:lx1);
    const d0=(lx0/fw)*dep*dm,  dA=(lx1/fw)*dep*dm;
    c.fillStyle=col; c.beginPath();
    c.moveTo(x0,y0+d0); c.lineTo(x1,y0+dA);
    c.lineTo(x1,y0+dA+h); c.lineTo(x0,y0+d0+h);
    c.closePath(); c.fill();
  };
  const hband=(bx:number,fw:number,left:boolean,dm:number,y0:number,h:number,col:string)=>
    vstrip(bx,fw,left,dm,0,1,y0,h,col);

  const face=(cols:number,bx:number,by:number,fw:number,dm:number,left:boolean,base:string)=>{
    // base wash
    hband(bx,fw,left,dm,by+vMar,faceH,base);

    // horizontal bands (counts/height/color rule vary with vid)
    const nB = vid===1 ? 12+(r%8) : vid===0 ? 4+(r%3) : vid===4 ? 2+(r%2) : vid===2 ? 3+(r%4) : 0;
    const bh = vid===1 ? faceH/(nB*1.8) : vid===0 ? faceH*.12 : vid===4 ? faceH*.09 : vid===2 ? faceH*.13 : 0;

    for(let i=0;i<nB;i++){
      const y0 = vid===1
        ? by+vMar+(i+.5)*(faceH/nB)-bh*.5
        : by+vMar+((i+1)/(nB+1))*faceH-bh*.5;
      const col = vid===1 ? (i%3? d2 : m2) : (vid===0 ? (i&1? m1 : d1) : m2);
      hband(bx,fw,left,dm,y0,bh,col);
    }

    // slim inner stripe for vid=2
    if(vid===2){
      const ih=Math.max(2,bh*.22), y0=by+vMar+faceH*.5-ih*.5;
      vstrip(bx,fw,left,dm,.06,.94,y0,ih,m1);
    }

    // vertical pillars (vid=3 or 4)
    const pN = vid===3 ? clamp(((cols|0)>>1)||3,2,5) : (vid===4 ? 2+(r%3) : 0);
    const pW = vid===3 ? .05+s*.02 : .04;
    for(let i=1;i<=pN;i++){
      const u=i/(pN+1);
      vstrip(bx,fw,left,dm,u-pW*.5,u+pW*.5,by+vMar,faceH, d1);
    }
    if(vid===3){
      const ch=faceH*.06;
      hband(bx,fw,left,dm,by+vMar,         ch,m1);
      hband(bx,fw,left,dm,by+vMar+faceH-ch,ch,m1);
    }

    // caps + edges
    const cap=Math.max(2,faceH*.04), ew=fw*.02;
    hband(bx,fw,left,dm,by+vMar-cap*.5,cap,"#0003");
    hband(bx,fw,left,dm,by+vMar+faceH-cap*.5,cap,"#0003");
    vstrip(bx,fw,left,dm,0,   ew/fw,by+vMar,faceH,"#0004");
    vstrip(bx,fw,left,dm,1-ew/fw,1,by+vMar,faceH,"#0004");
  };

  face(cL,x,          y,          fwL, 1, true,  baseL);
  face(cR,x+side,     y+dep,      fwR,-1, false, baseR);
};

// --- roof (+ antenna) ---
const roof=(c:CanvasRenderingContext2D,x:number,y:number,fwL:number,fwR:number,side:number,dep:number,v:BuildingVariant,t:number)=>{
  const fwSum=side+fwR, tr=(c as any).getTransform?c.getTransform():{a:1,d:1}, ey=.75/(tr as any).d;

  poly(c,"#555",[[x,y+ey],[x+fwL,y-dep],[x+fwSum,y+ey],[x+side,y+dep+ey]]);
  if(!v.hat) return;

  const pad=(v as any).hatOverhangPx ?? clamp(Math.round(side*.08),3,8);
  const hh =(v as any).hatHeightPx  ?? clamp(Math.round(dep*.55),6,12);

  poly(c,"#444",[[x-pad,y-hh],[x,y+ey],[x+side,y+dep+ey],[x+side,y-hh+dep]]);
  poly(c,"#333",[[x+side,y-hh+dep],[x+side,y+dep+ey],[x+fwSum,y+ey],[x+fwSum+pad,y-hh]]);
  poly(c,"#666",[[x-pad,y-hh+ey],[x+fwL,y-hh-dep+ey],[x+fwSum+pad,y-hh+ey],[x+side,y-hh+dep+ey]]);

  if(v.hasAntenna&&v.antennaHeight&&v.antennaRungs){
    antenna(c,x+fwL*.5,y-hh+ey,v.antennaHeight,v.antennaRungs,t,false,(v.blinkOffset??0));
  }
};

// === public ===
export function drawBuilding(c:CanvasRenderingContext2D,x:number,y:number,v:BuildingVariant,t:number){
  const WIN=8,GAP=6, cL=v.colsLeft, cR=v.colsRight??cL;
  const fwL=cL*WIN+(cL-1)*GAP, fwR=cR*WIN+(cR-1)*GAP;
  const fh=v.h, side=fwL*.5, dep=fh*.03;

  walls(c,x,y,fwR,side,fh,dep, v.wallLeftColor??"#333", v.wallRightColor??"#222");
  if(v.columns) columns(c,x,y,cL,cR,fwL,fwR,side,fh,dep);
  windows(c,x,y,v,cL,cR,fwL,fwR,side,fh,dep);
  roof(c,x,y,fwL,fwR,side,dep,v,t);
}
