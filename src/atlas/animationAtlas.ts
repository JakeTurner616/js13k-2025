// src/atlas/animationAtlas.ts
import { AtlasAnimator, type AtlasMeta, type AnimationConfig } from "../animation/AtlasAnimator";
import { getAtlasImage, waitForAtlas } from "../engine/renderer/SharedAtlas";
import ftp from "../assets/packed/animations/texture";

function buildMetaFromFTP(json: any): AtlasMeta {
  const out: AtlasMeta = {};
  const frames = json?.frames || {};
  for (const key in frames) {
    const f = frames[key];

    // ✅ accept compact or verbose keys
    const fr  = f?.frame ?? f?.f;
    if (!fr) continue;
    const sss = f?.sss ?? f?.spriteSourceSize ?? { x: 0, y: 0, w: fr.w, h: fr.h };
    const src = f?.src ?? f?.sourceSize ?? { w: fr.w, h: fr.h };

    out[key] = {
      x: fr.x|0, y: fr.y|0, w: fr.w|0, h: fr.h|0,
      srcW: (src.w|0) || (fr.w|0),
      srcH: (src.h|0) || (fr.h|0),
      offX: sss.x|0, offY: sss.y|0,
    };
  }
  return out;
}

const ftpMeta = buildMetaFromFTP(ftp);

// 🔎 map friendly names → ftp keys (now includes portal)
const nameMap = {
  death:  "18_Alternative_Colour_Cat_Death-Sheet",
  idle:   "1_Alternative_Colour_Cat_Idle-Sheet",
  ledge:  "8_Alternative_Colour_Cat_Ledge_Grab_Idle-Sheet",
  dash:   "6_Alternative_Colour_Cat_Dash-Sheet",
  jump:   "3_Alternative_Colour_Cat_Jump-Sheet",
  fall:   "4_Alternative_Colour_Cat_Fall-Sheet",
  portal: "portals-Sheet",
} as const;

const atlasMeta: AtlasMeta = {};
(Object.keys(nameMap) as Array<keyof typeof nameMap>).forEach((k) => {
  const m = ftpMeta[nameMap[k]];
  if (m) (atlasMeta as any)[k as string] = m;
  else console.warn(`[atlas] missing frame for "${String(k)}" → "${nameMap[k]}"`);
});

// Frames are sliced from 32×32 strips
const FW = 32, FH = 32;

/**
 * Create an animation config.
 * - fps: playback frames-per-second
 * - framesOverride: if provided, forces a specific frameCount (useful when the strip contains padding/blank cells)
 */
const mkAnim = (
  name: keyof typeof nameMap,
  fps: number,
  framesOverride?: number,
  dx = 0,
  dy = 0
): AnimationConfig | null => {
  const m = (atlasMeta as any)[name as string];
  if (!m) return null;
  const autoFrames = Math.max(1, (((m.srcW ?? FW) / FW) | 0));
  const frameCount = (framesOverride && framesOverride > 0) ? framesOverride|0 : autoFrames;
  return { name: name as string, frameCount, fps, dx, dy };
};

const animations = [
  mkAnim("idle",   8),
  mkAnim("jump",  10),
  mkAnim("fall",  10),
  mkAnim("dash",  12),
  mkAnim("ledge",  6),
  // 👇 force exactly 7 frames, play a bit slower so it reads nicely
  mkAnim("death",  6, 7),
  mkAnim("portal", 8),
].filter(Boolean) as AnimationConfig[];

export function createAnimator(callback: (animator: AtlasAnimator) => void) {
  waitForAtlas("anim").then(() => {
    const img = getAtlasImage("anim");
    const animator = new AtlasAnimator(img, atlasMeta, FW, FH, animations);
    callback(animator);
  });
}
