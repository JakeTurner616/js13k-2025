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
  name: string;       // logical animation name (e.g., "idle")
  frameCount: number; // logical frame count in the horizontal strip grid
  fps: number;
  dx: number;         // default draw offset
  dy: number;
}

const { max, min, floor } = Math;

export class AtlasAnimator {
  img!: HTMLImageElement;
  meta!: AtlasMeta;
  fw!: number;   // per-frame logical width
  fh!: number;   // per-frame logical height
  anims!: AnimationConfig[];

  // cache: animName → resolved atlas key
  private _keyCache = new Map<string, string>();
  // lowercase list of meta keys for fuzzy fallback
  private _metaKeysLower: [lower: string, actual: string][] = [];

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

    // build lowercase index once
    for (const k of Object.keys(meta)) this._metaKeysLower.push([k.toLowerCase(), k]);
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
   * Resolve an atlas entry for a logical animation name.
   * Tries exact key, case-insensitive, then fuzzy "contains" match.
   * Result is cached.
   */
  private _resolveAtlasEntry(animName: string): AtlasEntry | undefined {
    // cache hit?
    const cachedKey = this._keyCache.get(animName);
    if (cachedKey) return this.meta[cachedKey];

    // 1) exact key
    if (this.meta[animName]) {
      this._keyCache.set(animName, animName);
      return this.meta[animName];
    }

    // 2) case-insensitive
    const lower = animName.toLowerCase();
    const exactCI = this._metaKeysLower.find(([lk]) => lk === lower);
    if (exactCI) {
      this._keyCache.set(animName, exactCI[1]);
      return this.meta[exactCI[1]];
    }

    // 3) fuzzy contains (prefer shortest match to avoid overly generic keys)
    let pick: string | undefined;
    let pickLen = 1e9;
    for (const [lk, actual] of this._metaKeysLower) {
      if (lk.includes(lower) && this.meta[actual]) {
        if (actual.length < pickLen) { pick = actual; pickLen = actual.length; }
      }
    }
    if (pick) {
      this._keyCache.set(animName, pick);
      return this.meta[pick];
    }

    // give up
    return undefined;
  }

  /**
   * If the requested frame column 'i' lies entirely outside the kept (trimmed)
   * region horizontally, snap to the nearest live frame that overlaps.
   */
  private _clampToLiveFrame(i: number, m: AtlasEntry): number {
    // frames are laid out as [i*fw, (i+1)*fw) in untrimmed space
    // kept region is [offX, offX + w)
    const { fw } = this;
    const iMin = floor(m.offX / fw);
    const iMax = floor((m.offX + m.w - 1) / fw);
    if (i < iMin) return iMin;
    if (i > iMax) return iMax;
    return i;
  }

  /**
   * Trim-aware draw: intersect logical frame (fw×fh at index i)
   * with kept region (x,y,w,h) offset by (offX,offY) in untrimmed space.
   */
  drawFrame(ctx: CanvasRenderingContext2D, name: string, i: number, dx: number, dy: number) {
    const m = this._resolveAtlasEntry(name);
    if (!m) return;

    // snap 'i' to a live frame column if needed
    i = this._clampToLiveFrame(i, m);

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
