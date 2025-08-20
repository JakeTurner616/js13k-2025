// src/engine/objects/portals/Portals.ts
// Trim-aware portal rendering with a lightweight glow.

import type { AtlasAnimator } from "../../../animation/AtlasAnimator";
import type { Ori } from "./PortalPlacement";

export type GameMapLike = { width:number; height:number; tiles: Uint32Array | number[] };
export type PortalKind  = "A" | "B";

// Exported for overlap checks (scene uses these)
export const PORTAL_W = 2 * 16;
export const PORTAL_H = 2 * 16;

type Portal = { kind: PortalKind; x:number; y:number; angle:number; o:Ori };

export function createPortalManager(TILE:number){
  // Active pair
  const slots: { A?: Portal; B?: Portal } = {};

  // Atlas bits (set when animator is provided)
  let animator: AtlasAnimator | null = null;
  let meta: any | null = null;         // trimmed sprite meta for "portal"
  let FW = 32, FH = 32;                // frame size in atlas
  let frames = 1, fps = 10;            // animation config

  // Display size (follows TILE from the scene)
  const PW = 2 * TILE, PH = 2 * TILE;

  // One small offscreen so we can tint only sprite pixels
  const scratch = (() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    return {
      canvas, ctx,
      size(w:number, h:number){
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = Math.max(1, w|0);
          canvas.height = Math.max(1, h|0);
        }
      },
      clear(){ ctx.clearRect(0,0,canvas.width,canvas.height); }
    };
  })();

  function setAnimator(a:AtlasAnimator){
    animator = a;

    // Accept either "portal" or "portals-Sheet" keys in meta
    const mAll:any = (a as any).meta;
    meta = mAll?.portal ?? mAll?.["portals-Sheet"] ?? null;

    // Frame geometry & fps/frameCount hints (fallbacks are sensible)
    FW = (a as any).fw ?? 32;
    FH = (a as any).fh ?? 32;

    const cfg = (a as any).getMeta?.("portal");
    const srcW = meta?.srcW ?? meta?.w ?? FW;
    frames = cfg?.frameCount ?? Math.max(1, ((srcW / FW) | 0));
    fps    = cfg?.fps        ?? 10;
  }

  function clear(){ slots.A = slots.B = undefined; }

  // World-space placement
  function replaceWorld(kind:PortalKind, x:number, y:number, angle:number, o:Ori){
    const p: Portal = { kind, x, y, angle, o };
    (kind === "A" ? (slots.A = p) : (slots.B = p));
  }

  // Grid helper (legacy)
  function replace(kind:PortalKind, gx:number, gy:number, o:Ori){
    const x = gx * TILE + PW * 0.5;
    const y = gy * TILE + PH * 0.5;
    const angle = (o==="U") ? Math.PI/2 : (o==="D") ? -Math.PI/2 : 0;
    replaceWorld(kind, x, y, angle, o);
  }

  function getSlots(){ return { A: slots.A, B: slots.B }; }

  // Tint + mask into the scratch surface
  function tintToScratch(img:HTMLImageElement, sx:number, sy:number, sw:number, sh:number, ddx:number, ddy:number, dw:number, dh:number, color:string){
    const o = scratch.ctx;
    scratch.size(PW, PH);
    scratch.clear();

    // base sprite
    o.globalCompositeOperation = "source-over";
    o.globalAlpha = 1;
    o.drawImage(img, sx, sy, sw, sh, ddx, ddy, dw, dh);

    // glow color
    o.globalCompositeOperation = "screen";
    o.globalAlpha = 0.85;
    o.fillStyle = color;
    o.fillRect(0, 0, PW, PH);

    // mask back to sprite alpha
    o.globalCompositeOperation = "destination-in";
    o.globalAlpha = 1;
    o.drawImage(img, sx, sy, sw, sh, ddx, ddy, dw, dh);
  }

  function drawOne(ctx:CanvasRenderingContext2D, p:Portal, t:number){
    const base = p.kind === "A" ? "#2a8cff" : "#ffa037";
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // If we have an atlas + trimmed meta, draw the animated sprite
    if (animator && meta){
      const img = animator.img;

      // which frame?
      const i = ((t * 0.001 * fps) | 0) % frames;
      const f0x = i * FW, f1x = f0x + FW;
      const f0y = 0,      f1y = FH;

      // kept region in the untrimmed frame
      const kx0 = meta.offX, ky0 = meta.offY;
      const kx1 = kx0 + meta.w, ky1 = ky0 + meta.h;

      // intersect frame rect with kept region
      const sx0U = Math.max(f0x, kx0), sx1U = Math.min(f1x, kx1);
      const sy0U = Math.max(f0y, ky0), sy1U = Math.min(f1y, ky1);
      const sw = (sx1U - sx0U) | 0, sh = (sy1U - sy0U) | 0;

      if (sw > 0 && sh > 0){
        // map to packed atlas coords
        const sx = (meta.x + (sx0U - meta.offX)) | 0;
        const sy = (meta.y + (sy0U - meta.offY)) | 0;

        // scale from logical frame to our PW×PH
        const scaleX = PW / FW, scaleY = PH / FH;
        const ddx = ((sx0U - f0x) * scaleX) | 0;
        const ddy = ((sy0U - f0y) * scaleY) | 0;
        const dw = (sw * scaleX) | 0, dh = (sh * scaleY) | 0;

        tintToScratch(img, sx, sy, sw, sh, ddx, ddy, dw, dh, base);

        ctx.globalAlpha = 0.97;
        ctx.drawImage(scratch.canvas, -PW/2, -PH/2);
        ctx.globalAlpha = 1;
      }
    } else {
      // fallback: simple glowing ellipse
      const rx = PW * 0.34, ry = PH * 0.45;
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

  function draw(ctx:CanvasRenderingContext2D, t:number){
    if (slots.A) drawOne(ctx, slots.A, t);
    if (slots.B) drawOne(ctx, slots.B, t);
  }

  return { setAnimator, replaceWorld, replace, clear, draw, getSlots };
}
