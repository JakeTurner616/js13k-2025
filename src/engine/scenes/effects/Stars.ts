export function drawStars(ctx:CanvasRenderingContext2D,w:number,h:number,t:number,scroll:number){
  ctx.fillStyle="#fff";
  const cutoff=h*0.35; // minimum star height from top
  for(let i=0;i<60;i++){
    const x=(i*89+scroll)%w;
    let yf=((i*97)%100/100)**2; // fall-off toward top
    let y=cutoff*yf; // limit vertical range
    const tw=0.5+0.5*Math.sin(t/500+i*7);
    const sz=1+tw*0.5*(.3+((i*73)%10)/10);
    ctx.globalAlpha=tw;
    ctx.fillRect(x,y,sz,sz);
  }
  ctx.globalAlpha=1;
}
