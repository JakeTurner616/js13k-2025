// src/engine/camera/Camera.ts
const {max,min,pow,round}=Math;
export type Cam={x:number,y:number};

export function updateSmoothCamera(
  cam:Cam, tx:number, ty:number,  // target
  sw:number, sh:number,           // screen
  ww:number, wh:number,           // world
  sx=0.14, dt=1/60, upBias=true
){
  const hw=sw*.5, hh=sh*.5;

  // X: time-consistent EMA
  const kx=1-pow(1-sx,dt*60);
  let cx=cam.x+(tx-cam.x)*kx;

  // Y target via safe band → smoothstep blend
  const top=56, bot=sh*.62, sy=(hh-cam.y)+ty;
  let a=(sy-top)/(bot-top); a=a<0?0:a>1?1:a;
  const s=a*a*(3-2*a);
  const tyc=(ty-(hh-top))*(1-s)+(ty-(hh-bot))*s;

  // Critically-damped spring (up faster than down)
  let vy=(cam as any)._v||0, cy=cam.y;
  const w=(cam.y>tyc) ? (upBias?6:4.5) : (upBias?3.2:4.5);
  if(w){
    const err=cy-tyc, acc=-2*w*vy-(w*w)*err;
    vy+=acc*dt; if(vy>900)vy=900; else if(vy<-900)vy=-900;
    cy+=vy*dt;
  }

  // Pixel snap
  cx=round(cx); cy=round(cy); (cam as any)._v=round(vy*10)/10;

  // --- Clamps ---
  // Pin LEFT when world narrower than screen (bottom-left alignment),
  // only clamp downward on Y.
  const xmin=hw;
  const xmax=ww<=sw ? hw : ww-hw;
  const ymax=wh - hh + sh;

  cam.x=max(xmin,min(xmax,cx));
  cam.y=min(ymax,cy);
}

export function applyCameraTransform(c:CanvasRenderingContext2D, cam:Cam, sw:number, sh:number){
  c.setTransform(1,0,0,1,0,0);
  c.translate(round(sw*.5-cam.x), round(sh*.5-cam.y));
}

export const getSnappedCameraPosition=(cam:Cam)=>({x:round(cam.x),y:round(cam.y)});
