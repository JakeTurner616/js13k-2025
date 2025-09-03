// src/engine/renderer/render.ts
type Tiles=number[]|Uint32Array;
let px:CanvasPattern|null=null,pb:CanvasPattern|null=null;
const E="⬛";

const mk=(ch:string,c:string,sz=11)=>{
  const a=document.createElement("canvas"),g=a.getContext("2d")!;
  a.width=a.height=sz; g.font=sz+"px serif"; g.textAlign="center"; g.textBaseline="middle";
  g.fillStyle=c; g.fillText(ch,sz/2,sz/2); return g.createPattern(a,"repeat")!;
};

export const drawMapAndColliders=(ctx:CanvasRenderingContext2D,map:{width:number;height:number;tiles:Tiles},ts:number)=>{
  const c=ctx,{width:w,height:h,tiles:T}=map,off=(c.canvas.height-h*ts)|0;
  px??=mk(E,"#0006"); pb??=mk(E,"#fff2"); // grey→dark grid, black→light grid

  for(let y=0,i=0;y<h;y++)for(let x=0;x<w;x++,i++){
    const v=T[i] as number; if(!v)continue;
    const X=(x*ts)|0,Y=(off+y*ts)|0;

    if(v==4){ // spike
      c.fillStyle="#5d5d5d";
      c.beginPath(); c.moveTo(X,Y+ts); c.lineTo(X+ts/2,Y); c.lineTo(X+ts,Y+ts);
      c.fill(); c.strokeStyle="#777"; c.stroke();
      continue;
    }

    const g=v==2;
    c.fillStyle=g?"#777":"#000"; c.fillRect(X,Y,ts,ts);
    c.fillStyle=(g?px:pb)!;      c.fillRect(X,Y,ts,ts);

    if(g){
      c.fillStyle="#fff3";
      if((y?T[i-w]:0)-2)     c.fillRect(X,      Y,       ts,1);
      if((y<h-1?T[i+w]:0)-2) c.fillRect(X,      Y+ts-1,  ts,1);
      if((x?T[i-1]:0)-2)     c.fillRect(X,      Y,       1, ts);
      if((x<w-1?T[i+1]:0)-2) c.fillRect(X+ts-1, Y,       1, ts);
    }
  }
};
