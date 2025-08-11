// src/engine/scenes/effects/Clouds.ts
// Parallax clouds with stable “island” breakup (no popping): cell mask + fBm cover.

export function drawClouds(ctx:CanvasRenderingContext2D,w:number,h:number,t:number,scroll:number){
  // tiny fBm 0..1
  const N=(x:number,y:number,s:number)=>{let a=0,b=1,fx=x,fy=y;
    for(let o=0;o<3;o++){a+=b*(Math.sin(fx*.035+s)+Math.sin(fy*.027+s*1.7)+Math.sin((fx+fy)*.019+s*2.3))/3;b*=.5;fx*=1.9;fy*=1.9;}
    return a*.5+.5;
  };
  const R=(x:number,s:number)=>(Math.sin(x*.02+s)*.6+Math.sin(x*.037+s*1.7)*.3+Math.sin(x*.061+s*2.3)*.15)*.5+.5;
  const H=(n:number)=>{const f=Math.sin(n*12.9898)*43758.5453; return f-Math.floor(f);} // 1D hash 0..1

  const GS=3, PAL=["#ffffff","#d6e8f5","#a7c7de","#7da8c5"];

  function layer(seed:number,par:number,base:number,amp:number,thick:number,alph:number){
    const off=scroll*par, y0=h*base, s=seed+t*.06, L=64/par; // cell width scales with distance
    for(let x=-L;x<w+L;x+=GS){
      // world-space cell index & local coord → stable islands that slide with scroll
      const u=(x+off)/L, ci=Math.floor(u), fx=u-ci;              // 0..1 within cell
      const r1=H(ci+seed*17), r2=H(ci*31+seed*7);                // per-cell randomness
      if(r1<.35) continue;                                       // empty cell (gap)
      const width=.35+.55*r2, edge=1-Math.abs(fx-.5)/(.5*width); // triangular “blob”
      if(edge<=0) continue;
      const edgeSoft=Math.min(1,Math.max(0,edge));               // soft mask 0..1

      const crest=y0+(R((x+off)*.9,s)-.5)*amp;                   // vertical track
      const T=thick*(.7+.5*N(ci*.2,crest*.15,s));                // thickness per cell

      for(let y=Math.max(0,Math.floor(crest-T)); y<crest+T; y+=GS){
        const v=y-crest, body=Math.max(0,1-Math.abs(v)/T);       // vertical falloff
        // cover field (adds curls/holes) + slight domain wobble
        const wob=N(x*.6+ci*3,y*.5,s)*50;
        const cover=N(x+wob, v*1.25 + N(ci,crest,s)*22, s);
        // combine with island mask; soft bias to reduce banding
        const dens=cover*body*edgeSoft - .15 + N(x*.7,y*.5,s*.7)*.05;
        if(dens>0){
          const shade=dens + (crest-y)*0.002 - N(x+140,y-30,s)*.05;
          const idx=shade>.32?0:shade>.22?1:shade>.12?2:3;
          ctx.globalAlpha=alph; ctx.fillStyle=PAL[idx];
          ctx.fillRect(x,y,GS,GS);
        }
      }
    }
    ctx.globalAlpha=1;
  }

  // far → near (slower → faster)
  layer(5,  .25, .18, 16, 22, .22);
  layer(9,  .55, .26, 14, 20, .24);
  layer(13, .95, .34, 12, 18, .26);
}
