// src/engine/scenes/MenuScene.ts
import type { AtlasAnimator } from "../../animation/AtlasAnimator";
import { drawText as D } from "../font/fontEngine";
import { Environment } from "./background/Environment";
import { setScene } from "./SceneManager";

type Mode="menu"|"go";

// 🔒 Eat any pending tap/click/mouse burst for a short window so
// late-firing events from Menu/GameOver don't leak into the next scene.
function suppressPointerBurst(ms = 350){
  const stop = (e: Event) => { e.stopImmediatePropagation(); e.preventDefault(); };
  const opts = { capture: true, passive: false } as AddEventListenerOptions;
  const types = ["pointerdown","pointerup","mousedown","mouseup","click","touchstart","touchend"] as const;
  types.forEach(t => addEventListener(t, stop as any, opts));
  setTimeout(() => types.forEach(t => removeEventListener(t, stop as any, opts)), ms);
}

function makeTitleScene(mode:Mode){
  const isMenu=mode==="menu";
  return {
    __ctx:null as CanvasRenderingContext2D|null,
    onClick:undefined as undefined|(()=>void),
    _anim:null as AtlasAnimator|null,
    _pos:null as {x:number;y:number}|null,
    _t0:0,_bg0:0,_bg1:0,_spd:36,
    _env:new Environment(),

    setCanvas(c:CanvasRenderingContext2D){ this.__ctx=c },
    setAnimator(a:AtlasAnimator){ this._anim=a; this._pos=null },

    start(){
      this._env.start(); this._t0=0; this._bg0=this._bg1=0;
      const c=this.__ctx; if(c) c.imageSmoothingEnabled=false;
      if(isMenu){
        addEventListener("click",()=>{
          suppressPointerBurst();
          // Clear any lingering portals just in case
          dispatchEvent(new Event("portals:clear"));
          this.onClick?.();
        },{once:true});
      }else{
        addEventListener("click",()=>{
          suppressPointerBurst();
          // Stop music and return to menu with a clean slate
          dispatchEvent(new Event("scene:stop-music"));
          dispatchEvent(new Event("portals:clear"));
          setScene(MenuScene);
        },{once:true});
      }
    },

    update(){
      this._bg0=this._bg1;
      this._bg1+=this._spd*(1/40);
    },

    draw(tMs:number,alpha:number){
      const c=this.__ctx,a=this._anim; if(!c) return;
      this._t0||(this._t0=tMs);
      const t=(tMs-this._t0)/1e3, A=alpha||0, S=Math.sin, g:any=globalThis;
      const {width:w,height:h}=c.canvas;

      // background
      const x=this._bg0+(this._bg1-this._bg0)*A;
      this._env.draw(c,t,x);

      // player (center + bob)
      if(a){
        const fw=a.fw|0, fh=a.fh|0;
        this._pos ||= {x:(w-fw)>>1, y:(h-fh)>>1};
        const px=this._pos.x|0, py=(this._pos.y+S(t*1.7)*6)|0;
        const m=a.getMeta("dash")||a.getMeta("idle"), fc=m?.frameCount||1, fps=m?.fps||8;
        a.drawFrame(c,m?.name||"dash",((t*fps)|0)%fc,px,py);
      }

      // helper for title bobbing
      const bob=(s:string,y:number,sc:number,col:string,amp:number,spd:number)=>{
        const tw=s.length*6*sc - sc, x0=((w-tw)/2)|0, step=6*sc;
        for(let i=0;i<s.length;i++){
          const dy=S(t*spd + i)*amp, xx=x0+i*step, yy=(y+dy)|0;
          D(c,s[i],xx+1,yy+1,sc,"#000"); D(c,s[i],xx,yy,sc,col);
        }
      };

      // title
      bob("FLYKT",(h*0.22)|0,2,isMenu?"#7aa2ff":"#a9b8ff",2,5);

      // --- Fixed credits/results (no scrolling) ---
      if(!isMenu){
        const sec=(g.T/1e3|0), mm=(sec/60|0), ss=(sec%60|0);
        const lines=[
          "THANKS FOR PLAYING!",
          "DEATHS "+(g.D|0),
          "TIME "+mm+":"+(ss<10?"0":"")+ss,
        ];
        let y=(h*0.48)|0;
        for(const s of lines){
          const tw=s.length*6-1, x0=((w-tw)/2)|0;
          D(c,s,x0+1,y+1,1,"#000"); D(c,s,x0,y,1,"#e5e7eb");
          y+=18;
        }
      }

      // hint (pulsing)
      const text=isMenu?"CLICK / TAP TO START!":"CLICK / TAP TO RETURN";
      const sc=isMenu?2:1, hy=isMenu?(h*.74)|0:(h*.88)|0, tw=text.length*6*sc - sc, hx=((w-tw)/2)|0;
      c.globalAlpha=isMenu?.6+.4*S(t*4):.5+.5*S(t*3.2);
      D(c,text,hx+1,hy+1,sc,"#000"); D(c,text,hx,hy,sc,"#cbd5e1"); c.globalAlpha=1;
    }
  };
}

export const MenuScene = makeTitleScene("menu");
export const GameOverScene = makeTitleScene("go");

// --- Tiny console helper for testing ---
// (globalThis as any).gover = () => setScene(GameOverScene);
