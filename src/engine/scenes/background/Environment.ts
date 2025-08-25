// src/engine/scenes/background/Environment.ts
import { layersBack, layersMid, layersFront, col } from "../u";
import "../effects"; // ← registers stars + moon + haze into layersBack
import { drawBuilding, type BV } from "../objects/drawBuilding";
import { generateBuildingVariants } from "../init/initBuildingVariants";

type RowCfg={min:number;max:number;sc:number;sp:number;gap:number;bias:number;drop:number;M:Map<number,BV>};

// back row (smaller/farther), front row (bigger/nearer); `drop` sinks bottoms off-screen
const ROWS:Readonly<Omit<RowCfg,"M">[]>=[
  { min:100, max:250, sc:.66, sp:.18, gap:120, bias:.98, drop:120 },
  { min:80, max:200, sc:.88, sp:.26, gap:132, bias:1.04, drop:60 }
] as const;

export class Environment{
  private rows:RowCfg[]=ROWS.map(r=>({...r, M:new Map()}));
  start(){ for(const r of this.rows) r.M.clear(); }

  draw(c:CanvasRenderingContext2D,time:number,bgX:number){
    const {width:w,height:h}=c.canvas;

    // sky gradient (palette 4..7)
    const g=c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,col(4)); g.addColorStop(.4,col(5));
    g.addColorStop(.8,col(6)); g.addColorStop(1,col(7));
    c.fillStyle=g; c.fillRect(0,0,w,h);

    // back effects (stars/moon/haze)
    for(const d of layersBack) d(c,w,h,time,bgX);

    // row renderer
    const row=(r:RowCfg)=>{
      const {min,max,sc,sp,gap,bias,drop,M}=r, lx=bgX*sp, sw=w/sc, hmul=(1/sc)*bias;
      const si=((lx-sw)/gap|0)-1, ei=((lx+sw*2)/gap|0)+1;

      c.save(); c.scale(sc,sc);
      for(let i=si;i<ei;i++){
        if(!M.has(i)) M.set(i, generateBuildingVariants(1,min,max,hmul)[0]);
        const v=M.get(i)!;
        const top=((h+drop)-v.h)/sc; // bottom sits below canvas
        drawBuilding(c, i*gap - lx, top, v, time);
      }
      c.restore();
    };

    // back row → (optional) mid → front row → (optional) front overlays
    row(this.rows[0]);
    for(const d of layersMid) d(c,w,h,time,bgX);
    row(this.rows[1]);
    for(const d of layersFront) d(c,w,h,time,bgX);
  }
}
