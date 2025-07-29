import { AtlasAnimator } from "../animation/AtlasAnimator";

const atlasImageData = "data:image/png;base64,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";


export const atlasMeta = {
  "player flip spin 48x48-Sheet-Sheet": { x: 240, y: 0, w: 288, h: 48 },
  "Player Idle 48x48": { x: 432, y: 96, w: 480, h: 48 },
  "player land 48x48": { x: 0, y: 96, w: 432, h: 48 },
  "player ledge climb 48x48": { x: 0, y: 0, w: 240, h: 48 },
  "player new jump 48x48": { x: 528, y: 0, w: 288, h: 48 },
  "Player Roll 48x48": { x: 0, y: 48, w: 336, h: 48 },
  "player run 48x48": { x: 336, y: 48, w: 384, h: 48 }
};

export const animations = [
  { name: "player flip spin 48x48-Sheet-Sheet", frameCount: 6, fps: 6, dx: 0, dy: 0 },
  { name: "Player Idle 48x48", frameCount: 10, fps: 6, dx: 60, dy: 0 },
  { name: "player land 48x48", frameCount: 9, fps: 6, dx: 120, dy: 0 },
  { name: "player ledge climb 48x48", frameCount: 5, fps: 6, dx: 180, dy: 0 },
  { name: "player new jump 48x48", frameCount: 6, fps: 6, dx: 0, dy: 60 },
  { name: "Player Roll 48x48", frameCount: 7, fps: 6, dx: 60, dy: 60 },
  { name: "player run 48x48", frameCount: 8, fps: 6, dx: 120, dy: 60 }
];

export function createAnimator(callback: (animator: AtlasAnimator) => void) {
  const img = new Image();
  img.src = atlasImageData;
  img.onload = () => {
    const animator = new AtlasAnimator(img, atlasMeta, 48, 48, animations);
    callback(animator);
  };
}
