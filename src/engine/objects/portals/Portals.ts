// src/engine/objects/portals/Portals.ts
// Animated, trim-aware portal rendering with glowy tint (less transparent, no ellipse).

import type { AtlasAnimator } from "../../../animation/AtlasAnimator";
import type { Ori } from "./PortalPlacement";

export type GameMapLike = { width:number; height:number; tiles: Uint32Array | number[] };
export type PortalKind = "A" | "B";

type Portal = { kind: PortalKind; x:number; y:number; angle:number; o:Ori };

export function createPortalManager(TILE: number) {
  const slots: { A?: Portal; B?: Portal } = {};
  let animator: AtlasAnimator | null = null;
  let portalMeta: any | null = null;
  let portalCfg: { fps:number; frameCount:number } | null = null;

  const PORTAL_W = 2 * TILE;
  const PORTAL_H = 2 * TILE;

  // offscreen scratch for tinting only sprite pixels
  const scratch = (() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    return {
      canvas, ctx,
      ensure(w:number, h:number){
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = Math.max(1, w|0);
          canvas.height = Math.max(1, h|0);
        }
      },
      clear(){ ctx.clearRect(0,0,canvas.width,canvas.height); }
    };
  })();

  function setAnimator(a: AtlasAnimator) {
    animator = a;
    portalMeta = (a as any).meta["portal"] ?? (a as any).meta["portals-Sheet"] ?? null;

    const cfg = (a as any).getMeta ? (a as any).getMeta("portal") : null;
    const FW = (a as any).fw ?? 32;
    const srcW = portalMeta?.srcW ?? portalMeta?.w ?? FW;
    const inferredFrames = Math.max(1, ((srcW / FW) | 0));
    const fps = cfg?.fps ?? 10; // “slightly slow but smooth”
    const frameCount = cfg?.frameCount ?? inferredFrames;
    portalCfg = { fps, frameCount };
  }

  function clear(){ slots.A = slots.B = undefined; }

  // World-space API
  function replaceWorld(kind: PortalKind, x:number, y:number, angle:number, o:Ori) {
    const p: Portal = { kind, x, y, angle, o };
    if (kind === "A") slots.A = p; else slots.B = p;
  }

  // Legacy tile API (maps to world center)
  function replace(kind: PortalKind, gx:number, gy:number, o:Ori) {
    const x = gx * TILE + PORTAL_W * 0.5;
    const y = gy * TILE + PORTAL_H * 0.5;
    const angle = (o === "U") ? Math.PI/2 : (o === "D") ? -Math.PI/2 : 0;
    replaceWorld(kind, x, y, angle, o);
  }

  // Tint + mask; returns offscreen with the final portal pixels.
  function drawTintedPortalToScratch(
    img:HTMLImageElement,
    sx:number, sy:number, sw:number, sh:number,
    frameW:number, frameH:number, ddx:number, ddy:number, dw:number, dh:number,
    color:string
  ){
    const octx = scratch.ctx;
    scratch.ensure(frameW, frameH);
    scratch.clear();

    // base sprite → offscreen
    octx.globalCompositeOperation = "source-over";
    octx.globalAlpha = 1;
    octx.drawImage(img, sx, sy, sw, sh, ddx, ddy, dw, dh);

    // glowy colorization (more opaque than before)
    octx.globalCompositeOperation = "screen";
    octx.globalAlpha = 0.85;         // ↑ a bit less transparency
    octx.fillStyle = color;
    octx.fillRect(0, 0, frameW, frameH);

    // mask back to sprite alpha
    octx.globalCompositeOperation = "destination-in";
    octx.globalAlpha = 1;
    octx.drawImage(img, sx, sy, sw, sh, ddx, ddy, dw, dh);
  }

  function drawOne(ctx:CanvasRenderingContext2D, p:Portal, t:number){
    const base = p.kind === "A" ? "#2a8cff" : "#ffa037";
    const cx = p.x, cy = p.y;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.angle);

    if (animator && portalMeta) {
      const img = animator.img;
      const m = portalMeta;

      const FW = (animator as any).fw ?? 32;
      const FH = (animator as any).fh ?? 32;

      // animated frame index
      const fps = portalCfg?.fps ?? 10;
      const frames = portalCfg?.frameCount ?? Math.max(1, ((m.srcW ?? FW) / FW) | 0);
      const i = ((t / 1000 * fps) | 0) % frames;

      // logical frame (untrimmed) at index i
      const f0x = i * FW, f1x = f0x + FW;
      const f0y = 0,      f1y = FH;

      // kept region in untrimmed space
      const k0x = m.offX, k1x = m.offX + m.w;
      const k0y = m.offY, k1y = m.offY + m.h;

      // intersect
      const sx0U = Math.max(f0x, k0x), sx1U = Math.min(f1x, k1x);
      const sy0U = Math.max(f0y, k0y), sy1U = Math.min(f1y, k1y);
      const sw = (sx1U - sx0U) | 0;
      const sh = (sy1U - sy0U) | 0;

      if (sw > 0 && sh > 0) {
        // map untrimmed → packed atlas coords
        const sx = (m.x + (sx0U - m.offX)) | 0;
        const sy = (m.y + (sy0U - m.offY)) | 0;

        // scale to our displayed frame size
        const scaleX = PORTAL_W / FW;
        const scaleY = PORTAL_H / FH;

        const ddx = ((sx0U - f0x) * scaleX) | 0;
        const ddy = ((sy0U - f0y) * scaleY) | 0;
        const dw = (sw * scaleX) | 0;
        const dh = (sh * scaleY) | 0;

        drawTintedPortalToScratch(
          img, sx, sy, sw, sh,
          PORTAL_W, PORTAL_H, ddx, ddy, dw, dh,
          base
        );

        // blit to world (slightly more opaque)
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.97;      // ↑ less transparent overall
        ctx.drawImage(scratch.canvas, -PORTAL_W/2, -PORTAL_H/2);

        // reset
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
    } else {
      // fallback: simple ring (kept solid-ish)
      const rx = (PORTAL_W * 0.34), ry = (PORTAL_H * 0.45);
      ctx.shadowBlur = 10;
      ctx.shadowColor = base;
      ctx.strokeStyle = base;
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function draw(ctx:CanvasRenderingContext2D, t:number, _map?:GameMapLike, _canvasH?:number){
    if (slots.A) drawOne(ctx, slots.A, t);
    if (slots.B) drawOne(ctx, slots.B, t);
  }

  return { setAnimator, replaceWorld, replace, clear, draw };
}
