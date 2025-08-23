// src/engine/scenes/objects/drawBuilding.ts
// One-file building renderer: walls + columns + windows + roof + antenna + light.

export type BuildingVariant = {
  h:number;
  colsLeft:number;
  colsRight?:number;
  hat?:boolean;
  columns?:boolean;
  sills?:boolean;           // (kept for compat; not used by fascia)
  rows:number;              // (kept for style seed)
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
  const p=(t*s)%1,on=p<d,a=on?1-(p/d)*.2:.1;
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
  const sp=0.85+off*.5, du=0.18+off*.08;
  blink(c,cx,cy-h-3,"#ff2020",2,t+off,sp,du);
};

// --- walls ---
const walls=(c:CanvasRenderingContext2D,x:number,y:number,fwR:number,side:number,fh:number,dep:number,L:string,R:string)=>{
  const fwSum=side+fwR, tr=(c as any).getTransform?c.getTransform():{a:1,d:1}, ex=0.5/(tr as any).a, ey=0.5/(tr as any).d;
  // right
  poly(c,R,[[x+side-ex,y+dep],[x+fwSum,y],[x+fwSum,y+fh+ey],[x+side-ex,y+fh+dep]]);
  // left (overlap seam slightly)
  poly(c,L,[[x,y],[x,y+fh+ey],[x+side+ex,y+fh+dep],[x+side+ex,y+dep]]);
};

// --- columns ---
const columns=(c:CanvasRenderingContext2D,x:number,y:number,cL:number,cR:number,fwL:number,fwR:number,side:number,fh:number,dep:number)=>{
  const WIN=8, GAP=6;
  const sideDraw=(cols:number,bx:number,by:number,fw:number,dm:number,fill:string)=>{
    c.fillStyle=fill;
    for(let i=1;i<cols;i++){
      const lx=i*(WIN+GAP)-GAP/2, x0=bx+(dm>0?lx*.5:lx);
      const d0=(lx/fw)*dep*dm, d1=((lx+1)/fw)*dep*dm;
      const y0=by, y1=by+fh;
      c.beginPath();
      c.moveTo(x0,          y0+d0);
      c.lineTo(x0+0.5*dm,   y0+d1);
      c.lineTo(x0+0.5*dm,   y1+d1);
      c.lineTo(x0,          y1+d0);
      c.closePath(); c.fill();
    }
  };
  sideDraw(cL,x,y,fwL, 1,"#444");
  sideDraw(cR,x+side,y+dep,fwR,-1,"#333");
};

