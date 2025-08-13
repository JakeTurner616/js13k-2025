import { AtlasAnimator, type AtlasMeta, type AnimationConfig } from "../animation/AtlasAnimator";
import { getAtlasImage, waitForAtlas } from "../engine/renderer/SharedAtlas";

// Slim TS object version of your FTP data (only fields actually used)
import ftp from "../assets/packed/animations/texture"; // now a .ts file, not .json

/** Convert slim FTP TS data → internal meta */
function buildMetaFromFTP(json: any): AtlasMeta {
  const out: AtlasMeta = {};
  const frames = json?.frames || {};
  for (const key in frames) {
    const f = frames[key];
    const fr = f.frame, sss = f.sss, src = f.src;
    out[key] = {
      x: fr.x | 0, y: fr.y | 0, w: fr.w | 0, h: fr.h | 0,
      srcW: src.w | 0, srcH: src.h | 0,
      offX: sss.x | 0, offY: sss.y | 0
    };
  }
  return out;
}

const ftpMeta = buildMetaFromFTP(ftp);

// Map friendly names → exact FTP keys from your new JSON
const nameMap: Record<string, string> = {
  death: "18_Alternative_Colour_Cat_Death-Sheet",
  run:   "2_Alternative_Colour_Cat_Run-Sheet",
  idle:  "1_Alternative_Colour_Cat_Idle-Sheet",
  fall:  "4_Alternative_Colour_Cat_Fall-Sheet",
  jump:  "3_Alternative_Colour_Cat_Jump-Sheet",
};

// Re-key meta to friendly names
const atlasMeta: AtlasMeta = {};
for (const k in nameMap) {
  const srcKey = nameMap[k];
  const m = ftpMeta[srcKey];
  if (m) atlasMeta[k] = m;
}

// Derive frameCount from sourceSize.w / 32
const FW = 32, FH = 32;
const mkAnim = (name: string, fps: number, dx: number, dy: number): AnimationConfig | null => {
  const m = atlasMeta[name];
  if (!m) return null;
  const frames = Math.max(1, (m.srcW / FW) | 0);
  return { name, frameCount: frames, fps, dx, dy };
};

// Animation layout (adjust dx/dy for your game’s placement)
const animations = [
  mkAnim("idle",  8,   0,   0),   // srcW=256 → 8 frames
  mkAnim("run",  12,  48,   0),   // srcW=320 → 10 frames
  mkAnim("jump", 10,  96,   0),   // srcW=128 → 4 frames
  mkAnim("fall", 10, 144,   0),   // srcW=128 → 4 frames
  mkAnim("death", 8, 192,   0),   // srcW=288 → 9 frames
].filter(Boolean) as AnimationConfig[];

export function createAnimator(callback: (animator: AtlasAnimator) => void) {
  waitForAtlas("anim").then(() => {
    const img = getAtlasImage("anim");
    const animator = new AtlasAnimator(img, atlasMeta, FW, FH, animations);
    callback(animator);
  });
}
