// src/engine/scenes/objects/drawBuilding.ts
// One-file building renderer: walls + columns + windows + roof + antenna + light.

export type BuildingVariant = {
  h: number;
  colsLeft: number;
  colsRight?: number;
  hat?: boolean;
  columns?: boolean;
  sills?: boolean;
  rows: number;
  hasAntenna?: boolean;
  antennaHeight?: number;
  antennaRungs?: number;
  wallLeftColor?: string;
  wallRightColor?: string;
  windowLights?: string[][]; // ignored by fascia renderer
  // optional tuned pixels used by roof:
  hatOverhangPx?: number;
  hatHeightPx?: number;
  blinkOffset?: number;      // reused as style seed if present
};

const poly = (c: CanvasRenderingContext2D, fill: string, pts: [number, number][]) => {
  c.fillStyle = fill; c.beginPath(); c.moveTo(...pts[0]);
  for (let i=1;i<pts.length;i++) c.lineTo(...pts[i]);
  c.closePath(); c.fill();
};

const clamp = (n:number, lo:number, hi:number)=> n<lo?lo:n>hi?hi:n;

// --- tiny light & antenna (inlined) ---
const blink = (
  ctx: CanvasRenderingContext2D,
  x:number, y:number, color:string, size:number,
  time:number, speed=1, duty=.5
)=>{
  const p=(time*speed)%1, on=p<duty, a=on?1-(p/duty)*.2:.1;
  ctx.fillStyle=color; ctx.globalAlpha=a;
  ctx.beginPath(); ctx.arc(x,y,size,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
};

const drawAntenna = (
  ctx:CanvasRenderingContext2D, cx:number, cy:number,
  poleHeight:number, rungs:number,
  time:number, glowOnly=false, blinkOffset=0
)=>{
  if(!glowOnly){
    ctx.strokeStyle="#444";
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx,cy-poleHeight); ctx.stroke();
    for(let i=1;i<=rungs;i++){
      const y=cy-(poleHeight*i)/(rungs+1);
      ctx.beginPath(); ctx.moveTo(cx-3,y); ctx.lineTo(cx+3,y); ctx.stroke();
    }
  }
  const phase=blinkOffset, speed=0.85+blinkOffset*.5, duty=0.18+blinkOffset*.08;
  blink(ctx,cx,cy-poleHeight-3,"#ff2020",2,time+phase,speed,duty);
};

// --- walls ---
const drawWalls = (
  ctx:CanvasRenderingContext2D,
  x:number, y:number,
  fwRight:number, side:number, fh:number, depth:number,
  wallLeftColor:string, wallRightColor:string
)=>{
  const fwSum=side+fwRight;
  const tr=(ctx as any).getTransform?ctx.getTransform():{a:1,d:1};
  const ex=0.5/(tr as any).a, ey=0.5/(tr as any).d;

  // RIGHT wall first
  poly(ctx, wallRightColor, [
    [x+side-ex, y+depth],
    [x+fwSum,   y],
    [x+fwSum,   y+fh+ey],
    [x+side-ex, y+fh+depth]
  ]);

  // LEFT wall overlaps shared edge slightly
  poly(ctx, wallLeftColor, [
    [x,           y],
    [x,           y+fh+ey],
    [x+side+ex,   y+fh+depth],
    [x+side+ex,   y+depth]
  ]);
};

// --- columns ---
const drawColumns = (
  ctx:CanvasRenderingContext2D,
  x:number, y:number,
  cL:number, cR:number,
  fwL:number, fwR:number,
  side:number, fh:number, depth:number
)=>{
  const winW=8, hSpace=6;
  const drawSide=(cols:number, baseX:number, baseY:number, wallW:number, dMul:number, fill:string)=>{
    ctx.fillStyle=fill;
    for(let c=1;c<cols;c++){
      const lx=c*(winW+hSpace)-hSpace/2,
            x0=baseX+(dMul>0?lx*.5:lx),
            d0=(lx/wallW)*depth*dMul,
            d1=((lx+1)/wallW)*depth*dMul,
            y0=baseY, y1=baseY+fh;
      ctx.beginPath();
      ctx.moveTo(x0,            y0+d0);
      ctx.lineTo(x0+0.5*dMul,   y0+d1);
      ctx.lineTo(x0+0.5*dMul,   y1+d1);
      ctx.lineTo(x0,            y1+d0);
      ctx.closePath(); ctx.fill();
    }
  };
  drawSide(cL,x,y,fwL, 1,"#444");
  drawSide(cR,x+side,y+depth,fwR,-1,"#333");
};

