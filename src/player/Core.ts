// src/player/Core.ts
// Tiny math + FSM + anim names (strings only live here)
export const G=.14, T=16;
export const {cos,sin,abs,PI}=Math;

export const AN=["idle","dash","jump","fall","ledge","death"] as const;
export const A={idle:0,dash:1,jump:2,fall:3,ledge:4,death:5} as const;

// weak/blocked projectile aim
export const badAim=(vx:number,vy:number,side:number,onWall:boolean)=>{
  const weak=vy*vy<8*G && abs(vx*vy)<6*G;
  return weak || (onWall && vx*side>=0);
};

// facing resolver
export const face=(prev:1|-1,isCling:boolean,anchored:boolean,aiming:boolean,clingSide:number,angle:number,vx:number,L:boolean,R:boolean):1|-1 =>
  isCling?(clingSide>=0?1:-1):
  aiming&&anchored?(cos(angle)>=0?1:-1):
  L!==R&&anchored?(R?1:-1):
  (vx*vx>.0025?(vx>=0?1:-1):prev);

// states
export const ST={G:0,F:1,C:2} as const;

type CoreInput={left:boolean;right:boolean;jump:boolean};
const clamp=(n:number,a:number,b:number)=>n<a?a:n>b?b:n;

// Guarded anim setter: index → name via AN
export const setAnim=(p:any,n:number)=>{ if(p._anim!==n){ p._anim=n; p.setAnimation?.(AN[n] as any); } };

// enter state
export const enter=(p:any,n:number,useAim?:boolean)=>{
  const b=p.body; p._st=n; p._aim=false;

  if(n===ST.G){
    p._det=0; b.gravity=undefined; b.cling=false;
    const dash=Math.abs(b.vel.x)>.05;
    setAnim(p,dash?A.dash:A.idle); return;
  }
  if(n===ST.C){
    p._det=0; b.grounded=false; b.gravity=0; b.cling=true; b.vel.x=b.vel.y=0;
    setAnim(p,A.ledge); p._side=b._touchR?+1:b._touchL?-1:(p._side||+1); return;
  }
  // ST.F
  p._det=useAim?2:0; b.grounded=false; b.gravity=undefined; b.cling=false;
  if(useAim){ const a=p._ang,v=p._pow; b.vel.x=cos(a)*v; b.vel.y=-sin(a)*v; setAnim(p,A.dash); p._pow=p._min; }
  else setAnim(p,b.vel.y>0?A.fall:A.jump);
};

// hold jump to aim
export const aim=(p:any,i:CoreInput,onWall:boolean)=>{
  const b=p.body, can=!p._noCling && !p._touchPort && (onWall || p._st===ST.C);
  p._aim=true; setAnim(p,can?A.ledge:A.idle);
  if(can){ b.gravity=0; b.vel.x=p._side*.6; b.vel.y=0; } else b.vel.x=b.vel.y=0;
  p._ang=clamp(p._ang+(i.left?+p._angStep:0)-(i.right?+p._angStep:0), .05, PI-.05);
  p._pow=clamp(p._pow+p._charge, p._min, p._max);
};

// pre-physics
export const pre=(p:any,i:CoreInput,onWall:boolean)=>{
  const b=p.body,m=Math.abs;
  if(p._st===ST.G){
    (i.jump && (aim(p,i,onWall),1)) || (!i.jump && p._wasJ && p._aim && (enter(p,ST.F,true),1)) ||
    (m(b.vel.x)>.05?setAnim(p,A.dash):setAnim(p,A.idle)); return;
  }
  if(p._st===ST.C){
    b.vel.x=p._side*.6; b.vel.y=0; b.gravity=0;
    (i.jump && (aim(p,i,true),1)) || (!i.jump && p._wasJ && p._aim && (enter(p,ST.F,true),1)) ||
    (p._aim=false,setAnim(p,A.ledge),1);
  }
};

// post-physics
export const post=(p:any)=>{
  const b=p.body,onWall=!!(b._touchL||b._touchR);
  if(p._noCling>0) p._noCling--; if(p._det>0) p._det--;
  if(p._st===ST.F){
    (b.vel.y>0 && p._anim!==A.fall) && setAnim(p,A.fall);
    (b.grounded && (enter(p,ST.G),1)) || (onWall && !p._det && !p._noCling && !p._touchPort && (b._hitWall|0)!==0 && (enter(p,ST.C),1));
    return;
  }
  if(p._st===ST.G){ !b.grounded ? enter(p,ST.F,false) : (p._anim!==A.idle && Math.abs(b.vel.x)<=.05 && setAnim(p,A.idle)); return; }
  if(!onWall && !p._aim) enter(p,ST.F,false);
};
