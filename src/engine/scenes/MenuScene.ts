// src/engine/scenes/MenuScene.ts
import type { AtlasAnimator } from "../../animation/AtlasAnimator";
import { drawText } from "../font/fontEngine";
import { Environment } from "./background/Environment";

const HINT = "CLICK / TAP TO START!";

type XY = { x:number; y:number };

export const MenuScene = {
  __ctx: null as CanvasRenderingContext2D | null,
  onClick: undefined as undefined | (() => void),

  _anim: null as AtlasAnimator | null,
  _pos: null as XY | null,
  _t0: 0,

  // Use Environment with menu-flavored parallax rows (keeps original look)
  _env: new Environment({
    rows: [
      { min:70, max:190, sc:.66, sp:.09, gap:118, lift:26, bias:.98 },
      { min:60, max:160, sc:.86, sp:.17, gap:132, lift:38, bias:1.04 }
    ],
    vaporArgs: [7, .12, .60, 84, "#131824", 4]
  }),

  setCanvas(ctx:CanvasRenderingContext2D){ this.__ctx = ctx; },
  setAnimator(a:AtlasAnimator){ this._anim = a; this._pos = null; },

  start(){
    this._env.start();
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

    // shared environment (sky, stars, clouds, haze, buildings, terrain)
    this._env.draw(c, t, x);

    // hero sprite bob + hint text
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
