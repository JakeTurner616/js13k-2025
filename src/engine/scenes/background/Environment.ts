// src/engine/scenes/background/Environment.ts
import { layersBack, layersMid, layersFront, col } from "../u";
import "../effects"; // registers stars + moon + haze into layersBack
import { drawBuilding, type BV } from "../objects/drawBuilding";
import { generateBuildingVariants } from "../init/initBuildingVariants";

type RowCfg={min:number;max:number;sc:number;sp:number;gap:number;bias:number;drop:number;M:Map<number,BV>};

const ROWS:Readonly<Omit<RowCfg,"M">[]>=[
  { min:100, max:250, sc:.66, sp:.18, gap:120, bias:.98, drop:120 },
  { min:80, max:200, sc:.88, sp:.26, gap:132, bias:1.04, drop:60 }
] as const;

export class Environment{
  private rows:RowCfg[]=ROWS.map(r=>({...r, M:new Map()}));
  private _g:any; private _gW=0; private _gH=0;
  start(){ for(const r of this.rows) r.M.clear(); }

  draw(c:CanvasRenderingContext2D,time:number,bgX:number){
    const {width:w,height:h}=c.canvas;

    if(this._gW!==w || this._gH!==h){
      const gg=c.createLinearGradient(0,0,0,h);
      gg.addColorStop(0,col(4)); gg.addColorStop(.4,col(5));
      gg.addColorStop(.8,col(6)); gg.addColorStop(1,col(7));
      this._g=gg; this._gW=w; this._gH=h;
    }
    c.fillStyle=this._g; c.fillRect(0,0,w,h);

    for(const d of layersBack) d(c,w,h,time,bgX);

    const row=(r:RowCfg)=>{
      const {min,max,sc,sp,gap,bias,drop,M}=r;
      const lx = bgX*sp;                 // no integer snap
      const sw = w/sc;
      const hmul=(1/sc)*bias;

      // cover screen + a little extra on both sides
      const si = Math.floor((lx - sw)/gap) - 1;
      const ei = Math.floor((lx + sw*2)/gap) + 1;

      c.save();
      c.scale(sc,sc);
      c.translate(-lx,0);                // smooth sub-pixel scroll

      for(let i=si;i<ei;i++){
        let v=M.get(i);
        if(!v){ v = generateBuildingVariants(1,min,max,hmul)[0]; M.set(i,v); }
        const x = i*gap;                 // in row-space; no extra |0
        const top = (h+drop)/sc - v.h;   // already in row-space
        drawBuilding(c,x,top,v!,time,sc);
      }
      c.restore();
    };

    row(this.rows[0]);
    for(const d of layersMid) d(c,w,h,time,bgX);
    row(this.rows[1]);
    for(const d of layersFront) d(c,w,h,time,bgX);
  }
}
