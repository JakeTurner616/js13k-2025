// src/engine/camera/Camera.ts
const {max,min,pow,round}=Math;
export type Cam={x:number,y:number};

export function updateSmoothCamera(
  cam:Cam, tx:number, ty:number,  // target
  sw:number, sh:number,           // screen
  ww:number, wh:number,           // world
  sx=0.14, dt=1/60, upBias=true,
  tile=16                         // 👈 pass in tile size for clamp adjust
){
  const hw=sw*.5, hh=sh*.5;

  // --- X: EMA (time-consistent) ---
  const kx=1-pow(1-sx,dt*60);
  let cx=cam.x+(tx-cam.x)*kx;

  // --- Y target via safe band + smoothstep ---
  const TOP=56, BOT=sh*.62;
  const sy=(hh-cam.y)+ty;
  let a=(sy-TOP)/(BOT-TOP); if(a<0)a=0; else if(a>1)a=1;
  const s=a*a*(3-2*a);
  const wantTop=ty-(hh-TOP), wantBot=ty-(hh-BOT);
  const tyc=wantTop*(1-s)+wantBot*s;

  // --- Critically-damped spring (up faster than down) ---
  let vy=(cam as any)._v||0;
  const up=cam.y>tyc, w=up?(upBias?6:4.5):(upBias?3.2:4.5);
  let cy=cam.y;
  if(w){
    const err=cy-tyc, acc=-2*w*vy-(w*w)*err;
    vy+=acc*dt;
    if(vy>900)vy=900; else if(vy<-900)vy=-900;
    cy+=vy*dt;
  }

  // --- Pixel snap ---
  cx=round(cx); cy=round(cy); vy=round(vy*10)/10;

  // --- Clamps (with vertical overscan so short maps still scroll) ---
  const smallW=ww<=sw, smallH=wh<=sh;
  const xmin=smallW?ww*.5:hw, xmax=smallW?ww*.5:ww-hw;
  // 👇 raise min cap by one tile
  const ymin=smallH?wh*.5:hh-sh+tile;
  const ymax=smallH?wh*.5:wh-hh+sh;

  cam.x=max(xmin,min(xmax,cx));
  cam.y=max(ymin,min(ymax,cy));
  (cam as any)._v=vy;
}

export function applyCameraTransform(c:CanvasRenderingContext2D, cam:Cam, sw:number, sh:number){
  c.setTransform(1,0,0,1,0,0);
  c.translate(round(sw*.5-cam.x), round(sh*.5-cam.y));
}

export const getSnappedCameraPosition=(cam:Cam)=>({x:round(cam.x),y:round(cam.y)});
