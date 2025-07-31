export type AtlasMeta = Record<string, { x: number; y: number; w: number; h: number }>;

export interface AnimationConfig {
  name: string;
  frameCount: number;
  fps: number;
  dx: number;
  dy: number;
}

export class AtlasAnimator {
  private atlas: HTMLImageElement;
  private meta: AtlasMeta;
  private frameW: number;
  private frameH: number;
  private animations: AnimationConfig[];

  constructor(
    atlasImage: HTMLImageElement,
    meta: AtlasMeta,
    frameWidth: number,
    frameHeight: number,
    animations: AnimationConfig[]
  ) {
    this.atlas = atlasImage;
    this.meta = meta;
    this.frameW = frameWidth;
    this.frameH = frameHeight;
    this.animations = animations;
  }
getMeta(name: string) {
  return this.animations.find(anim => anim.name === name);
}
  drawAll(ctx: CanvasRenderingContext2D, time: number) {
    for (const anim of this.animations) {
      const frameIndex = Math.floor((time / 1000) * anim.fps) % anim.frameCount;
      this.drawFrame(ctx, anim.name, frameIndex, anim.dx, anim.dy);
    }
  }

  drawFrame(
    ctx: CanvasRenderingContext2D,
    name: string,
    frameIndex: number,
    dx: number,
    dy: number
  ) {
    const { x, y } = this.meta[name];
    const sx = x + frameIndex * this.frameW;
    ctx.drawImage(
      this.atlas,
      sx | 0, y | 0, this.frameW, this.frameH,
      dx | 0, dy | 0, this.frameW, this.frameH
    );
  }
}
