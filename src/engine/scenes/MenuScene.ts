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

  // time anchor for effects (clouds, stars, bobbing)
  _t0: 0,

  // --- fixed-step parallax state (pre & cur for interpolation) ---
  _bgX0: 0,     // previous simulated bgX
  _bgX1: 0,     // current simulated bgX
  _spd: 36,     // pixels/sec in world (same as before)

  // Use Environment with menu-flavored parallax rows (keeps original look)
  _env: new Environment({

  }),

  setCanvas(ctx:CanvasRenderingContext2D){ this.__ctx = ctx; },
  setAnimator(a:AtlasAnimator){ this._anim = a; this._pos = null; },

  start(){
    this._env.start();
    this._t0 = 0;

    // reset bg scroll state
    this._bgX0 = 0;
    this._bgX1 = 0;

    const c = this.__ctx;
    if (c) c.imageSmoothingEnabled = false;
    addEventListener("click", () => this.onClick?.(), { once:true });


  },

  // NOTE: SceneManager runs update() at a fixed sim dt (default 1/50s).
  // We move bgX progression here so render uses alpha-blended interpolation.
  update(){
    // shift current -> previous
    this._bgX0 = this._bgX1;

    // advance using the engine's fixed step (50Hz = 0.02s). If you change
    // setSimHz() globally, consider exposing it and using that value here.
    const DT = 1/50;
    this._bgX1 += this._spd * DT; // world px per second
  },

  // draw(nowMs, alpha)
  draw(tMs:number, alpha:number){
    const c = this.__ctx, a = this._anim;
    if (!c) return;

    // establish a stable time base for effects
    if (!this._t0) this._t0 = tMs;
    const t = (tMs - this._t0) * 1e-3;

    // interpolate bg position for perfectly smooth parallax
    const x = this._bgX0 + (this._bgX1 - this._bgX0) * (alpha ?? 0);

    const w = c.canvas.width, h = c.canvas.height;

    // shared environment (sky, stars, clouds, haze, buildings, terrain)
    this._env.draw(c, t, x);

    // hero sprite bob + hint text
    if (!a) return;
    const fw = a.fw|0, fh = a.fh|0;
    if (!this._pos) this._pos = { x: (w - fw) >> 1, y: (h - fh) >> 1 };

    const bob = Math.sin(t*1.7)*6;
    const px = this._pos.x|0, py = (this._pos.y + bob)|0;

    const m = a.getMeta("dash") || a.getMeta("idle");
    const fc = m?.frameCount || 1, fps = m?.fps || 8;
    const fr = ((t*fps)|0) % fc;
    a.drawFrame(c, "dash", fr, px, py);

    const sc = 2, cw = 6*sc;
    const tw = HINT.length*cw - sc;
    const hx = ((w - tw)/2)|0, hy = (h*.22)|0;

    c.globalAlpha = .6 + .4*Math.sin(t*4);
    drawText(c, HINT, hx, hy, sc, "#cbd5e1");
    c.globalAlpha = 1;
  }
};
