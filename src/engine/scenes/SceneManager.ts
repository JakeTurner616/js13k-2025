import { tickFPS, drawFPS } from "../debug/FPS";

export type Scene={ start?():void; stop?():void; update():void; draw(now:number,alpha:number):void; };

let cur:Scene|null=null;
export const setScene=(s:Scene)=>{ cur?.stop?.(); cur=s; cur.start?.(); };

let DT=1/50, acc=0, last=0, MAX=10;
export const setSimHz=(hz:number)=>{ DT=1/Math.max(1,hz|0) };

let DHZ=0, DDT=0, lastDraw=0;
export const setDrawHz=(hz:number)=>{ DHZ=Math.max(0,hz|0); DDT=DHZ?1000/DHZ:0 };

export function loop(t:number){
  if(!cur){ requestAnimationFrame(loop); return; }
  if(!last) last=t;
  let d=(t-last)/1000; if(d>0.25) d=0.25; last=t; acc+=d;

  let n=0; while(acc>=DT && n++<MAX){ cur.update(); acc-=DT; }
  const alpha=acc/DT;

  if(!DHZ || t-lastDraw>=DDT){
    lastDraw=t;
    cur.draw(t,alpha);
    tickFPS(t); drawFPS();
  }
  requestAnimationFrame(loop);
}