// --- windows (uniform fascia per building, with iso border caps) ---
const drawWindows = (
  ctx:CanvasRenderingContext2D,
  x:number, y:number,
  v:BuildingVariant,
  cL:number, cR:number,
  fwL:number, fwR:number,
  side:number, fh:number, depth:number,
  _time:number
)=>{
  const vMar=fh*0.08, faceH=fh-vMar*2;
  const baseL=v.wallLeftColor  || "#2a2a2f";
  const baseR=v.wallRightColor || "#232327";
  const d1="#1b1b20", d2="#16161a", m1="#34343b", m2="#2a2a30";

  const seed=(n:number)=>((Math.sin(n*12.9898)*43758.5453)%1+1)%1;

  // shared style params
  const styleSeed=(v.blinkOffset??0)*3.17+v.colsLeft*0.73+(v.colsRight??v.colsLeft)*0.41+v.rows*0.19;
  const s=seed(styleSeed), variantId=(s*997|0)%5;
  const shared={
    bands:4+((s*13)|0)%3,
    slats:12+((s*19)|0)%8,
    steps:3+((s*17)|0)%4,
    pilasters:Math.max(2,Math.min(5,((cL|0)>>1)||3)),
    pW:0.05+(s*0.02)
  };

  // iso helpers
  const vstrip=(bx:number,by:number,fw:number,left:boolean,dMul:number,u0:number,u1:number,y0:number,h:number,color:string)=>{
    const lx0=u0*fw,lx1=u1*fw,x0=bx+(left?lx0*0.5:lx0),x1=bx+(left?lx1*0.5:lx1);
    const d0=(lx0/fw)*depth*dMul,dA=(lx1/fw)*depth*dMul;
    ctx.fillStyle=color; ctx.beginPath();
    ctx.moveTo(x0,y0+d0); ctx.lineTo(x1,y0+dA);
    ctx.lineTo(x1,y0+dA+h); ctx.lineTo(x0,y0+d0+h);
    ctx.closePath(); ctx.fill();
  };
  const hband=(bx:number,by:number,fw:number,left:boolean,dMul:number,y0:number,h:number,color:string)=>{
    vstrip(bx,by,fw,left,dMul,0,1,y0,h,color);
  };

  const face=(cols:number,bx:number,by:number,fw:number,dMul:number,left:boolean,base:string)=>{
    // base wash
    hband(bx,by,fw,left,dMul,by+vMar,faceH,base);

    switch(variantId){
      case 0:{ const bands=shared.bands,bh=faceH*0.12;
        for(let i=0;i<bands;i++){const t=(i+1)/(bands+1),y0=by+vMar+t*faceH-bh*0.5;
          hband(bx,by,fw,left,dMul,y0,bh,(i&1)?m1:d1);}
        break; }
      case 1:{ const slats=shared.slats,gh=faceH/(slats*1.8);
        for(let i=0;i<slats;i++){const y0=by+vMar+(i+0.5)*(faceH/slats)-gh*0.5;
          hband(bx,by,fw,left,dMul,y0,gh,(i%3===0)?m2:d2);}
        break; }
      case 2:{ const bands=shared.steps;
        for(let i=0;i<bands;i++){const t=(i+1)/(bands+1),bh=faceH*0.13,y0=by+vMar+t*faceH-bh*0.5;
          hband(bx,by,fw,left,dMul,y0,bh,m2);
          const ih=Math.max(2,bh*0.22);
          vstrip(bx,by,fw,left,dMul,0.06,0.94,y0+bh*0.5-ih*0.5,ih,m1);}
        break; }
      case 3:{ const pN=shared.pilasters,pW=shared.pW;
        for(let i=1;i<=pN;i++){const u=i/(pN+1);
          vstrip(bx,by,fw,left,dMul,u-pW*0.5,u+pW*0.5,by+vMar,faceH,d1);}
        const ch=faceH*0.06;
        hband(bx,by,fw,left,dMul,by+vMar,ch,m1);
        hband(bx,by,fw,left,dMul,by+vMar+faceH-ch,ch,m1);
        break; }
      default:{ const pN=2+((s*23)|0)%3,pW=0.04;
        for(let i=1;i<=pN;i++){const u=i/(pN+1);
          vstrip(bx,by,fw,left,dMul,u-pW*0.5,u+pW*0.5,by+vMar,faceH,d2);}
        const bands=2+((s*29)|0)%2;
        for(let i=0;i<bands;i++){const y0=by+vMar+(i+1)*(faceH/(bands+1))-faceH*0.045;
          hband(bx,by,fw,left,dMul,y0,faceH*0.09,m2);}
      }
    }

    // borders: top & bottom caps
    const capH=Math.max(2,faceH*0.04);
    hband(bx,by,fw,left,dMul,by+vMar-capH*0.5,capH,"#00000033");
    hband(bx,by,fw,left,dMul,by+vMar+faceH-capH*0.5,capH,"#00000033");

    // borders: left/right edges
    const eW=fw*0.02;
    vstrip(bx,by,fw,left,dMul,0,eW/fw,by+vMar,faceH,"#00000040");
    vstrip(bx,by,fw,left,dMul,1-eW/fw,1,by+vMar,faceH,"#00000040");
  };

  face(cL,x,y,fwL, 1,true, baseL);
  face(cR,x+side,y+depth,fwR,-1,false,baseR);
};

