// src/animation/AtlasAnimator.ts
export type AtlasMeta = Record<
  string,
  {
    // packed (trimmed) strip rect inside the atlas image
    x: number; y: number; w: number; h: number;
    // original untrimmed strip size (e.g., N*fw by fh)
    srcW: number; srcH: number;
    // how much was trimmed off left/top in untrimmed coords
    offX: number; offY: number;
  }
>;

export interface AnimationConfig {
  name: string;
  frameCount: number;
  fps: number;
  dx: number;
  dy: number;
}

export class AtlasAnimator {
  private img: HTMLImageElement;
  private meta: AtlasMeta;
  private fw: number; // per-frame logical width (pixels)
  private fh: number; // per-frame logical height (pixels)
  private anims: AnimationConfig[];

  constructor(
    img: HTMLImageElement,
    meta: AtlasMeta,
    fw: number, // pass your animation frame width (e.g., 32)
    fh: number, // pass your animation frame height (e.g., 32)
    anims: AnimationConfig[]
  ) {
    this.img = img;
    this.meta = meta;
    this.fw = fw;
    this.fh = fh;
    this.anims = anims;
  }

  getMeta = (name: string) => this.anims.find(a => a.name === name);

  drawAll(ctx: CanvasRenderingContext2D, t: number) {
    for (let a of this.anims) {
      const f = (((t / 1e3) * a.fps) | 0) % a.frameCount;
      this.drawFrame(ctx, a.name, f, a.dx, a.dy);
    }
  }

  /**
   * Trim-aware draw: intersect each logical fw×fh frame with the kept (trimmed) strip.
   * Untrimmed space:
   *   keepX ∈ [offX, offX+w), keepY ∈ [offY, offY+h)
   *   frameX ∈ [i*fw, i*fw+fw), frameY ∈ [0, fh)
   */
  drawFrame(ctx: CanvasRenderingContext2D, name: string, i: number, dx: number, dy: number) {
    const m = this.meta[name];
    if (!m) return;

    // Horizontal intersection in untrimmed coords
    const f0x = i * this.fw, f1x = f0x + this.fw;
    const k0x = m.offX,      k1x = m.offX + m.w;
    const sx0U = Math.max(f0x, k0x);
    const sx1U = Math.min(f1x, k1x);
    const sw = (sx1U - sx0U) | 0;
    if (sw <= 0) return;

    // Vertical intersection in untrimmed coords
    const f0y = 0,           f1y = this.fh;
    const k0y = m.offY,      k1y = m.offY + m.h;
    const sy0U = Math.max(f0y, k0y);
    const sy1U = Math.min(f1y, k1y);
    const sh = (sy1U - sy0U) | 0;
    if (sh <= 0) return;

    // Map untrimmed → packed
    const sx = (m.x + (sx0U - m.offX)) | 0;
    const sy = (m.y + (sy0U - m.offY)) | 0;

    // Destination offset inside the logical fw×fh box
    const ddx = (dx + (sx0U - f0x)) | 0;
    const ddy = (dy + (sy0U - f0y)) | 0;

    ctx.drawImage(this.img, sx, sy, sw, sh, ddx, ddy, sw, sh);
  }
}
