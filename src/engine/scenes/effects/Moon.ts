// src/engine/scenes/effects/Moon.ts
// Clean look: halo + lit disc + simple craters + limb darkening (no crescent/phase)
export function drawMoon(ctx:CanvasRenderingContext2D,w:number,h:number,t:number,camX:number){
  const S=Math.sin,C=Math.cos,F=(n:number)=>{const x=Math.sin(n*12.9898)*43758.5453;return x-Math.floor(x)};
  const mx=w*.18+S(t*.05)*10-camX*.03, my=h*.22+S(t*.07)*6, r=h*.12;

  // halo
  let g=ctx.createRadialGradient(mx,my,0,mx,my,r*2.2);
  g.addColorStop(0,"rgba(210,225,255,.14)"); g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=g; ctx.fillRect(mx-r*2.2,my-r*2.2,r*4.4,r*4.4);

  // disc (subtle top-left light)
  g=ctx.createRadialGradient(mx-r*.25,my-r*.25,r*.2,mx,my,r);
  g.addColorStop(0,"#eef1fb"); g.addColorStop(.7,"#d9dcec"); g.addColorStop(1,"#b7bed2");
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(mx,my,r,0,7); ctx.fill();

  // ringed craters
  for(let i=0;i<18;i++){
    const a=F(i)*6.283,d=r*(.18+.68*F(i+1)),cx=mx+C(a)*d,cy=my+S(a)*d; if((cx-mx)**2+(cy-my)**2>r*r*.83)continue;
    const cr=r*(.02+.05*F(i+2)),k=.35+.65*F(i+3);
    ctx.fillStyle="rgba(40,45,60,.26)"; ctx.beginPath(); ctx.arc(cx,cy,cr,0,7); ctx.fill();
    ctx.strokeStyle="rgba(230,235,255,.10)"; ctx.lineWidth=cr*.34; ctx.beginPath(); ctx.arc(cx,cy,cr*k,0,7); ctx.stroke();
  }

  // limb darkening (static, non-glitchy)
  const ld=ctx.createRadialGradient(mx,my,0,mx,my,r);
  ld.addColorStop(0,"rgba(0,0,0,0)"); ld.addColorStop(1,"rgba(0,0,0,.22)");
  ctx.fillStyle=ld; ctx.beginPath(); ctx.arc(mx,my,r+0.2,0,7); ctx.fill();
}