// --- roof (calls antenna) ---
const drawRoof = (
  ctx:CanvasRenderingContext2D,
  x:number, y:number,
  fwLeft:number, fwRight:number,
  side:number, depth:number,
  v:BuildingVariant, time:number
)=>{
  const fwSum=side+fwRight;
  const tr=(ctx as any).getTransform?ctx.getTransform():{a:1,d:1};
  const ey=0.75/(tr as any).d;

  poly(ctx,"#555",[
    [x,y+ey],[x+fwLeft,y-depth],[x+fwSum,y+ey],[x+side,y+depth+ey]
  ]);

  if(!v.hat) return;

  const pad=(v as any).hatOverhangPx ?? clamp(Math.round(side*.08),3,8);
  const hh =(v as any).hatHeightPx  ?? clamp(Math.round(depth*.55),6,12);

  poly(ctx,"#444",[
    [x-pad,y-hh],[x,y+ey],[x+side,y+depth+ey],[x+side,y-hh+depth]
  ]);
  poly(ctx,"#333",[
    [x+side,y-hh+depth],[x+side,y+depth+ey],[x+fwSum,y+ey],[x+fwSum+pad,y-hh]
  ]);
  poly(ctx,"#666",[
    [x-pad,y-hh+ey],[x+fwLeft,y-hh-depth+ey],[x+fwSum+pad,y-hh+ey],[x+side,y-hh+depth+ey]
  ]);

  if(v.hasAntenna&&v.antennaHeight&&v.antennaRungs){
    drawAntenna(ctx,x+fwLeft*.5,y-hh+ey,v.antennaHeight,v.antennaRungs,time,false,(v as any).blinkOffset??0);
  }
};

// === public: drawBuilding ===
export function drawBuilding(
  ctx:CanvasRenderingContext2D,
  x:number,y:number,
  variant:BuildingVariant,
  time:number
){
  const winW=8,hSpacing=6;
  const colsLeft=variant.colsLeft;
  const colsRight=variant.colsRight ?? colsLeft;

  const fwLeft = colsLeft*winW + (colsLeft-1)*hSpacing;
  const fwRight= colsRight*winW+ (colsRight-1)*hSpacing;
  const fh=variant.h, side=fwLeft*.5, depth=fh*.03;

  drawWalls(ctx,x,y,fwRight,side,fh,depth,
    variant.wallLeftColor ?? "#333",
    variant.wallRightColor?? "#222");

  if(variant.columns){
    drawColumns(ctx,x,y,colsLeft,colsRight,fwLeft,fwRight,side,fh,depth);
  }

  drawWindows(ctx,x,y,variant,colsLeft,colsRight,fwLeft,fwRight,side,fh,depth,time);
  drawRoof(ctx,x,y,fwLeft,fwRight,side,depth,variant,time);
}
