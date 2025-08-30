// repo-fix/src/engine/scenes/u.ts
export const { sin:S, cos:Co } = Math;

export const clamp=(n:number,a:number,b:number)=>n<a?a:n>b?b:n;
export const POS=(v:number,e=1e-3)=>v>e?v:e;
export const H=(n:number)=>{const f=S(n*12.9898)*43758.5453; return f-(f|0) };

import { P as COLORS, rgba as _rgba } from "../color/Colors";
export const P=COLORS, rgba=_rgba, col=(i:number)=>COLORS[i];

export const poly=(c:CanvasRenderingContext2D,ci:number,pts:[number,number][])=>{
  c.fillStyle=col(ci); c.beginPath(); c.moveTo(...pts[0]);
  for(let i=1;i<pts.length;i++) c.lineTo(...pts[i]);
  c.closePath(); c.fill();
};

export const vstrip=(c:CanvasRenderingContext2D,bx:number,_by:number,fw:number,dm:number,u0:number,u1:number,y0:number,h:number,color:number|string,dep:number)=>{
  const lx0=u0*fw,lx1=u1*fw,x0=bx+(dm>0?lx0*.5:lx0),x1=bx+(dm>0?lx1*.5:lx1),
        d0=(lx0/fw)*dep*dm,d1=(lx1/fw)*dep*dm;
  c.fillStyle=typeof color==="number"?col(color):color;
  c.beginPath();
  c.moveTo(x0,y0+d0); c.lineTo(x1,y0+d1); c.lineTo(x1,y0+d1+h); c.lineTo(x0,y0+d0+h);
  c.closePath(); c.fill();
};
export const hband=(c:CanvasRenderingContext2D,bx:number,by:number,fw:number,dm:number,y0:number,h:number,color:number|string,dep:number)=>
  vstrip(c,bx,by,fw,dm,0,1,y0,h,color,dep);

export type Draw=(c:CanvasRenderingContext2D,w:number,h:number,t:number,x:number)=>void;
export const layersBack:Draw[]=[], layersMid:Draw[]=[], layersFront:Draw[]=[];
export const addB=(d:Draw)=>layersBack.push(d), addM=(d:Draw)=>layersMid.push(d), addF=(d:Draw)=>layersFront.push(d);
