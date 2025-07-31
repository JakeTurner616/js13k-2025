import { AtlasAnimator } from "../animation/AtlasAnimator";
import { getAtlasImage, waitForAtlas } from "../engine/sharedAtlasImage";


export const atlasMeta = {
  flip: { x: 560, y: 64, w: 288, h: 48 },
  idle: { x: 432, y: 160, w: 480, h: 48 },
  land: { x: 0, y: 160, w: 432, h: 48 },
  climb: { x: 320, y: 64, w: 240, h: 48 },
  jump: { x: 0, y: 112, w: 288, h: 48 },
  roll: { x: 288, y: 112, w: 336, h: 48 },
  run: { x: 624, y: 112, w: 384, h: 48 }
};

export const animations = [
  { name: "flip", frameCount: 6, fps: 6, dx: 0, dy: 0 },
  { name: "idle", frameCount: 10, fps: 6, dx: 60, dy: 0 },
  { name: "land", frameCount: 9, fps: 6, dx: 120, dy: 0 },
  { name: "climb", frameCount: 5, fps: 6, dx: 180, dy: 0 },
  { name: "jump", frameCount: 6, fps: 6, dx: 0, dy: 60 },
  { name: "roll", frameCount: 7, fps: 6, dx: 60, dy: 60 },
  { name: "run", frameCount: 8, fps: 6, dx: 120, dy: 60 }
];

export function createAnimator(callback: (animator: AtlasAnimator) => void) {
  waitForAtlas().then(() => {
    const img = getAtlasImage();
    const animator = new AtlasAnimator(img, atlasMeta, 48, 48, animations);
    callback(animator);
  });
}