// --- windows / fascia ---
const windows=(c:CanvasRenderingContext2D,x:number,y:number,v:BuildingVariant,cL:number,cR:number,fwL:number,fwR:number,side:number,fh:number,dep:number,time:number)=>{
  const vMar=fh*.08, faceH=fh-vMar*2;
  const baseL=v.wallLeftColor||"#2a2a2f", baseR=v.wallRightColor||"#232327";
  const d1="#1b1b20", d2="#16161a", m1="#34343b", m2="#2a2a30";
  const seed=(n:number)=>((Math.sin(n*12.9898)*43758.5453)%1+1)%1;
  const sSeed=(v.blinkOffset??0)*3.17 + v.colsLeft*.73 + (v.colsRight??v.colsLeft)*.41 + v.rows*.19;
  const s=seed(sSeed), vid=(s*997|0)%5;

  // iso helpers
  const vstrip=(bx:number,by:number,fw:number,left:boolean,dm:number,u0:number,u1:number,y0:number,h:number,col:string)=>{
    const lx0=u0*fw, lx1=u1*fw, x0=bx+(left?lx0*.5:lx0), x1=bx+(left?lx1*.5:lx1);
    const d0=(lx0/fw)*dep*dm, dA=(lx1/fw)*dep*dm;
    c.fillStyle=col; c.beginPath();
    c.moveTo(x0,y0+d0); c.lineTo(x1,y0+dA);
    c.lineTo(x1,y0+dA+h); c.lineTo(x0,y0+d0+h);
    c.closePath(); c.fill();
  };
  const hband=(bx:number,by:number,fw:number,left:boolean,dm:number,y0:number,h:number,col:string)=>
    vstrip(bx,by,fw,left,dm,0,1,y0,h,col);

  const face=(cols:number,bx:number,by:number,fw:number,dm:number,left:boolean,base:string)=>{
    // wash
    hband(bx,by,fw,left,dm,by+vMar,faceH,base);

    switch(vid){
      case 0:{ const n=4+((s*13)|0)%3, bh=faceH*.12;
        for(let i=0;i<n;i++){const t=(i+1)/(n+1), y0=by+vMar+t*faceH-bh*.5;
          hband(bx,by,fw,left,dm,y0,bh,(i&1)?m1:d1);}
        break; }
      case 1:{ const n=12+((s*19)|0)%8, gh=faceH/(n*1.8);
        for(let i=0;i<n;i++){const y0=by+vMar+(i+.5)*(faceH/n)-gh*.5;
          hband(bx,by,fw,left,dm,y0,gh,(i%3===0)?m2:d2);}
        break; }
      case 2:{ const n=3+((s*17)|0)%4, bh=faceH*.13;
        for(let i=0;i<n;i++){const t=(i+1)/(n+1), y0=by+vMar+t*faceH-bh*.5;
          hband(bx,by,fw,left,dm,y0,bh,m2);
          const ih=Math.max(2,bh*.22);
          vstrip(bx,by,fw,left,dm,.06,.94,y0+bh*.5-ih*.5,ih,m1);}
        break; }
      case 3:{ const pN=Math.max(2,Math.min(5,((cols|0)>>1)||3)), pW=.05+(s*.02);
        for(let i=1;i<=pN;i++){const u=i/(pN+1);
          vstrip(bx,by,fw,left,dm,u-pW*.5,u+pW*.5,by+vMar,faceH,d1);}
        const ch=faceH*.06;
        hband(bx,by,fw,left,dm,by+vMar,         ch,m1);
        hband(bx,by,fw,left,dm,by+vMar+faceH-ch,ch,m1);
        break; }
      default:{ const pN=2+((s*23)|0)%3, pW=.04;
        for(let i=1;i<=pN;i++){const u=i/(pN+1);
          vstrip(bx,by,fw,left,dm,u-pW*.5,u+pW*.5,by+vMar,faceH,d2);}
        const n=2+((s*29)|0)%2, bh=faceH*.09;
        for(let i=0;i<n;i++){const y0=by+vMar+(i+1)*(faceH/(n+1))-bh*.5;
          hband(bx,by,fw,left,dm,y0,bh,m2);}
      }
    }

    // caps
    const cap=Math.max(2,faceH*.04);
    hband(bx,by,fw,left,dm,by+vMar-cap*.5,cap,"#00000033");
    hband(bx,by,fw,left,dm,by+vMar+faceH-cap*.5,cap,"#00000033");

    // side edges
    const ew=fw*.02;
    vstrip(bx,by,fw,left,dm,0,   ew/fw,by+vMar,faceH,"#00000040");
    vstrip(bx,by,fw,left,dm,1-ew/fw,1,by+vMar,faceH,"#00000040");
  };

  face(cL,x,y,fwL, 1,true, baseL);
  face(cR,x+side,y+dep,fwR,-1,false,baseR);
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
export function drawBuilding(
  c:CanvasRenderingContext2D,
  x:number,y:number,
  v:BuildingVariant,
  t:number
){
  const WIN=8, GAP=6;
  const cL=v.colsLeft, cR=v.colsRight??cL;
  const fwL=cL*WIN+(cL-1)*GAP, fwR=cR*WIN+(cR-1)*GAP;
  const fh=v.h, side=fwL*.5, dep=fh*.03;

  walls(c,x,y,fwR,side,fh,dep, v.wallLeftColor??"#333", v.wallRightColor??"#222");
  if(v.columns) columns(c,x,y,cL,cR,fwL,fwR,side,fh,dep);
  windows(c,x,y,v,cL,cR,fwL,fwR,side,fh,dep,t);
  roof(c,x,y,fwL,fwR,side,dep,v,t);
}
