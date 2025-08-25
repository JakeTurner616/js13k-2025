// src/engine/scenes/MenuScene.ts
import type { AtlasAnimator } from "../../animation/AtlasAnimator";
import { drawText } from "../font/fontEngine";
import { Environment } from "./background/Environment";

const HINT="CLICK / TAP TO START!";

export const MenuScene={
  __ctx:null as CanvasRenderingContext2D|null,
  onClick:undefined as undefined|(()=>void),
  _anim:null as AtlasAnimator|null,
  _pos:null as {x:number;y:number}|null,
  _t0:0,_bgX0:0,_bgX1:0,_spd:36,
  _env:new Environment(),

  setCanvas(c:CanvasRenderingContext2D){ this.__ctx=c },
  setAnimator(a:AtlasAnimator){ this._anim=a; this._pos=null },

  start(){
    this._env.start(); this._t0=0; this._bgX0=this._bgX1=0;
    const c=this.__ctx; if(c) c.imageSmoothingEnabled=false;
    addEventListener("click",()=>this.onClick?.(),{once:true});
  },

  update(){
    this._bgX0=this._bgX1;
    this._bgX1+=this._spd*(1/50); // fixed-step scroll
  },

  draw(tMs:number,alpha:number){
    const c=this.__ctx,a=this._anim; if(!c) return;
    if(!this._t0) this._t0=tMs; const t=(tMs-this._t0)*1e-3;
    const x=this._bgX0+(this._bgX1-this._bgX0)*(alpha??0);

    this._env.draw(c,t,x);

    if(!a) return;
    const {width:w,height:h}=c.canvas, fw=a.fw|0, fh=a.fh|0;
    this._pos ||= {x:(w-fw)>>1, y:(h-fh)>>1};
    const px=this._pos.x|0, py=(this._pos.y+Math.sin(t*1.7)*6)|0;

    const m=a.getMeta("dash")||a.getMeta("idle"), fc=m?.frameCount||1, fps=m?.fps||8;
    a.drawFrame(c,"dash",((t*fps)|0)%fc,px,py);

    const sc=2, cw=6*sc, tw=HINT.length*cw-sc, hx=((w-tw)/2)|0, hy=(h*.22)|0;
    c.globalAlpha=.6+.4*Math.sin(t*4); drawText(c,HINT,hx,hy,sc,"#cbd5e1"); c.globalAlpha=1;
  }
};
