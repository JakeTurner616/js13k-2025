export type AtlasMeta = Record<string, { x: number; y: number; w: number; h: number }>;

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
  private fw: number;
  private fh: number;
  private anims: AnimationConfig[];

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

  getMeta = (name: string) => this.anims.find(a => a.name === name);

  drawAll(ctx: CanvasRenderingContext2D, t: number) {
    for (let a of this.anims) {
      const f = ((t / 1e3 * a.fps) | 0) % a.frameCount;
      this.drawFrame(ctx, a.name, f, a.dx, a.dy);
    }
  }

  drawFrame(ctx: CanvasRenderingContext2D, name: string, i: number, dx: number, dy: number) {
    const m = this.meta[name];
    const sx = m.x + i * this.fw;
    ctx.drawImage(this.img, sx | 0, m.y | 0, this.fw, this.fh, dx | 0, dy | 0, this.fw, this.fh);
  }
}
