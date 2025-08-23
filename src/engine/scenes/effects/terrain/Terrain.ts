// src/engine/scenes/effects/terrain/Terrain.ts
// Tiny terrain: ridge bands + spawnable fractal backdrop.

export type Drawer=(c:CanvasRenderingContext2D,w:number,h:number,t:number,camX:number)=>void;

const {sin,abs,min,max,random}=Math;

// 1D ridge & 2-oct fbm
const ridge=(x:number,s:number)=>(
  sin(x*.018+s)*.6+sin(x*.034+s*1.7)*.3+sin(x*.058+s*2.3)*.15
)*.5+.5;

const fbm=(x:number,y:number,s:number)=>{
  let a=0,b=1;
  for(let o=2;o--;){ a+=b*(sin(x*.02+s)+sin(y*.02+s*1.3)+sin((x+y)*.015+s*2.1))/3; b*=.5; x*=1.8; y*=1.8; }
  return a*.5+.5;
};

function createMountainLayer(seed:number, par:number, base:number, amp:number, top:string, bot:string):Drawer{
  return (c,w,h,_t,camX)=>{
    const off=camX*par, y0=(h*base)|0;
    c.beginPath(); c.moveTo(0,h);
    for(let x=0;x<=w;x+=2){
      const r=ridge(x+off,seed);
      const y=min(h-1,max(h*.22,y0+(r-.5)*amp));
      c.lineTo(x,y);
    }
    c.lineTo(w,h); c.closePath();
    const g=c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,top); g.addColorStop(1,bot);
    c.fillStyle=g; c.fill();
    c.strokeStyle="rgba(255,255,255,.05)"; c.lineWidth=1; c.stroke();
  };
}

// Fractal backdrop: light domain-warped ridge fbm (r^3 sharpen)
export function createFractalBackdropLayer(
  seed:number, par:number, base:number, amp:number, color:string, step=4
):Drawer{
  const s0=seed+((random()*1e9)|0);
  return (c,w,h,_t,camX)=>{
    const y0=(h*base)|0, off=camX*par, S=s0*.7, sc=.9, half=h>>1;
    c.fillStyle=color;
    for(let px=0;px<w;px+=step){
      const wx=(px+off)*sc;
      for(let py=0;py<half;py+=step){
        const wy=py*sc;
        const x=wx+fbm(wx*.5,wy*.5,s0)*60;
        const y=wy+fbm(wx*.5+100,wy*.5+100,s0)*40;
        let r=1-abs(2*fbm(x,y,S)-1); r*=r*r;         // r^3
        if(r<.002) continue;
        c.fillRect(px, (y0+py-amp*r+.5)|0, step, step+.5); // +0.5 to hide seams
      }
    }
  };
}

// Layers
const behindLayers:Drawer[]=[
  createMountainLayer(11,.18,.70,28,"#0b0e19","#0a0b13"),
  createMountainLayer(23,.28,.76,20,"#121624","#0e111c"),
];
const frontLayers:Drawer[]=[ (_c,_w,_h,_t,_x)=>{} ]; // mist placeholder

export const addBehindLayer=(d:Drawer)=>behindLayers.unshift(d);
export const addFrontLayer =(d:Drawer)=>frontLayers.push(d);

export function drawTerrainBehind(c:CanvasRenderingContext2D,w:number,h:number,t:number,camX:number){
  for(const d of behindLayers) d(c,w,h,t,camX);
}
export function drawTerrainFront(c:CanvasRenderingContext2D,w:number,h:number,t:number,camX:number){
  for(const d of frontLayers) d(c,w,h,t,camX);
}
