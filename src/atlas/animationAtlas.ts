// src/atlas/animationAtlas.ts
// Build trim-aware metadata; compute cols from sourceSize.w, not frame.w.

import { AtlasAnimator, type AtlasEntry, type AnimationConfig } from "../animation/AtlasAnimator";
import { getAtlasImage, waitForAtlas } from "../engine/renderer/SharedAtlas";
import ftp from "../assets/packed/animations/texture";
import { nameToKey } from "../assets/packed/animations/textureNames";

const FW = 32, FH = 32;

function buildMetaFromFTP(json:any){
  const out:Record<string,AtlasEntry> = {};
  const frames = json?.frames || {};
  for(const key in frames){
    const f = frames[key];
    const fr  = f?.f ?? f?.frame;                 // trimmed rect
    const sss = f?.sss ?? f?.spriteSourceSize;    // offset in untrimmed box
    const src = f?.src ?? f?.sourceSize;          // original untrimmed strip size
    if(!fr) continue;
    const off = sss ?? { x:0, y:0, w:fr.w, h:fr.h };
    const sz  = src ?? { w:fr.w, h:fr.h };
    out[key] = {
      x: fr.x|0, y: fr.y|0, w: fr.w|0, h: fr.h|0,
      offX: off.x|0, offY: off.y|0,
      srcW: (sz.w|0) || (fr.w|0),
      srcH: (sz.h|0) || (fr.h|0)
    };
  }
  return out;
}

const ftpMeta = buildMetaFromFTP(ftp);

// Build meta keyed by friendly names
const meta:Record<string,AtlasEntry> = {};
for (const friendly in nameToKey){
  const token = (nameToKey as any)[friendly];
  const m = ftpMeta[token];
  if (m) meta[friendly] = m;
  else console.warn(`[atlas] missing frame for "${friendly}" → "${token}"`);
}

// Animation list — cols from sourceSize.w / FW (not trimmed width!)
function mk(name:keyof typeof nameToKey, fps:number, frames?:number, dx=0, dy=0): AnimationConfig | null {
  const m = meta[name as string]; if(!m) return null;
  const autoCols = Math.max(1, (m.srcW / FW) | 0);
  return { name: name as string, frameCount: frames && frames>0 ? frames|0 : autoCols, fps, dx, dy };
}

const animations = [
  mk("idle",   8),
  mk("jump",  10),
  mk("fall",  10),
  mk("dash",  12),
  // ledge removed
  mk("death",  6, 7),
  mk("portal", 8)
].filter(Boolean) as AnimationConfig[];

// Public: wait for atlas and construct the animator
export function createAnimator(cb:(a:AtlasAnimator)=>void){
  waitForAtlas("anim").then(()=>{
    const img = getAtlasImage("anim");
    cb(new AtlasAnimator(img, meta, FW, FH, animations));
  });
}
