// src/engine/objects/portals/Portals.ts
// Tiny portal pair; draw atlas frame to offscreen, tint via source-atop (no alpha bleed).
// PRECISE OVERLAP: union alpha mask (+ dilated/eroded variants) for stable enter/exit hysteresis.

import type { AtlasAnimator } from "../../../animation/AtlasAnimator";
import type { Ori } from "./PortalPlacement";

export type GameMapLike = { width:number; height:number; tiles: Uint32Array | number[] };
export type PortalKind  = "A" | "B";

export const PORTAL_W = 2 * 16;
export const PORTAL_H = 2 * 16;

type Portal = { kind: PortalKind; x:number; y:number; angle:number; o:Ori };

// Footprint mask in portal-local space (origin at center, unrotated).
export type FootprintMask = {
  w:number; h:number;     // in pixels (PW×PH)
  data: Uint8Array;       // 0/1 per px, row-major
  bbox: { x0:number; y0:number; x1:number; y1:number };
};

export function createPortalManager(TILE:number){
  const slots: { A?: Portal; B?: Portal } = {};
  const PW = 2 * TILE, PH = 2 * TILE;

  let animator: AtlasAnimator | null = null;
  let fw = 32, fh = 32, frames = 1, fps = 10;

  // Offscreen surface for masked tint (sprite → source-atop tint → blit)
  const scratch = document.createElement("canvas");
  const sctx = scratch.getContext("2d")!;
  scratch.width = PW; scratch.height = PH;

  // --- union mask over all frames (opaque alpha => solid) + dilated/eroded variants ---
  let maskRaw: FootprintMask = {
    w: PW, h: PH,
    data: new Uint8Array(PW * PH),
    bbox: { x0: PW, y0: PH, x1: -1, y1: -1 },
  };
  // Outer = 4-neighborhood dilation by 1px (enter threshold)
  let maskOuter: FootprintMask = { w: PW, h: PH, data: new Uint8Array(PW*PH), bbox: {x0:PW,y0:PH,x1:-1,y1:-1} };
  // Inner = 4-neighborhood erosion by 1px (exit threshold)
  let maskInner: FootprintMask = { w: PW, h: PH, data: new Uint8Array(PW*PH), bbox: {x0:PW,y0:PH,x1:-1,y1:-1} };

  function _touchBBoxAcc(b: {x0:number;y0:number;x1:number;y1:number}, x:number,y:number){
    if (x < b.x0) b.x0 = x; if (y < b.y0) b.y0 = y;
    if (x > b.x1) b.x1 = x; if (y > b.y1) b.y1 = y;
  }

  function _rebuildMask(){
    if (!animator) return;

    // clear
    maskRaw.data.fill(0);
    maskRaw.bbox = { x0: PW, y0: PH, x1: -1, y1: -1 };

    // draw each frame un-tinted into PW×PH, scaled to fit; OR alpha>8 into mask
    for (let fi = 0; fi < frames; fi++){
      sctx.setTransform(PW / fw, 0, 0, PH / fh, 0, 0);
      sctx.clearRect(0, 0, PW, PH);
      animator.drawFrame(sctx as unknown as CanvasRenderingContext2D, "portal", fi, 0, 0);

      const { data } = sctx.getImageData(0, 0, PW, PH);
      for (let y = 0, i = 3; y < PH; y++){
        const row = y * PW;
        for (let x = 0; x < PW; x++, i += 4){
          const opaque = data[i] > 8 ? 1 : 0;
          if (opaque) {
            const idx = row + x;
            if (!maskRaw.data[idx]) {
              maskRaw.data[idx] = 1;
              _touchBBoxAcc(maskRaw.bbox, x, y);
            }
          }
        }
      }
    }

    // if nothing was drawn, keep bbox sane
    if (maskRaw.bbox.x1 < maskRaw.bbox.x0) {
      maskRaw.bbox = { x0: 0, y0: 0, x1: -1, y1: -1 };
    }

    // Build OUTER (1px dilate, 4-neighborhood)
    maskOuter.data.fill(0); maskOuter.bbox = { x0: PW, y0: PH, x1: -1, y1: -1 };
    for (let y = 0; y < PH; y++){
      for (let x = 0; x < PW; x++){
        if (!maskRaw.data[y*PW + x]) continue;
        const pts = [[x,y],[x-1,y],[x+1,y],[x,y-1],[x,y+1]] as const;
        for (const [qx,qy] of pts){
          if (qx>=0 && qx<PW && qy>=0 && qy<PH){
            const qi = qy*PW + qx;
            if (!maskOuter.data[qi]){
              maskOuter.data[qi]=1; _touchBBoxAcc(maskOuter.bbox, qx, qy);
            }
          }
        }
      }
    }
    if (maskOuter.bbox.x1 < maskOuter.bbox.x0) maskOuter.bbox = {x0:0,y0:0,x1:-1,y1:-1};

    // Build INNER (1px erode, 4-neighborhood)
    maskInner.data.fill(0); maskInner.bbox = { x0: PW, y0: PH, x1: -1, y1: -1 };
    for (let y = 0; y < PH; y++){
      for (let x = 0; x < PW; x++){
        const i = y*PW + x;
        if (!maskRaw.data[i]) continue;
        // Keep only pixels whose 4-neighbors are all opaque in raw
        const up    = (y>0   ? maskRaw.data[(y-1)*PW + x] : 0);
        const down  = (y<PH-1? maskRaw.data[(y+1)*PW + x] : 0);
        const left  = (x>0   ? maskRaw.data[y*PW + (x-1)] : 0);
        const right = (x<PW-1? maskRaw.data[y*PW + (x+1)] : 0);
        if (up && down && left && right){
          maskInner.data[i]=1; _touchBBoxAcc(maskInner.bbox, x, y);
        }
      }
    }
    if (maskInner.bbox.x1 < maskInner.bbox.x0) maskInner.bbox = {x0:0,y0:0,x1:-1,y1:-1};

    // reset transform back to identity for normal use
    sctx.setTransform(1,0,0,1,0,0);
  }

  function setAnimator(a:AtlasAnimator){
    animator = a;
    fw = a.fw ?? 32;
    fh = a.fh ?? 32;
    const m = a.getMeta?.("portal");
    frames = Math.max(1, ((m?.frameCount ?? 1) | 0));
    fps    = Math.max(1, ((m?.fps ?? 10) | 0));
    _rebuildMask();
  }

  function clear(){ slots.A = slots.B = undefined; }

  function replaceWorld(kind:PortalKind, x:number, y:number, angle:number, o:Ori){
    (kind === "A" ? (slots.A = { kind, x, y, angle, o }) : (slots.B = { kind, x, y, angle, o }));
  }

  function replace(kind:PortalKind, gx:number, gy:number, o:Ori){
    const x = gx * TILE + PW * 0.5;
    const y = gy * TILE + PH * 0.5;
    const angle = (o==="U") ? Math.PI/2 : (o==="D") ? -Math.PI/2 : 0;
    replaceWorld(kind, x, y, angle, o);
  }

  function getSlots(){ return { A: slots.A, B: slots.B }; }

  function getFootprintMask(): FootprintMask { return maskRaw; }

  // ---------- Drawing ----------
  function drawOne(ctx:CanvasRenderingContext2D, p:Portal, t:number){
    const a = animator; if (!a) return;
    const fi = ((t * 0.001 * fps) | 0) % frames;

    // Draw atlas frame into PW×PH scratch (scaled), then tint only sprite pixels.
    sctx.setTransform(PW / fw, 0, 0, PH / fh, 0, 0);
    sctx.clearRect(0, 0, PW, PH);
    a.drawFrame(sctx as unknown as CanvasRenderingContext2D, "portal", fi, 0, 0);

    sctx.globalCompositeOperation = "source-atop";
    sctx.globalAlpha = .85;
    sctx.fillStyle = p.kind === "A" ? "#28f" : "#f80";
    sctx.fillRect(0, 0, PW, PH);
    sctx.globalCompositeOperation = "source-over";
    sctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.drawImage(scratch, -PW/2, -PH/2);
    ctx.restore();
  }

  function draw(ctx:CanvasRenderingContext2D, t:number){
    if (slots.A) drawOne(ctx, slots.A, t);
    if (slots.B) drawOne(ctx, slots.B, t);
  }

  // ---------- Precise overlap with hysteresis ----------
  // Convert world point -> portal local (mask) coords
  function toMaskSpace(px:number, py:number, p:Portal){
    // translate to portal center
    const dx = px - p.x, dy = py - p.y;
    // rotate by -angle
    const ca = Math.cos(-p.angle), sa = Math.sin(-p.angle);
    const lx = dx * ca - dy * sa;
    const ly = dx * sa + dy * ca;
    // shift to mask pixel coords
    const mx = Math.round(lx + PW * 0.5);
    const my = Math.round(ly + PH * 0.5);
    return {mx, my};
  }

  function _maskHit(mask:FootprintMask, mx:number, my:number){
    if (mx < mask.bbox.x0 || my < mask.bbox.y0 || mx > mask.bbox.x1 || my > mask.bbox.y1) return false;
    if (mx < 0 || my < 0 || mx >= mask.w || my >= mask.h) return false;
    return !!mask.data[my * mask.w + mx];
  }

  // Module-scoped hysteresis state: once "in", require leaving inner mask to clear.
  let _wasTouching = false;

  // (kept API) Now uses precise rotated mask + hysteresis.
  function checkPlayerOverlap(
    b:{pos:{x:number;y:number},width:number,height:number,hit?:{x:number;y:number;w:number;h:number}},
    setTouch:(v:boolean)=>void
  ){
    const hb = b.hit ?? {x:0,y:0,w:b.width,h:b.height};
    const bx = b.pos.x + hb.x, by = b.pos.y + hb.y, bw = hb.w, bh = hb.h;

    // Sample a tiny grid inside the hitbox (reduces false negatives on thin edges)
    const SX = 3, SY = 3;
    function sampleMask(m:FootprintMask, p:Portal): boolean {
      for (let iy = 0; iy < SY; iy++){
        const py = by + (iy + 0.5) * (bh / SY);
        for (let ix = 0; ix < SX; ix++){
          const px = bx + (ix + 0.5) * (bw / SX);
          const { mx, my } = toMaskSpace(px, py, p);
          if (_maskHit(m, mx, my)) return true;
        }
      }
      return false;
    }

    // Any active portal qualifies
    let touchingOuter = false, touchingInner = false;
    if (slots.A){ touchingOuter = touchingOuter || sampleMask(maskOuter, slots.A); touchingInner = touchingInner || sampleMask(maskInner, slots.A); }
    if (slots.B){ touchingOuter = touchingOuter || sampleMask(maskOuter, slots.B); touchingInner = touchingInner || sampleMask(maskInner, slots.B); }

    // Hysteresis: enter when we hit OUTER; leave only when not in INNER anymore.
    if (!_wasTouching && touchingOuter) _wasTouching = true;
    else if (_wasTouching && !touchingInner) _wasTouching = false;

    setTouch(_wasTouching);
  }

  return { setAnimator, replaceWorld, replace, clear, draw, getSlots, getFootprintMask, checkPlayerOverlap };
}
