// src/engine/scenes/effects/terrain/Terrain.ts
// Consolidated tiny terrain system: ridge layers + spawnable fractal backdrop layers.

export type Drawer = (ctx:CanvasRenderingContext2D,w:number,h:number,t:number,camX:number)=>void;

const {sin,min,max}=Math;

// Shared 1D ridge curve for silhouette bands
function ridge(x:number,s:number){
  return (
    sin(x*0.018+s)*0.6 +
    sin(x*0.034+s*1.7)*0.3 +
    sin(x*0.058+s*2.3)*0.15
  )*.5+.5;
}

// Shared tiny 2-octave fbm (used by fractal backdrop; good look / tiny cost)
function fbm(x:number,y:number,s:number){
  let a=0,b=1;
  for(let o=0;o<2;o++){
    a+=b*(sin(x*.02+s)+sin(y*.02+s*1.3)+sin((x+y)*.015+s*2.1))/3;
    b*=.5; x*=1.8; y*=1.8;
  }
  return a*.5+.5;
}

function createMountainLayer(
  seed:number,
  parallax:number,
  base:number,   // 0..1 screen height
  amp:number,    // px amplitude
  top:string,
  bot:string
):Drawer{
  return (c,w,h,_t,camX)=>{
    const off=camX*parallax, y0=h*base|0;
    c.beginPath(); c.moveTo(0,h);
    for(let x=0;x<=w;x+=2){
      const r=ridge(x+off,seed);
      const y=min(h-1, max(h*0.22, y0+(r-.5)*amp));
      c.lineTo(x,y);
    }
    c.lineTo(w,h); c.closePath();
    const g=c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,top); g.addColorStop(1,bot);
    c.fillStyle=g; c.fill();
    c.strokeStyle="rgba(255,255,255,0.05)";
    c.lineWidth=1; c.stroke();
  };
}

// === Spawnable fractal backdrop layer (static; hyper-real mountains) ===
// Simplified & Terser-friendly: light domain warp + ridged fbm with r^3 sharpen.
export function createFractalBackdropLayer(
  seed:number,
  parallax:number,
  base:number,   // 0..1 screen height anchor
  amp:number,    // upward displacement
  color:string,  // flat fill color (use gradient externally if desired)
  step=4         // pixel grid step (4 matches cloud look; lower = crisper)
):Drawer{
  // one-time salt so each construction is unique but deterministic during the session
  const s0 = seed + ((Math.random()*1e9)|0);

  return (c,w,h,_t,camX)=>{
    const y0=(h*base)|0, off=camX*parallax, S=s0*.7, sc=.9, half=h>>1;
    c.fillStyle=color;

    for(let px=0; px<w; px+=step){
      const wx=(px+off)*sc;
      for(let py=0; py<half; py+=step){
        const wy=py*sc;

        // domain warp (salted)
        const x=wx + fbm(wx*.5,     wy*.5,     s0)*60;
        const y=wy + fbm(wx*.5+100, wy*.5+100, s0)*40;

        // ridged transform with cheap peak sharpening (r^3), salted
        let r=1 - Math.abs(2*fbm(x,y,S)-1);
        r=r*r*r;

        if(r<.002) continue;

        const yi=(y0 + py - amp*r + .5)|0;
        c.fillRect(px, yi, step, step+.5); // +1 overdraw hides scanline seams
      }
    }
  };
}

// ---- Layer sets & helpers ----
const behindLayers:Drawer[]=[
  createMountainLayer(11,0.18,0.70,28,"#0b0e19","#0a0b13"),
  createMountainLayer(23,0.28,0.76,20,"#121624","#0e111c")
];

const frontLayers:Drawer[]=[
  (_c,_w,_h,_t,_x)=>{} // placeholder ground mist
];

export function addBehindLayer(d:Drawer){ behindLayers.unshift(d); } // farthest first
export function addFrontLayer(d:Drawer){ frontLayers.push(d); }

export function drawTerrainBehind(c:CanvasRenderingContext2D,w:number,h:number,t:number,camX:number){
  for(let i=0;i<behindLayers.length;i++) behindLayers[i](c,w,h,t,camX);
}
export function drawTerrainFront(c:CanvasRenderingContext2D,w:number,h:number,t:number,camX:number){
  for(let i=0;i<frontLayers.length;i++) frontLayers[i](c,w,h,t,camX);
}
