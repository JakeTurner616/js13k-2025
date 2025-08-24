// src/engine/renderer/render.ts
type Tiles=number[]|Uint32Array;

export const drawMapAndColliders=(ctx:CanvasRenderingContext2D,map:{width:number;height:number;tiles:Tiles},ts:number)=>{
  const {width:w,height:h,tiles:T}=map, off=ctx.canvas.height-h*ts;
  for(let y=0,i=0;y<h;y++)for(let x=0;x<w;x++,i++){
    const id=T[i] as number; if(!id) continue;
    ctx.fillStyle = id-134 ? "#000" : "#777"; // 134→grey, else black
    ctx.fillRect(x*ts, off+y*ts, ts, ts);
  }
};
