// src/player/Player.ts
// Fixed: use performance.now() (same timebase as `t` in draw) so death anim advances.

import { applyPhysics } from "./Physics";
import { AN,A,ST,G,cos,sin,badAim,face,pre as preFSM,post as postFSM,setAnim } from "./Core";
import { zzfx } from "../engine/audio/SoundEngine";

// sfx (keep any to dodge types)
const BAD:any=[7,,15,.1,.01,.04,,.45,,,,,,,,,,.91,.01,,332];

type Animator={
  getMeta(n:string):{fps?:number;frameCount?:number}|undefined;
  drawFrame(c:CanvasRenderingContext2D,n:string,f:number,x:number,y:number):void;
};
type State=0|1|2;
export type PlayerHooks={onDeath?:(r:string)=>void; onRespawn?:()=>void};
export type Player=ReturnType<typeof createPlayer>;

export function createPlayer(a:Animator,hooks:PlayerHooks={}){
  const b:any={pos:{x:32,y:32},vel:{x:0,y:0},width:32,height:32,hit:{x:9,y:8,w:14,h:20},grounded:false};
  const HB=b.hit?{x:b.hit.x|0,y:b.hit.y|0,w:b.hit.w|0,h:b.hit.h|0}:{x:0,y:0,w:b.width|0,h:b.height|0};
  const L={top:0,bottom:1e9,right:1e9,on:false};

  const p={
    body:b,_st:ST.G as State,_anim:0,_face:1 as 1|-1,
    _wasJ:false,_aim:false,_side:1 as 1|-1,_ang:Math.PI*.6,
    _pow:3.5,_min:2,_max:8,_charge:.14,_angStep:.0349, // ~2° rad
    _bad:false,_det:0,_noCling:0,_portT:0,_touchPort:false,
    _dead:false,_deathT:0,_respawn:84,_spawn:{x:64,y:24},
    _t0:performance.now(),
    setAnimation:()=>{p._t0=performance.now()}
  };

  const setTouchingPortal=(v:boolean,f=2)=>p._portT=v?Math.max(f|0,1):0;
  const setSpawn=(x:number,y:number)=>{p._spawn.x=x|0;p._spawn.y=y|0};
  function setLevelBounds(wTiles:number,hTiles:number,canvasH:number,tile=16){
    const top=canvasH-hTiles*tile; L.top=top|0; L.bottom=(top+hTiles*tile)|0; L.right=(wTiles*tile)|0; L.on=true;
  }

  const respawn=()=>{
    b.vel.x=b.vel.y=0; b.gravity=undefined; b.collide=true;
    b.grounded=b.cling=b._touchL=b._touchR=false;
    p._touchPort=false; p._portT=0; p._det=p._noCling=0;
    p._aim=false; p._dead=false; setAnim(p,A.idle); p._st=ST.G as State;
    hooks.onRespawn?.();
  };

  const die=(reason:string)=>{
    if(p._dead) return;
    p._dead=true; p._deathT=p._respawn|0;
    b.pos.x=p._spawn.x; b.pos.y=p._spawn.y;
    setAnim(p,A.death);
    b.vel.x=b.vel.y=0; b.gravity=0; b.collide=false;
    b.grounded=b.cling=b._touchL=b._touchR=false;
    hooks.onDeath?.(reason);
  };

  function update(i:Partial<{left:boolean;right:boolean;jump:boolean}>,ctx:CanvasRenderingContext2D){
    const LFT=!!i.left,RGT=!!i.right,J=!!i.jump,rel=!J&&p._wasJ;

    p._portT>0 && p._portT--;
    p._touchPort=p._portT>0;
    p._touchPort ? (b.collide=false,b.cling=false,b.grounded=false) : !p._dead && (b.collide=true);

    if(p._dead){ p._deathT>0 ? p._deathT-- : respawn(); p._wasJ=J; return; }

    const anchoredPre=b.grounded||p._st===ST.C;
    if(p._aim&&anchoredPre&&rel){
      const vx=cos(p._ang)*p._pow, vy=-sin(p._ang)*p._pow, onWall=!!(b._touchL||b._touchR)||p._st===ST.C;
      if(badAim(vx,vy,p._side,onWall)){ zzfx?.(...BAD); p._bad=true; p._wasJ=false; }
    }

    preFSM(p,{left:LFT,right:RGT,jump:J},!!(b._touchL||b._touchR));
    applyPhysics(b,ctx);

    const anchored=b.grounded||p._st===ST.C;
    if(p._aim&&anchored){
      const vx=cos(p._ang)*p._pow, vy=-sin(p._ang)*p._pow;
      p._bad=badAim(vx,vy,p._side,(p._st===ST.C)||!!(b._touchL||b._touchR));
    } else p._bad=false;

    postFSM(p);

    if(L.on){
      const lx=(b.pos.x+HB.x)|0, rx=lx+(HB.w|0), ty=(b.pos.y+HB.y)|0, by=ty+(HB.h|0);
      (rx<0||lx>L.right||by>L.bottom||ty<L.top) && die("out_of_bounds");
    }

    p._face=face(p._face>=0?1:-1, p._st===ST.C, anchored, p._aim, p._side, p._ang, b.vel.x, LFT, RGT) as 1|-1;
    p._wasJ=J;
  }

  function draw(ctx:CanvasRenderingContext2D,t:number){
    const n=AN[p._anim], m=a.getMeta(n), fps=m?.fps??6, fc=m?.frameCount??1;
    const f=((Math.max(0,(t-p._t0)*1e-3)*fps)|0)%fc, flip=p._face<0, dx=flip?-b.pos.x+b.width*-1:b.pos.x;
    ctx.save(); if(flip) ctx.scale(-1,1); a.drawFrame(ctx,n,f,dx,b.pos.y); ctx.restore();

    if(!p._dead&&p._aim&&(b.grounded||p._st===ST.C)){
      const px=b.pos.x+b.width*.5, py=b.pos.y+b.height*.5, vx=cos(p._ang)*p._pow, vy=-sin(p._ang)*p._pow;
      ctx.save(); ctx.globalAlpha=.92; ctx.fillStyle=p._bad?"#f55":"#fff";
      for(let k=27;k--;){ const x=px+vx*k, y=py+vy*k+.5*G*k*k; ctx.fillRect(x|0,y|0,1,1); }
      ctx.restore();
    }
  }

  function onTeleported(_:"R"|"L"|"U"|"D"){
    if(p._dead) return;
    b.grounded=b._touchL=b._touchR=false; b.cling=false; b.gravity=undefined;
    p._aim=false; p._det=4; p._noCling=8; setTouchingPortal(true,3); p._st=ST.F as State;
  }

  return {body:b,update,draw,onTeleported,setTouchingPortal,setSpawn,setLevelBounds,respawn};
}
