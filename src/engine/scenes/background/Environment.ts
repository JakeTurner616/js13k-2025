// src/engine/scenes/background/Environment.ts

// 🔹 Side-effect imports to register layers (stars/moon/haze + terrain)
import "../effects";
import "../effects/terrain/Terrain";

import { layersBack, layersMid, layersFront } from "../u";

import { drawBuilding, type BV } from "../objects/drawBuilding";
import { generateBuildingVariants } from "../init/initBuildingVariants";

type RowInit = { min:number; max:number; sc:number; sp:number; gap:number; lift:number; bias:number };
type RowCfg  = RowInit & { M:Map<number,BV> };

const DEFAULT_ROWS: Readonly<RowInit[]> = [
  { min:70, max:190, sc:.66, sp:.39, gap:118, lift:26, bias:.98 },
  { min:60, max:160, sc:.86, sp:.57, gap:132, lift:38, bias:1.04 }
] as const;

export class Environment {
  private rows: RowCfg[] = DEFAULT_ROWS.map(r=>({...r, M:new Map()}));

  start(){
    this.rows.forEach(r => r.M.clear());
  }

  draw(c:CanvasRenderingContext2D, time:number, bgX:number){
    const { width:w, height:h } = c.canvas;

    // background gradient
    const g=c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,"#090016");
    g.addColorStop(.4,"#250040");
    g.addColorStop(.8,"#1a1d2f");
    g.addColorStop(1,"#0b0c12");
    c.fillStyle=g;
    c.fillRect(0,0,w,h);

    // back layers (registered via side-effect imports)
    for(const d of layersBack) d(c,w,h,time,bgX);

    // parallax row helper
    const row=(r:RowCfg)=>{
      const { min,max, sc, sp, gap, lift, bias, M } = r;
      const lx=bgX*sp, sw=w/sc;
      const si=Math.floor((lx - sw)/gap), ei=Math.ceil((lx + sw*2)/gap);
      const hmul=(1/sc)*bias;

      c.save(); c.scale(sc,sc);
      for(let i=si;i<ei;i++){
        if(!M.has(i)) M.set(i, generateBuildingVariants(1,min,max,hmul)[0]);
        const v=M.get(i)!;
        const by=(h - v.h - 20 + (v as any).groundOffset + 30 + lift) / sc;
        drawBuilding(c, i*gap - lx, by, v, time);
      }
      c.restore();
    };

    // rows + mid/terrain
    row(this.rows[0]);
    for(const d of layersMid) d(c,w,h,time,bgX);
    row(this.rows[1]);

    // front layers
    for(const d of layersFront) d(c,w,h,time,bgX);
  }
}
