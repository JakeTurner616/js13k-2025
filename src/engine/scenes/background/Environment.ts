// src/engine/scenes/background/Environment.ts
import { layersBack, layersMid, layersFront, col } from "../u";
import "../effects"; // registers stars + moon + haze into layersBack
import { drawBuilding, type BV } from "../objects/drawBuilding";
import { generateBuildingVariants } from "../init/initBuildingVariants";

type RowCfg = {
  min:number; max:number; sc:number; sp:number; gap:number; bias:number; drop:number; M:Map<number,BV>;
};

const ROWS: Readonly<Omit<RowCfg,"M">[]> = [
  { min:100, max:250, sc:.66, sp:.18, gap:120, bias:.98, drop:120 },
  { min:80,  max:200, sc:.88, sp:.26, gap:132, bias:1.04, drop:60  }
] as const;

export class Environment {
  private rows: RowCfg[] = ROWS.map(r => ({ ...r, M:new Map() }));
  private _g:any;         // gradient
  private _gK = "";       // gradient key "w×h"

  start(){ for(const r of this.rows) r.M.clear(); }

  private _row(c:CanvasRenderingContext2D, w:number, h:number, t:number, bgX:number, r:RowCfg){
    const {min,max,sc,sp,gap,bias,drop,M}=r, lx=bgX*sp, inv=1/sc, sw=w*inv, hmul=bias*inv;
    const si = ~~((lx - sw)/gap) - 1, ei = ~~((lx + sw*2)/gap) + 1;

    c.save();
    c.scale(sc,sc);
    c.translate(-lx,0);

    for(let i=si;i<ei;i++){
      let v = M.get(i) || (M.set(i, generateBuildingVariants(1,min,max,hmul)[0]), M.get(i)!);
      drawBuilding(c, i*gap, (h+drop)*inv - v.h, v, t, sc);
    }
    c.restore();
  }

  draw(c:CanvasRenderingContext2D, time:number, bgX:number){
    const {width:w, height:h} = c.canvas;
    const k = w+"×"+h;
    if (this._gK!==k){
      const g=c.createLinearGradient(0,0,0,h);
      const stops=[0,.4,.8,1], idx=[4,5,6,7];
      for(let i=0;i<4;i++) g.addColorStop(stops[i], col(idx[i]));
      this._g=g; this._gK=k;
    }
    c.fillStyle=this._g; c.fillRect(0,0,w,h);

    for(const d of layersBack) d(c,w,h,time,bgX);
    this._row(c,w,h,time,bgX,this.rows[0]);
    for(const d of layersMid)  d(c,w,h,time,bgX);
    this._row(c,w,h,time,bgX,this.rows[1]);
    for(const d of layersFront) d(c,w,h,time,bgX);
  }
}
