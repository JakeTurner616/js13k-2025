// src/animation/AtlasAnimator.ts
type AtlasEntry = {
  // packed (trimmed) strip rect in atlas
  x: number; y: number; w: number; h: number;
  // untrimmed offsets (cropped from left/top)
  offX: number; offY: number;
  // optional: original untrimmed size (not used by renderer)
  srcW?: number; srcH?: number;
};
export type AtlasMeta = Record<string, AtlasEntry>;

export interface AnimationConfig {
  name: string;
  frameCount: number;
  fps: number;
  dx: number;
  dy: number;
}

const { max, min } = Math;

export class AtlasAnimator {
  img!: HTMLImageElement;
  meta!: AtlasMeta;
  fw!: number;   // per-frame logical width
  fh!: number;   // per-frame logical height
  anims!: AnimationConfig[];

  constructor(
    img: HTMLImageElement,
    meta: AtlasMeta,
    fw: number,
    fh: number,
    anims: AnimationConfig[]
  ) {
    this.img = img;
    this.meta = meta;
    this.fw = fw;
    this.fh = fh;
    this.anims = anims;
  }

  getMeta(name: string) {
    return this.anims.find(a => a.name === name);
  }

  drawAll(ctx: CanvasRenderingContext2D, t: number) {
    const sec = t / 1e3;
    for (const a of this.anims) {
      const f = ((sec * a.fps) | 0) % a.frameCount;
      this.drawFrame(ctx, a.name, f, a.dx, a.dy);
    }
  }

  /**
   * Trim-aware draw: intersect logical frame (fw×fh at index i)
   * with kept region (x,y,w,h) offset by (offX,offY) in untrimmed space.
   */
  drawFrame(ctx: CanvasRenderingContext2D, name: string, i: number, dx: number, dy: number) {
    const m = this.meta[name];
    if (!m) return;
    const { x, y, w, h, offX, offY } = m;

    // Horizontal intersection (untrimmed space)
    const f0x = i * this.fw, f1x = f0x + this.fw;
    const k0x = offX,        k1x = offX + w;
    const sx0U = max(f0x, k0x), sx1U = min(f1x, k1x);
    const sw = (sx1U - sx0U) | 0;
    if (sw <= 0) return;

    // Vertical intersection (untrimmed space)
    const f0y = 0,           f1y = this.fh;
    const k0y = offY,        k1y = offY + h;
    const sy0U = max(f0y, k0y), sy1U = min(f1y, k1y);
    const sh = (sy1U - sy0U) | 0;
    if (sh <= 0) return;

    // Map untrimmed → packed atlas coords
    const sx = (x + (sx0U - offX)) | 0;
    const sy = (y + (sy0U - offY)) | 0;

    // Destination offset inside logical frame box
    const ddx = (dx + (sx0U - f0x)) | 0;
    const ddy = (dy + (sy0U - f0y)) | 0;

    ctx.drawImage(this.img, sx, sy, sw, sh, ddx, ddy, sw, sh);
  }
}