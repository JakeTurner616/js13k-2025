// src/engine/scenes/effects/index.ts
import type { Draw } from "../u";
import { addB, S, Co, H, POS, gradR, col } from "../u";

// Stars
addB(((c,w,h,t,scroll)=>{
  c.fillStyle = col(0);
  const cutoff=h*.35;
  for(let i=0;i<60;i++){
    const x=(i*89+scroll*.15)%w;
    const yf=((i*97)%100/100)**2; const y=cutoff*yf;
    const tw=.5+.5*S(t/500+i*7);
    const sz=1+tw*.5*(.3+((i*73)%10)/10);
    c.globalAlpha=tw; c.fillRect(x,y,sz,sz);
  }
  c.globalAlpha=1;
}) as Draw);

// Moon
addB(((c,w,h,t,cx)=>{
  const mx=w*.18+S(t*.05)*10 - cx*.03, my=h*.22+S(t*.07)*6, r=POS(h*.12);

  let g = gradR(c, mx, my, r*2.2, [[0,17],[1,18]]);
  c.fillStyle=g; const hr=r*2.2; c.fillRect(mx-hr,my-hr,hr*2,hr*2);

  g = c.createRadialGradient(mx-r*.25,my-r*.25,POS(r*.2),mx,my,r);
  g.addColorStop(0, col(14)); g.addColorStop(.7, col(15)); g.addColorStop(1, col(16));
  c.fillStyle=g; c.beginPath(); c.arc(mx,my,r,0,7); c.fill();

  for(let i=0;i<18;i++){
    const a=H(i)*6.283, d=r*(.18+.68*H(i+1)), cx0=mx+Co(a)*d, cy0=my+S(a)*d;
    if((cx0-mx)**2+(cy0-my)**2>r*r*.83) continue;
    const cr=POS(r*(.02+.05*H(i+2))), k=.35+.65*H(i+3);
    c.fillStyle=col(19); c.beginPath(); c.arc(cx0,cy0,cr,0,7); c.fill();
    c.strokeStyle=col(20); c.lineWidth=POS(cr*.34); c.beginPath(); c.arc(cx0,cy0,POS(cr*k),0,7); c.stroke();
  }

  const ld=c.createRadialGradient(mx,my,0,mx,my,r);
  ld.addColorStop(0,"rgba(0,0,0,0)"); ld.addColorStop(1,"rgba(0,0,0,.22)");
  c.fillStyle=ld; c.beginPath(); c.arc(mx,my,r+.2,0,7); c.fill();
}) as Draw);

// Neon haze (unchanged)
addB(((c,w,h,t,cx)=>{
  const COL=["255,80,180","160,60,255"];
  for(let i=0;i<6;i++){
    const bx=((i*300+cx*.5)%(w+200))-100;
    const by=h*.55 + S(t*.3+i)*20;
    const R = 150 + S(t*.7+i)*40;
    const a = .4 + .3*S(t*.5+i*2);
    const g = c.createRadialGradient(bx,by,0,bx,by,POS(R));
    g.addColorStop(0,`rgba(${COL[i&1]},${a})`);
    g.addColorStop(1,"rgba(0,0,0,0)");
    c.fillStyle=g; c.fillRect(bx-R,by-R,R*2,R*2);
  }
}) as Draw);
