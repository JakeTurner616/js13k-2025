// src/engine/scenes/background/Environment.ts
import { drawStars, drawNeonHaze, drawMoon } from "../effects";
import {
  drawTerrainBehind,
  drawTerrainFront,
  createFractalBackdropLayer,
  type Drawer
} from "../effects/terrain/Terrain";
import { drawBuilding } from "../objects/drawBuilding";
import { generateBuildingVariants } from "../init/initBuildingVariants";
import type { BuildingVariant } from "../objects/drawBuilding";

type RowInit = { min:number; max:number; sc:number; sp:number; gap:number; lift:number; bias:number };
type RowCfg = RowInit & { M:Map<number, BuildingVariant> };

type EnvOpts = {
  /** Optional parallax rows override (menu can pass its own). */
  rows?: RowInit[];
  /** Vapor/backdrop tuning: oct, amp, freq, detail, color, seed */
  vaporArgs?: [number, number, number, number, string, number?];
};

const DEFAULT_ROWS: Readonly<RowInit[]> = [
      { min:70, max:190, sc:.66, sp:.39, gap:118, lift:26, bias:.98 },
      { min:60, max:160, sc:.86, sp:.57, gap:132, lift:38, bias:1.04 }
] as const;

export class Environment {
  private vapor: Drawer | null = null;
  private rows: RowCfg[] = [];
  private vaporArgs: Required<EnvOpts>["vaporArgs"];

  constructor(opts:EnvOpts = {}){
    const src = opts.rows ?? DEFAULT_ROWS;
    this.rows = src.map(r => ({ ...r, M:new Map() }));
    this.vaporArgs = (opts.vaporArgs ?? [7, .12, .62, 90, "#131824", 4]) as Required<EnvOpts>["vaporArgs"];
  }

  start(){
    const [oct, amp, freq, detail, color, seed=4] = this.vaporArgs;
    this.vapor = createFractalBackdropLayer(oct, amp, freq, detail, color, seed);
    this.rows.forEach(r=>r.M.clear());
  }

  draw(ctx:CanvasRenderingContext2D, time:number, bgX:number){
    const c = ctx, k = c.canvas, w = k.width, h = k.height;

    // sky gradient
    const g = c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,"#090016"); g.addColorStop(.4,"#250040");
    g.addColorStop(.8,"#1a1d2f"); g.addColorStop(1,"#0b0c12");
    c.fillStyle = g; c.fillRect(0,0,w,h);

    // backdrops
    drawStars(c, w, h, time, time*.15);
    drawMoon(c, w, h, time, bgX);
    this.vapor?.(c, w, h, time, bgX);

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

    row(this.rows[0]);
    drawTerrainBehind(c, w, h, time, bgX);
    row(this.rows[1]);
    drawTerrainFront(c, w, h, time, bgX);
  }
}
