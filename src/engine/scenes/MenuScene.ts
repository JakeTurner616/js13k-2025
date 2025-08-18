// src/engine/scenes/MenuScene.ts
import type { AtlasAnimator } from "../../animation/AtlasAnimator";
import { drawStars } from "./effects/Stars";
import { drawClouds } from "./effects/Clouds";
import { drawNeonHaze } from "./effects/NeonHaze";
import { drawMoon } from "./effects/Moon";
import {
  createFractalBackdropLayer,
  drawTerrainBehind,
  drawTerrainFront,
  type Drawer
} from "./effects/terrain/Terrain";
import { drawBuilding } from "./objects/drawBuilding";
import { generateBuildingVariants } from "./init/initBuildingVariants";
import type { BuildingVariant } from "./objects/types";
import { drawText } from "../font/fontEngine";

const HINT = "CLICK / TAP TO START!";
type XY = { x:number; y:number };
type Row = { min:number; max:number; sc:number; sp:number; gap:number; lift:number; bias:number; M:Map<number,BuildingVariant> };

export const MenuScene = {
  __ctx: null as CanvasRenderingContext2D | null,
  onClick: undefined as undefined | (() => void),

  _anim: null as AtlasAnimator | null,
  _pos: null as XY | null,
  _vap: null as Drawer | null,
  _t0: 0,

  _rows: [
    { min:70, max:190, sc:.66, sp:.09, gap:118, lift:26, bias:.98,  M:new Map<number,BuildingVariant>() },
    { min:60, max:160, sc:.86, sp:.17, gap:132, lift:38, bias:1.04, M:new Map<number,BuildingVariant>() }
  ] as Row[],

  setCanvas(ctx:CanvasRenderingContext2D){ this.__ctx = ctx; },
  setAnimator(a:AtlasAnimator){ this._anim = a; this._pos = null; },

  start(){
    for (const r of this._rows) r.M.clear();
    this._vap = createFractalBackdropLayer(7, .12, .60, 84, "#131824", 4);
    this._t0 = 0;
    const c = this.__ctx; if (c) c.imageSmoothingEnabled = false;
    addEventListener("click", () => this.onClick?.(), { once:true });
  },

  update(){},

  draw(tMs:number){
    const c = this.__ctx, a = this._anim; if (!c) return;
    if (!this._t0) this._t0 = tMs;
    const t = (tMs - this._t0) * 1e-3, x = t * 36;
    const w = c.canvas.width, h = c.canvas.height;

    const g = c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,"#090016"); g.addColorStop(.4,"#250040");
    g.addColorStop(.8,"#1a1d2f"); g.addColorStop(1,"#0b0c12");
    c.fillStyle = g; c.fillRect(0,0,w,h);

    drawStars(c, w, h, t, t*.15);
    drawMoon(c, w, h, t, x);
    this._vap?.(c, w, h, t, x);
    drawClouds(c, w, h, t, x + t*.25);
    drawNeonHaze(c, w, h, t, x);

    const row = (r:Row)=>{
      const { min,max, sc, sp, gap, lift, bias, M } = r;
      const lx = x * sp, sw = w / sc, si = Math.floor((lx - sw) / gap), ei = Math.ceil((lx + sw*2) / gap), hm = (1/sc)*bias;
      c.save(); c.scale(sc, sc);
      for (let i=si;i<ei;i++){
        let v = M.get(i);
        if (!v){ v = generateBuildingVariants(1, min, max, hm)[0]; M.set(i, v); }
        const by = (h - v.h - 16 + (v as any).groundOffset + 28 + lift) / sc;
        drawBuilding(c, i*gap - lx, by, v, t);
      }
      c.restore();
    };

    row(this._rows[0]);
    drawTerrainBehind(c, w, h, t, x);
    row(this._rows[1]);
    drawTerrainFront(c, w, h, t, x);

    if (!a) return;
    const fw = a.fw|0, fh = a.fh|0;
    if (!this._pos) this._pos = { x: (w - fw) >> 1, y: (h - fh) >> 1 };
    const bob = Math.sin(t*1.7)*6, px = this._pos.x|0, py = (this._pos.y + bob)|0;
    const m = a.getMeta("dash") || a.getMeta("idle"), fc = m?.frameCount || 1, fps = m?.fps || 8, fr = ((t*fps)|0) % fc;
    a.drawFrame(c, "dash", fr, px, py);

    const sc = 2, cw = 6*sc, tw = HINT.length*cw - sc, hx = ((w - tw)/2)|0, hy = (h*.22)|0;
    c.globalAlpha = .6 + .4*Math.sin(t*4);
    drawText(c, HINT, hx, hy, sc, "#cbd5e1");
    c.globalAlpha = 1;
  }
};
