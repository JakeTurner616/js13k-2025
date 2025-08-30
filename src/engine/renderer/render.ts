// src/engine/renderer/render.ts
type Tiles=number[]|Uint32Array;

export const drawMapAndColliders=(ctx:CanvasRenderingContext2D,map:{width:number;height:number;tiles:Tiles},ts:number)=>{
  const {width:w,height:h,tiles:T}=map, off=ctx.canvas.height-h*ts;
  for(let y=0,i=0;y<h;y++)for(let x=0;x<w;x++,i++){
    const id=T[i] as number; if(!id) continue;
    const X=x*ts, Y=off+y*ts;
    if(id==4){
      // upward triangle
      ctx.fillStyle="#a11";
      ctx.beginPath(); ctx.moveTo(X, Y+ts); ctx.lineTo(X+ts/2, Y);     ctx.lineTo(X+ts, Y+ts); ctx.closePath(); ctx.fill();

     
    }else{
      ctx.fillStyle = id==2 ? "#777" : "#000"; // 2→grey, else black
      ctx.fillRect(X,Y,ts,ts);
    }
  }
};
