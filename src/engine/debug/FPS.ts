// src/engine/debug/FPS.ts
let C:CanvasRenderingContext2D|null=null, f=0, t0=0, fps=0;

export function attachFPS(ctx:CanvasRenderingContext2D){ C=ctx; f=0; t0=0; fps=0; }
export function tickFPS(t:number){
  if(!C) return;
  if(!t0) t0=t;
  f++;
  const dt=t-t0;
  if(dt>=1000){ fps = (f*1000/dt)|0; f=0; t0=t; }
}
export function drawFPS(){
  if(!C) return;
  const c=C;
  c.save();
  c.globalAlpha=.85;
  c.fillStyle="rgba(0,0,0,.5)"; c.fillRect(4,4,46,14);
  c.fillStyle="#0f0"; c.font="10px monospace";
  c.fillText(fps+"fps",8,14);
  c.restore();
}
