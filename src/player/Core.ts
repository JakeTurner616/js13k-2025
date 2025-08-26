// src/player/Core.ts
export const G=.14,T=16; export const {cos,sin,abs,PI}=Math;

export const AN=["idle","dash","jump","fall","death"] as const;
export const A={idle:0,dash:1,jump:2,fall:3,death:4} as const;
export const ST={G:0,F:1} as const;

type CoreInput={left:boolean;right:boolean;up?:boolean;down?:boolean;jump:boolean};
const clamp=(n:number,a:number,b:number)=>n<a?a:n>b?b:n;

// "bad aim" check: too-flat/weak arcs get flagged
export const badAim=(vx:number,vy:number)=> vy*vy<8*G && abs(vx*vy)<6*G;

// Facing helper: aim direction when anchored + aiming; else based on input/vel
export const face=(prev:1|-1,anch:boolean,aiming:boolean,ang:number,vx:number,L:boolean,R:boolean):1|-1 =>
  (aiming&&anch)?(cos(ang)>=0?1:-1):
  (L!==R&&anch)?(R?1:-1):
  (vx*vx>.0025?(vx>=0?1:-1):prev);

export const setAnim=(p:any,n:number)=>{ p._anim!==n && (p._anim=n, p.setAnimation?.(AN[n] as any)); };

export const enter=(p:any,n:number,useAim?:boolean)=>{
  const b=p.body; p._st=n; p._aim=false;
  if(n===ST.G){
    b.gravity=undefined;
    setAnim(p,abs(b.vel.x)>.05?A.dash:A.idle); return;
  }
  // ST.F (air / dash)
  b.grounded=false; b.gravity=undefined;
  if(useAim){
    const a=p._ang,v=p._pow*.85; b.vel.x=cos(a)*v; b.vel.y=-sin(a)*v;
    setAnim(p,A.dash); p._pow=p._min;
  }else setAnim(p,b.vel.y>0?A.fall:A.jump);
};

export const aim=(p:any,i:CoreInput)=>{
  const b=p.body; p._aim=true; setAnim(p,A.idle);
  b.vel.x=b.vel.y=0;

  const s=p._angStep,ch=p._charge;
  p._ang=clamp(p._ang+(i.left?+s:0)-(i.right?+s:0),.05,PI-.05);

  let d=ch; if(i.up) d+=ch; if(i.down) d-=ch*2;
  p._pow=clamp(p._pow+d,p._min,p._max);
};

export const pre=(p:any,i:CoreInput)=>{
  const b=p.body;
  if(p._st===ST.G){
    (i.jump && (aim(p,i),1)) ||
    (!i.jump && p._wasJ && p._aim && (enter(p,ST.F,true),1)) ||
    setAnim(p,abs(b.vel.x)>.05?A.dash:A.idle);
  }
};

export const post=(p:any)=>{
  const b=p.body;
  if(p._st===ST.F){
    (b.vel.y>0 && p._anim!==A.fall) && setAnim(p,A.fall);
    (b.grounded && (enter(p,ST.G),1));
    return;
  }
  // ST.G
  !b.grounded ? enter(p,ST.F,false)
              : (p._anim!==A.idle && abs(b.vel.x)<=.05 && setAnim(p,A.idle));
};
