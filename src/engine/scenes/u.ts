// src/engine/scenes/u.ts
export const { sin: S, cos: Co, abs: A, min, max, floor: F } = Math;

export const clamp = (n:number,a:number,b:number)=>n<a?a:n>b?b:n;
export const POS   = (v:number,e=1e-3)=>v>e?v:e;

export const H=(n:number)=>{ const f=S(n*12.9898)*43758.5453; return f-(f|0); };
export const R=(seed:number)=>()=>{ seed=seed*1664525+1013904223|0; return ((seed>>>0)%1e6)/1e6; };

// 🎨 central palette + helpers
import { P as COLORS, NEON as _NEON, rgba as _rgba } from "../color/Colors"; // ← fixed path
export const P = COLORS;
export const col = (i:number)=>COLORS[i];
export const NEON = _NEON;
export const rgba = _rgba;

export const gradL=(c:CanvasRenderingContext2D,x0:number,y0:number,x1:number,y1:number,st:[number,number][])=>{
  const g=c.createLinearGradient(x0,y0,x1,y1);
  for(const [p,i] of st) g.addColorStop(p,col(i));
  return g;
};
export const gradR=(c:CanvasRenderingContext2D,x:number,y:number,r:number,st:[number,number][])=>{
  const g=c.createRadialGradient(x,y,0,x,y,POS(r));
  for(const [p,i] of st) g.addColorStop(p,col(i));
  return g;
};

export const poly=(c:CanvasRenderingContext2D, ci:number, pts:[number,number][])=>{
  c.fillStyle=col(ci); c.beginPath(); c.moveTo(...pts[0]);
  for(let i=1;i<pts.length;i++) c.lineTo(...pts[i]);
  c.closePath(); c.fill();
};

export const vstrip=(c:CanvasRenderingContext2D,bx:number,_by:number,fw:number,dm:number,u0:number,u1:number,y0:number,h:number,color:number|string,dep:number)=>{
  const lx0=u0*fw,lx1=u1*fw, x0=bx+(dm>0?lx0*.5:lx0), x1=bx+(dm>0?lx1*.5:lx1);
  const d0=(lx0/fw)*dep*dm, d1=(lx1/fw)*dep*dm;
  c.fillStyle=typeof color==="number"?col(color):color;
  c.beginPath();
  c.moveTo(x0,y0+d0); c.lineTo(x1,y0+d1); c.lineTo(x1,y0+d1+h); c.lineTo(x0,y0+d0+h);
  c.closePath(); c.fill();
};
export const hband=(c:CanvasRenderingContext2D,bx:number,by:number,fw:number,dm:number,y0:number,h:number,color:number|string,dep:number)=>
  vstrip(c,bx,by,fw,dm,0,1,y0,h,color,dep);

export const ridge=(x:number,s:number)=>(S(x*.018+s)*.6 + S(x*.034+s*1.7)*.3 + S(x*.058+s*2.3)*.15)*.5+.5;
export const fbm=(x:number,y:number,s:number)=>{
  let a=0,b=1;
  for(let o=2;o--;) { a+=b*(S(x*.02+s)+S(y*.02+s*1.3)+S((x+y)*.015+s*2.1))/3; b*=.5; x*=1.8; y*=1.8; }
  return a*.5+.5;
};

export const blink=(c:CanvasRenderingContext2D,x:number,y:number,r:number,t:number,a0=.5,ci=0,s=.85,d=.18)=>{
  const p=(t*s)%1, a=p<d?1-(p/d)*.2:a0;
  c.fillStyle=col(ci); c.globalAlpha=a;
  c.beginPath(); c.arc(x,y,r,0,7); c.fill();
  c.globalAlpha=1;
};
export const antenna=(c:CanvasRenderingContext2D,cx:number,cy:number,h:number,rungs:number,t:number,strokeCi=9,off=0)=>{
  c.strokeStyle=col(strokeCi);
  c.beginPath(); c.moveTo(cx,cy); c.lineTo(cx,cy-h); c.stroke();
  for(let i=1;i<=rungs;i++){ const y=cy-(h*i)/(rungs+1); c.beginPath(); c.moveTo(cx-3,y); c.lineTo(cx+3,y); c.stroke(); }
  blink(c,cx,cy-h-3,2,t,.1,0,.85+.5*off,.18+.08*off);
};

export type Draw = (c:CanvasRenderingContext2D,w:number,h:number,t:number,x:number)=>void;
export const layersBack:Draw[]=[]; export const layersMid:Draw[]=[]; export const layersFront:Draw[]=[];
export const addB=(d:Draw)=>layersBack.push(d);
export const addM=(d:Draw)=>layersMid.push(d);
export const addF=(d:Draw)=>layersFront.push(d);
