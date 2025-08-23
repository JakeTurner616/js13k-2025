// src/animation/AtlasAnimator.ts
// Trim-aware strip animator: each anim is one horizontal strip.
// Intersects logical frame box with kept (trimmed) region before blitting.

export type AtlasEntry = {
  x:number; y:number; w:number; h:number; // kept rect in atlas
  offX:number; offY:number;               // offset in untrimmed frame box
  srcW:number; srcH:number;               // full untrimmed strip size
};

export interface AnimationConfig {
  name:string; frameCount:number; fps:number; dx:number; dy:number;
}

export class AtlasAnimator {
  img: HTMLImageElement;
  meta: Record<string, AtlasEntry>;
  fw: number;
  fh: number;
  anims: AnimationConfig[];

  constructor(
    img: HTMLImageElement,
    meta: Record<string, AtlasEntry>,
    fw: number,
    fh: number,
    anims: AnimationConfig[]
  ){
    this.img = img;
    this.meta = meta;
    this.fw = fw;
    this.fh = fh;
    this.anims = anims;
  }

  getMeta(name:string){ return this.anims.find(a=>a.name===name); }

  private clampFrame(i:number, m:AtlasEntry){
    // valid frame columns that overlap the kept rect
    const iMin = (m.offX / this.fw) | 0;
    const iMax = ((m.offX + m.w - 1) / this.fw) | 0;
    return i<iMin?iMin : i>iMax?iMax : i|0;
  }

  drawFrame(ctx:CanvasRenderingContext2D, name:string, i:number, dx:number, dy:number){
    const m = this.meta[name]; if(!m) return;
    i = this.clampFrame(i, m);

    // logical frame box in *untrimmed* strip space
    const f0x = i * this.fw, f1x = f0x + this.fw;
    const f0y = 0,           f1y = this.fh;

    // intersect with kept region (also in untrimmed coords via offX/offY)
    const k0x = m.offX,      k1x = m.offX + m.w;
    const k0y = m.offY,      k1y = m.offY + m.h;

    const sx0U = Math.max(f0x, k0x), sx1U = Math.min(f1x, k1x);
    const sy0U = Math.max(f0y, k0y), sy1U = Math.min(f1y, k1y);
    const sw = (sx1U - sx0U) | 0, sh = (sy1U - sy0U) | 0;
    if (sw<=0 || sh<=0) return;

    // map untrimmed → atlas pixels
    const sx = (m.x + (sx0U - m.offX)) | 0;
    const sy = (m.y + (sy0U - m.offY)) | 0;

    // destination offset inside the logical frame
    const ddx = (dx + (sx0U - f0x)) | 0;
    const ddy = (dy + (sy0U - f0y)) | 0;

    ctx.drawImage(this.img, sx, sy, sw, sh, ddx, ddy, sw, sh);
  }
}
