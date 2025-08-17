// src/engine/scenes/SceneManager.ts
export type Scene={start?():void;stop?():void;update():void;draw(t:number):void};
let cur:Scene|null=null;
export function setScene(s:Scene){cur?.stop?.();cur=s;cur.start?.();}

let DT=1/50,acc=0,last=0,MAX=10; // 50 Hz sim cap
export function setSimHz(hz:number){DT=1/Math.max(1,hz);} // optional override

export function loop(t:number){
  if(!cur){requestAnimationFrame(loop);return;}
  if(!last) last=t;
  let d=(t-last)/1000; if(d>0.25)d=0.25; last=t; acc+=d;
  let n=0; while(acc>=DT && n++<MAX){cur.update(); acc-=DT;}
  cur.draw(t);
  requestAnimationFrame(loop);
}
