// src/player/Player.ts
import { applyPhysics, type PhysicsBody } from "./Physics";
import type { AtlasAnimator } from "../animation/AtlasAnimator";
import type { InputState } from "./states/types";
import { cos, sin } from "./core/math";
import { AN } from "./core/anim";
import { ST, preUpdate, postUpdate } from "./core/state";
import { isBadAim, drawAimDots } from "./core/aim";
import { resolveFacing } from "./core/facing";
import { zzfx } from "../engine/audio/SoundEngine";

const DBG = true;
const log = (...a:any[]) => DBG && console.log("[player]", ...a);
const BAD_AIM_SFX: Parameters<typeof zzfx> = [7,,15,.1,.01,.04,,.45,,,,,,,,,,.91,.01,,332] as any;

type State = 0|1|2;
export type Player = ReturnType<typeof createPlayer>;

export function createPlayer(a:AtlasAnimator){
  const b:PhysicsBody={pos:{x:32,y:32},vel:{x:0,y:0},width:32,height:32,hit:{x:9,y:8,w:14,h:20},grounded:false};
  const p={body:b,st:ST.G as State,anim:0,facing:1,wasJump:false,aiming:false,clingSide:1,aimAngle:Math.PI*0.6,
    aimPower:3.5,minPower:2,maxPower:8,chargeRate:0.14,angleStep:2*Math.PI/180,bad:false,detach:0,noCling:0,
    portalContact:0,touchPortal:false,setAnimation:undefined};

  function setTouchingPortal(v:boolean,f=2){p.portalContact=v?Math.max(f|0,1):0;}

  function update(i:Partial<InputState>,ctx:CanvasRenderingContext2D){
    const inpt:InputState={left:!!i.left,right:!!i.right,jump:!!i.jump},rel=!inpt.jump&&p.wasJump;
    if(p.portalContact>0)p.portalContact--;p.touchPortal=p.portalContact>0;

    if(p.aiming&&(b.grounded||p.st===ST.C)&&rel){
      const vx=cos(p.aimAngle)*p.aimPower,vy=-sin(p.aimAngle)*p.aimPower;
      const onWall=!!(b.touchL||b.touchR)||p.st===ST.C;
      if(isBadAim(vx,vy,p.clingSide,onWall)){
        try{zzfx(...BAD_AIM_SFX);}catch{}
        p.bad=true;p.wasJump=false;log("RED-ARC RELEASE vetoed (no queue)");
      }
    }

    preUpdate(p,inpt,!!(b.touchL||b.touchR));
    applyPhysics(b,ctx);

    const anc=b.grounded||p.st===ST.C;
    if(p.aiming&&anc){
      const vx=cos(p.aimAngle)*p.aimPower,vy=-sin(p.aimAngle)*p.aimPower;
      const onWall=!!(b.touchL||b.touchR);
      p.bad=isBadAim(vx,vy,p.clingSide,(p.st===ST.C)||onWall);
    }else p.bad=false;

    postUpdate(p);
    p.facing=resolveFacing((p.facing >= 0 ? 1 : -1) as 1 | -1, p.st===ST.C, anc, p.aiming, p.clingSide, p.aimAngle, b.vel.x, inpt.left, inpt.right);
    p.wasJump=inpt.jump;
  }

  function draw(ctx:CanvasRenderingContext2D,t:number){
    const n=AN[p.anim],m=a.getMeta(n),f=((t*.001)*((m?.fps)||6)|0)%((m?.frameCount)||1);
    const fl=p.facing<0;ctx.save();if(fl)ctx.scale(-1,1);
    a.drawFrame(ctx,n,f,fl?-b.pos.x-b.width:b.pos.x,b.pos.y);ctx.restore();

    const anc=b.grounded||p.st===ST.C;
    if(p.aiming&&anc){
      const px=b.pos.x+b.width*.5,py=b.pos.y+b.height*.5;
      const vx=cos(p.aimAngle)*p.aimPower,vy=-sin(p.aimAngle)*p.aimPower;
      const onWall=!!(b.touchL||b.touchR);
      drawAimDots(ctx,px,py,vx,vy,p.bad||isBadAim(vx,vy,p.clingSide,(p.st===ST.C)||onWall));
    }
  }

  function onTeleported(_:"R"|"L"|"U"|"D"){
    b.grounded=b.touchL=b.touchR=b.cling=false;b.gravity=undefined;p.aiming=false;
    p.detach=4;p.noCling=8;setTouchingPortal(true,3);p.st=ST.F as State;
  }

  return{body:b,update,draw,onTeleported,setTouchingPortal};
}