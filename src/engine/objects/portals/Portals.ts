// src/engine/objects/portals/Portals.ts
// Tiny portal pair; trim-aware via AtlasAnimator.drawFrame, then tinted.

import type { AtlasAnimator } from "../../../animation/AtlasAnimator";
import type { Ori } from "./PortalPlacement";

export type GameMapLike = { width:number; height:number; tiles: Uint32Array | number[] };
export type PortalKind  = "A" | "B";

export const PORTAL_W = 2 * 16;
export const PORTAL_H = 2 * 16;

type Portal = { kind: PortalKind; x:number; y:number; angle:number; o:Ori };

export function createPortalManager(TILE:number){
  const slots: { A?: Portal; B?: Portal } = {};
  const PW = 2 * TILE, PH = 2 * TILE;

  let animator: AtlasAnimator | null = null;
  let fw = 32, fh = 32, frames = 1, fps = 6; // logical frame + anim config

  // scratch surface for tinting (sprite → tint atop → blit)
  const scratch = document.createElement("canvas");
  const sctx = scratch.getContext("2d")!;
  scratch.width = PW; scratch.height = PH;

  function setAnimator(a:AtlasAnimator){
    animator = a;
    fw = a.fw ?? 32;
    fh = a.fh ?? 32;

    // prefer explicit anim config; otherwise infer frames from meta width
    const cfg = a.getMeta("portal");
    const metaEntry = (a.meta as any)["portal"];
    frames = Math.max(1, (cfg?.frameCount ?? ((((metaEntry?.srcW ?? metaEntry?.w ?? fw) / fw) | 0) || 1)));
    fps    = Math.max(1, cfg?.fps ?? 10);
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

  function drawOne(ctx:CanvasRenderingContext2D, p:Portal, t:number){
    const tint = p.kind === "A" ? "#2a8dffad" : "#fc8e11a2";
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    if (animator){
      // draw logical fw×fh into PW×PH scratch via scale, then tint
      const fi = ((t * 0.001 * fps) | 0) % frames;

      sctx.setTransform(1,0,0,1,0,0);
      sctx.clearRect(0,0,PW,PH);
      sctx.save();
      sctx.scale(PW / fw, PH / fh);

      // AtlasAnimator draws into logical coords; dx,dy is top-left of logical frame box
      animator.drawFrame(sctx as unknown as CanvasRenderingContext2D, "portal", fi, 0, 0);

      sctx.restore();
      sctx.globalCompositeOperation = "source-atop";
      sctx.globalAlpha = 0.9;
      sctx.fillStyle = tint;
      sctx.fillRect(0,0,PW,PH);
      sctx.globalCompositeOperation = "source-over";
      sctx.globalAlpha = 1;

      // subtle glow on blit
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = tint;
      ctx.globalAlpha = 0.97;
      ctx.drawImage(scratch, -PW/2, -PH/2);
      ctx.restore();
    } 

    ctx.restore();
  }

  function draw(ctx:CanvasRenderingContext2D, t:number){
    if (slots.A) drawOne(ctx, slots.A, t);
    if (slots.B) drawOne(ctx, slots.B, t);
  }

  return { setAnimator, replaceWorld, replace, clear, draw, getSlots };
}
