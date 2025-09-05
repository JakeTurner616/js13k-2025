// repo-fix/src/engine/scenes/background/Environment.ts
import { layersBack, layersMid, layersFront, col } from "../u";
import "../effects";
import { drawBuilding, type BV } from "../objects/drawBuilding";
import { generateBuildingVariants } from "../init/initBuildingVariants";

type RowCfg = {
  min:number; max:number; sc:number; sp:number; gap:number; drop:number; M:Map<number,BV>;
};

const ROWS: RowCfg[] = [
  { min:190, max:240, sc:1.2, sp:.48, gap:130, drop:20 },
  { min: 80, max:150, sc:1.0, sp:.50, gap:120, drop:10 }
].map(r=>({...r, M:new Map<number,BV>()}));

export class Environment{
  private _g:any; private _h=0;

  start(){ ROWS.forEach(r=>r.M.clear()); }

  draw(c:CanvasRenderingContext2D, time:number, bgX:number){
    const {width:w,height:h}=c.canvas;
    if(this._h!==h){
      const g=c.createLinearGradient(0,0,0,h);
      g.addColorStop(0 ,col(4));
      g.addColorStop(.4,col(5));
      g.addColorStop(.8,col(6));
      g.addColorStop(1 ,col(7));
      this._g=g; this._h=h;
    }
    c.fillStyle=this._g; c.fillRect(0,0,w,h);

    layersBack.forEach(d=>d(c,w,h,time,bgX));
    this._row(c,w,h,bgX,ROWS[0]);
    layersMid.forEach(d=>d(c,w,h,time,bgX));
    this._row(c,w,h,bgX,ROWS[1]);
    layersFront.forEach(d=>d(c,w,h,time,bgX));
  }

  /** Infinite rows with local anchoring: never translate more than ~gap px. */
  private _row(c:CanvasRenderingContext2D,w:number,h:number,bgX:number,r:RowCfg){
    const {min,max,sc,sp,gap,drop,M}=r;
    const inv=1/sc;

    // world-scroll projected into this layer
    const lx=bgX*sp*.6;

    // anchor near camera: base index + small offset in [0,gap)
    const base=(lx/gap)|0;                // floor
    const off = lx - base*gap;            // local offset (0..gap)

    // draw a fixed window around camera; keep small to limit draw calls
    const N=((w*inv/gap)|0)+3;            // coverage + small pad

    c.save();
    c.scale(sc,sc);
    c.translate(-off,0);                  // only ever < gap translation

    const y0=(h+drop)*inv;
    for(let i=-N;i<N;i++){
      const idx=base+i;
      let v=M.get(idx);
      if(!v){ v=generateBuildingVariants(1,min,max,inv)[0]; M.set(idx,v); }
      drawBuilding(c, i*gap, y0 - v.h, v, sc);
    }
    c.restore();
  }
}
