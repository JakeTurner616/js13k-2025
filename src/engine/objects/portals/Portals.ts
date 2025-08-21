// src/engine/objects/portals/Portals.ts
// Tiny portal pair; draw atlas frame to offscreen, tint via source-atop (no alpha bleed).

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
  let fw = 32, fh = 32, frames = 1, fps = 10;

  // Offscreen surface for masked tint (sprite → source-atop tint → blit)
  const scratch = document.createElement("canvas");
  const sctx = scratch.getContext("2d")!;
  scratch.width = PW; scratch.height = PH;

  function setAnimator(a:AtlasAnimator){
    animator = a;
    fw = a.fw ?? 32;
    fh = a.fh ?? 32;
    const m = a.getMeta?.("portal");
    frames = Math.max(1, ((m?.frameCount ?? 1) | 0));
    fps    = Math.max(1, ((m?.fps ?? 10) | 0));
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

  return { setAnimator, replaceWorld, replace, clear, draw, getSlots };
}
