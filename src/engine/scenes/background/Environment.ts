import { drawStars } from "../effects/Stars";
import { drawClouds } from "../effects/Clouds";
import { drawNeonHaze } from "../effects/NeonHaze";
import { drawMoon } from "../effects/Moon";
import { drawTerrainBehind, drawTerrainFront, createFractalBackdropLayer, type Drawer } from "../effects/terrain/Terrain";
import { drawBuilding } from "../objects/drawBuilding";
import { generateBuildingVariants } from "../init/initBuildingVariants";
import type { BuildingVariant } from "../objects/types";

type RowCfg = { min:number; max:number; sc:number; sp:number; gap:number; lift:number; bias:number; M:Map<number, BuildingVariant> };

export class Environment {
  private vapor: Drawer | null = null;
  private L: readonly RowCfg[] = [
    { min:80, max:250, sc:.60, sp:.08, gap:120, lift:30,  bias:.95, M:new Map() },
    { min:70, max:200, sc:.82, sp:.15, gap:136, lift:42,  bias:1.05, M:new Map() }
  ] as const;

  start(){ this.vapor = createFractalBackdropLayer(7, .12, .62, 90, "#131824", 4); this.L.forEach(r=>r.M.clear()); }

  draw(ctx:CanvasRenderingContext2D, time:number, bgX:number){
    const c = ctx, k = c.canvas, w = k.width, h = k.height;

    // sky
    const g = c.createLinearGradient(0,0,0,h);
    [0,.4,.8,1].forEach((s,i)=>g.addColorStop(s, ["#090016","#250040","#1a1d2f","#0b0c12"][i]));
    c.fillStyle = g; c.fillRect(0,0,w,h);

    // backdrops
    drawStars(c, w, h, time, time*.15);
    drawMoon(c, w, h, time, bgX);
    this.vapor?.(c, w, h, time, bgX);
    drawClouds(c, w, h, time, bgX + time*.25);
    drawNeonHaze(c, w, h, time, bgX);

    // parallax rows
    const row = (r:RowCfg)=>{
      const { min,max, sc, sp, gap, lift, bias, M } = r;
      const lx = bgX*sp, sw = w/sc, si = Math.floor((lx - sw)/gap), ei = Math.ceil((lx + sw*2)/gap), hmul = (1/sc)*bias;
      c.save(); c.scale(sc, sc);
      for (let i=si; i<ei; i++){
        if (!M.has(i)) M.set(i, generateBuildingVariants(1, min, max, hmul)[0]);
        const v = M.get(i)!;
        const by = (h - v.h - 20 + (v as any).groundOffset + 30 + lift) / sc;
        drawBuilding(c, i*gap - lx, by, v, time);
      }
      c.restore();
    };

    row(this.L[0]);
    drawTerrainBehind(c, w, h, time, bgX);
    row(this.L[1]);
    drawTerrainFront(c, w, h, time, bgX);
  }
}
