// src/player/Player.ts
// cached bounds/hitbox, no map reads in update(), tiny OOB check

import { applyPhysics, type PhysicsBody } from "./Physics";
import type { AtlasAnimator } from "../animation/AtlasAnimator";
import type { InputState } from "./states/types";
import { cos, sin } from "./core/math";
import { AN, A } from "./core/anim";
import { ST, preUpdate, postUpdate } from "./core/state";
import { isBadAim, drawAimDots } from "./core/aim";
import { resolveFacing } from "./core/facing";
import { zzfx } from "../engine/audio/SoundEngine";

type State=0|1|2;
export type PlayerHooks={ onDeath?:(r:string)=>void; onRespawn?:()=>void; };
export type Player=ReturnType<typeof createPlayer>;
const BAD:Parameters<typeof zzfx>=[7,,15,.1,.01,.04,,.45,,,,,,,,,,.91,.01,,332] as any;

export function createPlayer(a:AtlasAnimator, hooks:PlayerHooks={}){
  const b:PhysicsBody={pos:{x:32,y:32},vel:{x:0,y:0},width:32,height:32,hit:{x:9,y:8,w:14,h:20},grounded:false};
  const HB=b.hit?{x:b.hit.x|0,y:b.hit.y|0,w:b.hit.w|0,h:b.hit.h|0}:{x:0,y:0,w:b.width|0,h:b.height|0};
  const L={top:0,bottom:1e9,right:1e9,on:false};

  const p={
    body:b, st:ST.G as State, anim:0, facing:1 as 1|-1,
    wasJump:false, aiming:false, clingSide:1 as 1|-1, aimAngle:Math.PI*.6,
    aimPower:3.5, minPower:2, maxPower:8, chargeRate:.14, angleStep:2*Math.PI/180,
    bad:false, detach:0, noCling:0, portalContact:0, touchPortal:false,
    dead:false, deathT:0, respawnDelayFrames:84, spawn:{x:64,y:24},
    animT0:performance.now(),
    setAnimation:(_:string)=>{ p.animT0=performance.now(); }
  };

  const setTouchingPortal=(v:boolean,f=2)=>{ p.portalContact=v?Math.max(f|0,1):0; };
  const setSpawn=(x:number,y:number)=>{ p.spawn.x=x|0; p.spawn.y=y|0; };

  function setLevelBounds(wTiles:number,hTiles:number,canvasH:number,tile=16){
    const top=canvasH-hTiles*tile; L.top=top|0; L.bottom=(top+hTiles*tile)|0; L.right=(wTiles*tile)|0; L.on=true;
  }

  function respawn(){
    b.vel.x=b.vel.y=0; b.gravity=undefined; b.collide=true;
    b.grounded=b.cling=b.touchL=b.touchR=false;
    p.touchPortal=false; p.portalContact=0; p.detach=p.noCling=0;
    p.aiming=false; p.dead=false; p.anim=A.idle; p.setAnimation?.("idle"); p.st=ST.G as State;
    hooks.onRespawn?.();
  }

  function die(reason:string){
    if(p.dead) return;
    p.dead=true; p.deathT=p.respawnDelayFrames|0;
    b.pos.x=p.spawn.x; b.pos.y=p.spawn.y;
    p.anim=A.death; p.setAnimation?.("death");
    b.vel.x=b.vel.y=0; b.gravity=0; b.collide=false;
    b.grounded=b.cling=b.touchL=b.touchR=false;
    hooks.onDeath?.(reason);
  }

  function update(i:Partial<InputState>, ctx:CanvasRenderingContext2D){
    const LFT=!!i.left, RGT=!!i.right, J=!!i.jump, rel=(!J&&p.wasJump);

    if(p.portalContact>0) p.portalContact--;
    p.touchPortal=p.portalContact>0;
    if(p.touchPortal){ b.collide=false; b.cling=false; b.grounded=false; }
    else if(!p.dead){ b.collide=true; }

    if(p.dead){ if(p.deathT>0) p.deathT--; else respawn(); p.wasJump=J; return; }

    const anchoredPre=b.grounded||p.st===ST.C;
    if(p.aiming&&anchoredPre&&rel){
      const vx=cos(p.aimAngle)*p.aimPower, vy=-sin(p.aimAngle)*p.aimPower, onWall=!!(b.touchL||b.touchR)||p.st===ST.C;
      if(isBadAim(vx,vy,p.clingSide,onWall)){ try{ zzfx(...BAD); }catch{} p.bad=true; p.wasJump=false; }
    }

    preUpdate(p,{left:LFT,right:RGT,jump:J},!!(b.touchL||b.touchR));
    applyPhysics(b,ctx);

    const anchored=b.grounded||p.st===ST.C;
    if(p.aiming&&anchored){
      const vx=cos(p.aimAngle)*p.aimPower, vy=-sin(p.aimAngle)*p.aimPower;
      p.bad=isBadAim(vx,vy,p.clingSide,(p.st===ST.C)||!!(b.touchL||b.touchR));
    } else p.bad=false;

    postUpdate(p);

    if(L.on){
      const lx=(b.pos.x+HB.x)|0, rx=lx+(HB.w|0), ty=(b.pos.y+HB.y)|0, by=ty+(HB.h|0);
      if(rx<0||lx>L.right||by>L.bottom||ty<L.top) die("out_of_bounds");
    }

    p.facing=resolveFacing(p.facing>=0?1:-1, p.st===ST.C, anchored, p.aiming, p.clingSide, p.aimAngle, b.vel.x, LFT, RGT) as 1|-1;
    p.wasJump=J;
  }

  function draw(ctx:CanvasRenderingContext2D,t:number){
    const n=AN[p.anim], m=a.getMeta(n), fps=m?.fps??6, fc=m?.frameCount??1;
    const f=((Math.max(0,(t-p.animT0)*1e-3)*fps)|0)%fc;
    const flip=p.facing<0, dx=flip?-b.pos.x+b.width*-1:b.pos.x;
    ctx.save(); if(flip) ctx.scale(-1,1); a.drawFrame(ctx,n,f,dx,b.pos.y); ctx.restore();

    if(!p.dead&&p.aiming&&(b.grounded||p.st===ST.C)){
      const px=b.pos.x+b.width*.5, py=b.pos.y+b.height*.5;
      const vx=cos(p.aimAngle)*p.aimPower, vy=-sin(p.aimAngle)*p.aimPower;
      drawAimDots(ctx,px,py,vx,vy, p.bad||isBadAim(vx,vy,p.clingSide,(p.st===ST.C)||!!(b.touchL||b.touchR)));
    }
  }

  function onTeleported(_:"R"|"L"|"U"|"D"){
    if(p.dead) return;
    b.grounded=b.touchL=b.touchR=false; b.cling=false; b.gravity=undefined;
    p.aiming=false; p.detach=4; p.noCling=8; setTouchingPortal(true,3); p.st=ST.F as State;
  }

  return { body:b, update, draw, onTeleported, setTouchingPortal, setSpawn, setLevelBounds, respawn };
}
