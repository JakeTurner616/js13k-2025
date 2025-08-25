// src/engine/scenes/effects/index.ts
import type { Draw } from "../u";
import { addB, S, Co, H, POS, col } from "../u";

// Stars (static)
addB(((c,w,h,_t,s)=>{
  const cut=h*.35; c.fillStyle=col(0); c.globalAlpha=.65;
  for(let i=60;i--;){
    const x=((i*89+s*.15)%w+w)%w;
    const y=cut*((i*97%100)/100)**2;
    const sz=1+(i*73%10)/20;
    c.fillRect(x,y,sz,sz);
  }
  c.globalAlpha=1;
}) as Draw);

// Moon (static)
addB(((c,w,h,_t,cx)=>{
  const mx=w*.18-cx*.03,my=h*.22,r=POS(h*.12);
  let g=c.createRadialGradient(mx-r*.25,my-r*.25,POS(r*.2),mx,my,r);
  g.addColorStop(0,col(12)); g.addColorStop(.7,col(13)); g.addColorStop(1,col(14));
  c.fillStyle=g; c.beginPath(); c.arc(mx,my,r,0,7); c.fill();

  // craters
  for(let i=12;i--;){
    const a=H(i)*6.283,d=r*(.18+.68*H(i+1)), x=mx+Co(a)*d, y=my+S(a)*d;
    if((x-mx)**2+(y-my)**2>r*r*.83) continue;
    const cr=POS(r*(.02+.05*H(i+2))), k=.35+.65*H(i+3);
    c.fillStyle="rgba(40,45,60,.26)"; c.beginPath(); c.arc(x,y,cr,0,7); c.fill();
    c.strokeStyle="rgba(230,235,255,.10)"; c.lineWidth=POS(cr*.34);
    c.beginPath(); c.arc(x,y,POS(cr*k),0,7); c.stroke();
  }
}) as Draw);
