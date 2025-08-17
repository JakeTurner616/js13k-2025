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
type RowCfg = { min:number; max:number; sc:number; sp:number; gap:number; lift:number; bias:number; M:Map<number,BuildingVariant> };

export const MenuScene = {
  __ctx: null as CanvasRenderingContext2D | null,
  onClick: undefined as undefined | (() => void),

  _anim: null as AtlasAnimator | null,
  _pos: null as XY | null,

  _vapor: null as Drawer | null,
  _bgX: 0,
  _t0: 0,

  _rows: [
    { min:70, max:190, sc:.66, sp:.09, gap:118, lift:26, bias:.98,  M:new Map<number,BuildingVariant>() },
    { min:60, max:160, sc:.86, sp:.17, gap:132, lift:38, bias:1.04, M:new Map<number,BuildingVariant>() }
  ] as RowCfg[],

  setCanvas(ctx:CanvasRenderingContext2D){ this.__ctx = ctx; },
  setAnimator(a:AtlasAnimator){ this._anim = a; this._pos = null; },

  start(){
    this._rows[0].M.clear(); this._rows[1].M.clear();
    this._vapor = createFractalBackdropLayer(7, 0.12, 0.60, 84, "#131824", 4);
    this._bgX = 0; this._t0 = 0;

    // crisp pixels for sprite/atlas (optional but nice)
    if (this.__ctx) this.__ctx.imageSmoothingEnabled = false;

    addEventListener("click", () => this.onClick?.(), { once:true });
  },

  update(){ /* no-op (trail removed) */ },

  draw(tMs:number){
    const c = this.__ctx, a = this._anim;
    if (!c) return;

    if (!this._t0) this._t0 = tMs;
    const dt = (tMs - this._t0) * 0.001; this._t0 = tMs;
    const t = tMs * 0.001;
    this._bgX += 36 * dt;

    const { width:w, height:h } = c.canvas;

    // sky
    const g = c.createLinearGradient(0,0,0,h);
    [0,.4,.8,1].forEach((s,i)=>g.addColorStop(s, ["#090016","#250040","#1a1d2f","#0b0c12"][i]));
    c.fillStyle = g; c.fillRect(0,0,w,h);

    // effects
    drawStars(c, w, h, t, t*.15);
    drawMoon(c, w, h, t, this._bgX);
    this._vapor?.(c, w, h, t, this._bgX);
    drawClouds(c, w, h, t, this._bgX + t*.25);
    drawNeonHaze(c, w, h, t, this._bgX);

    // buildings + terrain
    const row = (r:RowCfg)=>{
      const { min,max, sc, sp, gap, lift, bias, M } = r;
      const lx = this._bgX * sp, sw = w / sc, si = Math.floor((lx - sw) / gap), ei = Math.ceil((lx + sw*2) / gap), hmul = (1/sc)*bias;
      c.save(); c.scale(sc, sc);
      for (let i=si;i<ei;i++){
        if (!M.has(i)) M.set(i, generateBuildingVariants(1, min, max, hmul)[0]);
        const v = M.get(i)!;
        const by = (h - v.h - 16 + (v as any).groundOffset + 28 + lift) / sc;
        drawBuilding(c, i*gap - lx, by, v, t);
      }
      c.restore();
    };
    row(this._rows[0]);
    drawTerrainBehind(c, w, h, t, this._bgX);
    row(this._rows[1]);
    drawTerrainFront(c, w, h, t, this._bgX);

    // cat (no afterimage trail)
    if (!a) return;
    const fw = a.fw|0, fh = a.fh|0;
    if (!this._pos) this._pos = { x: ((w - fw)>>1), y: ((h - fh)>>1) };
    const bob = Math.sin(t*1.7)*6, px = this._pos.x|0, py = (this._pos.y + bob)|0;
    const meta = a.getMeta("dash") || a.getMeta("idle"), frames = meta?.frameCount || 1, fps = meta?.fps || 8, frame = ((t*fps)|0) % frames;

    a.drawFrame(c, "dash", frame, px, py);

    // hint (glyph font)
    const sc = 2, cw = (5+1)*sc, tw = HINT.length*cw - 1*sc, hx = ((w - tw)/2)|0, hy = (h*.22)|0;
    c.globalAlpha = .6 + .4*Math.sin(t*4); drawText(c, HINT, hx, hy, sc, "#cbd5e1"); c.globalAlpha = 1;
  },

  _slip(c:CanvasRenderingContext2D, x:number, y:number, t:number){
    const wob = Math.sin(t*1.7)*6, L = 46, x0=x, y0=y, x3=x-L, y3=y+wob*.25, x1=x0-L*.38, y1=y0+wob*.30, x2=x0-L*.78, y2=y0-wob*.22;
    c.save();
    c.globalAlpha=.25; c.strokeStyle="#b6c3ff"; c.lineWidth=2;
    c.beginPath(); c.moveTo(x0,y0); c.bezierCurveTo(x1,y1,x2,y2,x3,y3); c.stroke();
    c.globalAlpha=.18; c.fillStyle="#dbe4ff";
    for (let i=1;i<=6;i++){
      const u=i/7, uu=1-u, uu2=uu*uu, u2=u*u;
      const bx=uu2*uu*x0 + 3*uu2*u*x1 + 3*uu*u2*x2 + u2*u*x3;
      const by=uu2*uu*y0 + 3*uu2*u*y1 + 3*uu*u2*y2 + u2*u*y3;
      const s=2 - u*1.2; c.fillRect((bx|0)-1,(by|0)-1,s,s);
    }
    c.restore();
  }
};
