import { AtlasAnimator, type AtlasMeta, type AnimationConfig } from "../animation/AtlasAnimator";
import { getAtlasImage, waitForAtlas } from "../engine/renderer/SharedAtlas";

// Accept either slim TS (sss/src) or FTP JSON (spriteSourceSize/sourceSize)
import ftp from "../assets/packed/animations/texture"; // you can also use ".ts" explicitly

/** Convert FTP data (TS or JSON) → internal meta */
function buildMetaFromFTP(json: any): AtlasMeta {
  const out: AtlasMeta = {};
  const frames = json?.frames || {};

  for (const key in frames) {
    const f = frames[key];

    // Core rect
    const fr = f?.frame;
    if (!fr) {
      console.warn(`[atlas] skipping frame without 'frame' rect: "${key}"`, f);
      continue;
    }

    // Normalize offsets + source size from either shape
    const sss = f?.sss ?? f?.spriteSourceSize ?? { x: 0, y: 0, w: fr.w, h: fr.h };
    const src = f?.src ?? f?.sourceSize ?? { w: fr.w, h: fr.h };

    out[key] = {
      x: fr.x | 0,
      y: fr.y | 0,
      w: fr.w | 0,
      h: fr.h | 0,
      srcW: (src.w | 0) || (fr.w | 0),
      srcH: (src.h | 0) || (fr.h | 0),
      offX: sss.x | 0,
      offY: sss.y | 0,
    };
  }
  return out;
}

const ftpMeta = buildMetaFromFTP(ftp);

// Map friendly names → atlas keys (matches your current atlas)
const nameMap = {
  death: "18_Alternative_Colour_Cat_Death-Sheet",
  idle:  "1_Alternative_Colour_Cat_Idle-Sheet",
  ledge: "8_Alternative_Colour_Cat_Ledge_Grab_Idle-Sheet",
  dash:  "6_Alternative_Colour_Cat_Dash-Sheet",
  jump:  "3_Alternative_Colour_Cat_Jump-Sheet",
  fall:  "4_Alternative_Colour_Cat_Fall-Sheet",
} as const;

// Re-key meta
const atlasMeta: AtlasMeta = {};
(Object.keys(nameMap) as Array<keyof typeof nameMap>).forEach((k) => {
  const m = ftpMeta[nameMap[k]];
  if (!m) console.warn(`[atlas] missing frame for "${k}" → "${nameMap[k]}"`);
  else atlasMeta[k as string] = m;
});

// Slice frames from 32x32 source strips
const FW = 32, FH = 32;
const mkAnim = (name: keyof typeof nameMap, fps: number, dx = 0, dy = 0): AnimationConfig | null => {
  const m = atlasMeta[name as string];
  if (!m) return null;
  const frames = Math.max(1, (m.srcW / FW) | 0);
  return { name: name as string, frameCount: frames, fps, dx, dy };
};

const animations = [
  mkAnim("idle",  8),
  mkAnim("jump", 10),
  mkAnim("fall", 10),
  mkAnim("dash", 12),
  mkAnim("ledge", 6),
  mkAnim("death", 8),
].filter(Boolean) as AnimationConfig[];

export function createAnimator(callback: (animator: AtlasAnimator) => void) {
  waitForAtlas("anim").then(() => {
    const img = getAtlasImage("anim");
    const animator = new AtlasAnimator(img, atlasMeta, FW, FH, animations);
    callback(animator);
  });
}
